import type { PrismaClient, Prisma } from '@apexpredix/db';

/**
 * Model lifecycle / registry (gap #1).
 *
 * Two concerns live here, deliberately separated so the rules are testable
 * without a database:
 *
 *  1. A PURE state machine (`ALLOWED_TRANSITIONS`, `canTransition`,
 *     `evaluatePromotionGate`) — no I/O, unit-tested in isolation.
 *  2. DB-touching operations (`registerModel`, `promoteToProduction`,
 *     `rollbackProduction`) that run the transitions inside transactions and
 *     enforce the invariants the schema cannot.
 *
 * The invariant that matters: AT MOST ONE `PRODUCTION` version per
 * (family, sport). A model that is live is the one thing users are exposed to,
 * so "which model is live" must be unambiguous and changing it must be atomic.
 */

// Prisma generates `ModelStage` as a string enum whose values equal their names
// ('DRAFT', 'PRODUCTION', …). We type against that but use string literals so
// this module's pure half needs no Prisma runtime.
export type ModelStage =
  | 'DRAFT'
  | 'TRAINING'
  | 'SHADOW'
  | 'APPROVED'
  | 'PRODUCTION'
  | 'RETIRED'
  | 'FAILED';

/**
 * Legal stage transitions. Anything not listed is rejected.
 *
 * Notes on the less-obvious edges:
 *  - `RETIRED → PRODUCTION` exists ONLY to support rollback (re-activating a
 *    previously-good version). It is reached through `rollbackProduction`, never
 *    by an ad-hoc stage edit.
 *  - `FAILED` is terminal. A failed train/gate is kept for audit; retrying means
 *    registering a NEW version, not resurrecting a failed one.
 *  - A model may skip `SHADOW` (`TRAINING → APPROVED`) only when it was approved
 *    on an out-of-sample backtest; the promotion gate still applies.
 */
export const ALLOWED_TRANSITIONS: Record<ModelStage, readonly ModelStage[]> = {
  DRAFT: ['TRAINING', 'FAILED'],
  TRAINING: ['SHADOW', 'APPROVED', 'FAILED'],
  SHADOW: ['APPROVED', 'RETIRED', 'FAILED'],
  APPROVED: ['PRODUCTION', 'RETIRED'],
  PRODUCTION: ['RETIRED'],
  RETIRED: ['PRODUCTION'],
  FAILED: [],
};

export function canTransition(from: ModelStage, to: ModelStage): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: ModelStage,
    readonly to: ModelStage,
  ) {
    super(`Illegal model transition ${from} → ${to}. Allowed from ${from}: ${ALLOWED_TRANSITIONS[from].join(', ') || '(none — terminal)'}`);
    this.name = 'InvalidTransitionError';
  }
}

export function assertTransition(from: ModelStage, to: ModelStage): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

// ── Promotion gate (pure) ─────────────────────────────────────────────────────

export interface ModelQuality {
  /** Lower is better. */
  brierScore: number;
  /** Lower is better. */
  logLoss: number;
  /** Expected calibration error. Lower is better. */
  calibrationError: number;
  /** Settled predictions supporting these numbers. */
  sampleSize: number;
  roi?: number;
}

export interface PromotionThresholds {
  minSampleSize: number;
  maxCalibrationError: number;
  /**
   * Non-inferiority tolerance vs. the incumbent. A candidate may be at most this
   * fraction worse on log loss / Brier and still qualify — small regressions are
   * noise, but the gate refuses anything beyond the band. Set to 0 to require
   * strict improvement.
   */
  regressionTolerance: number;
  /** Absolute ceilings used when there is no incumbent to compare against. */
  maxLogLossAbsolute: number;
  maxBrierAbsolute: number;
}

export const DEFAULT_PROMOTION_THRESHOLDS: PromotionThresholds = {
  minSampleSize: 200,
  maxCalibrationError: 0.08,
  regressionTolerance: 0.02,
  maxLogLossAbsolute: 1.05,
  maxBrierAbsolute: 0.27,
};

export type PromotionRecommendation = 'PROMOTE' | 'HOLD' | 'REJECT' | 'INSUFFICIENT_DATA';

export interface PromotionGateResult {
  recommendation: PromotionRecommendation;
  /** Every gate that passed or failed, most-important first — an auditable decision. */
  reasons: string[];
  passes: boolean;
}

/**
 * Decides whether a candidate may be promoted.
 *
 * Ordering of outcomes is deliberate. INSUFFICIENT_DATA (we cannot judge) is
 * distinct from REJECT (we judged and it is worse) — collapsing them would let a
 * thin, lucky sample read as a rejection, or a real regression read as "just
 * needs more data".
 */
export function evaluatePromotionGate(
  candidate: ModelQuality,
  champion: ModelQuality | null,
  thresholds: PromotionThresholds = DEFAULT_PROMOTION_THRESHOLDS,
): PromotionGateResult {
  const reasons: string[] = [];

  if (candidate.sampleSize < thresholds.minSampleSize) {
    return {
      recommendation: 'INSUFFICIENT_DATA',
      passes: false,
      reasons: [`sample ${candidate.sampleSize} < required ${thresholds.minSampleSize}`],
    };
  }

  let rejects = false;

  if (candidate.calibrationError > thresholds.maxCalibrationError) {
    reasons.push(`calibration error ${candidate.calibrationError.toFixed(3)} > ${thresholds.maxCalibrationError}`);
    rejects = true;
  } else {
    reasons.push(`calibration error ${candidate.calibrationError.toFixed(3)} within ${thresholds.maxCalibrationError}`);
  }

  if (champion) {
    const logLossCeiling = champion.logLoss * (1 + thresholds.regressionTolerance);
    const brierCeiling = champion.brierScore * (1 + thresholds.regressionTolerance);

    if (candidate.logLoss > logLossCeiling) {
      reasons.push(`log loss ${candidate.logLoss.toFixed(4)} worse than champion ${champion.logLoss.toFixed(4)} beyond tolerance`);
      rejects = true;
    } else {
      reasons.push(`log loss ${candidate.logLoss.toFixed(4)} vs champion ${champion.logLoss.toFixed(4)} (ceiling ${logLossCeiling.toFixed(4)})`);
    }

    if (candidate.brierScore > brierCeiling) {
      reasons.push(`Brier ${candidate.brierScore.toFixed(4)} worse than champion ${champion.brierScore.toFixed(4)} beyond tolerance`);
      rejects = true;
    }
  } else {
    if (candidate.logLoss > thresholds.maxLogLossAbsolute) {
      reasons.push(`log loss ${candidate.logLoss.toFixed(4)} > absolute ceiling ${thresholds.maxLogLossAbsolute}`);
      rejects = true;
    }
    if (candidate.brierScore > thresholds.maxBrierAbsolute) {
      reasons.push(`Brier ${candidate.brierScore.toFixed(4)} > absolute ceiling ${thresholds.maxBrierAbsolute}`);
      rejects = true;
    }
    reasons.push('no incumbent — judged on absolute ceilings');
  }

  if (rejects) return { recommendation: 'REJECT', passes: false, reasons };

  // Strictly better on the headline metric earns PROMOTE; merely non-inferior
  // earns HOLD (eligible, but a human confirms — we do not auto-swap a live
  // model for a statistical tie).
  const strictlyBetter = champion ? candidate.logLoss < champion.logLoss && candidate.brierScore <= champion.brierScore : true;
  return {
    recommendation: strictlyBetter ? 'PROMOTE' : 'HOLD',
    passes: true,
    reasons: [...reasons, strictlyBetter ? 'candidate strictly better on log loss' : 'candidate non-inferior but not strictly better'],
  };
}

// ── DB operations ─────────────────────────────────────────────────────────────

export interface RegisterModelInput {
  name: string;
  family: string;
  sport?: string;
  gitSha?: string;
  featureSetName?: string;
  featureSetVersion?: number;
  params?: Prisma.InputJsonValue;
  actor: string;
}

/** Registers a new model version in DRAFT and records the genesis transition. */
export async function registerModel(prisma: PrismaClient, input: RegisterModelInput) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.modelVersion.create({
      data: {
        name: input.name,
        family: input.family,
        sport: (input.sport as never) ?? undefined,
        gitSha: input.gitSha ?? null,
        featureSetName: input.featureSetName ?? null,
        featureSetVersion: input.featureSetVersion ?? null,
        params: input.params ?? {},
        stage: 'DRAFT',
      },
    });
    await tx.modelStageTransition.create({
      data: { modelVersionId: version.id, fromStage: null, toStage: 'DRAFT', actor: input.actor, reason: 'registered' },
    });
    return version;
  });
}

/** The single live model for a family+sport, or null. */
export async function getProductionModel(prisma: PrismaClient, family: string, sport = 'FOOTBALL') {
  return prisma.modelVersion.findFirst({
    where: { family, sport: sport as never, stage: 'PRODUCTION' },
    orderBy: { promotedAt: 'desc' },
  });
}

/**
 * Moves a version to a new stage, recording the transition. Rejects illegal
 * transitions. Promotion to PRODUCTION must go through `promoteToProduction`
 * (which enforces the single-live invariant), not this generic mover.
 */
export async function transitionStage(
  prisma: PrismaClient,
  versionId: string,
  toStage: Exclude<ModelStage, 'PRODUCTION'>,
  actor: string,
  reason?: string,
  gate: Prisma.InputJsonValue = {},
) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.modelVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new Error(`model version ${versionId} not found`);
    assertTransition(version.stage as ModelStage, toStage);

    const data: Prisma.ModelVersionUpdateInput = { stage: toStage };
    if (toStage === 'RETIRED') data.retiredAt = new Date();
    if (toStage === 'APPROVED') {
      data.approvedAt = new Date();
      data.approvedBy = actor;
    }

    const updated = await tx.modelVersion.update({ where: { id: versionId }, data });
    await tx.modelStageTransition.create({
      data: { modelVersionId: versionId, fromStage: version.stage, toStage, actor, reason: reason ?? null, gate },
    });
    return updated;
  });
}

/**
 * Promotes a version to PRODUCTION atomically: retires the current incumbent
 * (if any) and records the supersede link so rollback is one step. Runs in a
 * transaction so there is never a window with zero or two live models.
 */
export async function promoteToProduction(
  prisma: PrismaClient,
  versionId: string,
  actor: string,
  gate: Prisma.InputJsonValue = {},
) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.modelVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new Error(`model version ${versionId} not found`);
    assertTransition(version.stage as ModelStage, 'PRODUCTION');

    const incumbent = await tx.modelVersion.findFirst({
      where: { family: version.family, sport: version.sport, stage: 'PRODUCTION' },
    });

    if (incumbent && incumbent.id !== versionId) {
      await tx.modelVersion.update({ where: { id: incumbent.id }, data: { stage: 'RETIRED', retiredAt: new Date() } });
      await tx.modelStageTransition.create({
        data: {
          modelVersionId: incumbent.id,
          fromStage: 'PRODUCTION',
          toStage: 'RETIRED',
          actor,
          reason: `superseded by ${version.name}`,
        },
      });
    }

    const promoted = await tx.modelVersion.update({
      where: { id: versionId },
      data: {
        stage: 'PRODUCTION',
        promotedAt: new Date(),
        supersedesId: incumbent && incumbent.id !== versionId ? incumbent.id : version.supersedesId,
      },
    });
    await tx.modelStageTransition.create({
      data: { modelVersionId: versionId, fromStage: version.stage, toStage: 'PRODUCTION', actor, gate },
    });

    return { promoted, retired: incumbent && incumbent.id !== versionId ? incumbent : null };
  });
}

/**
 * Rolls production back to the version the current live model superseded. This
 * is the "something is wrong, revert now" path — one call, fully audited.
 */
export async function rollbackProduction(prisma: PrismaClient, family: string, sport = 'FOOTBALL', actor = 'system') {
  const current = await getProductionModel(prisma, family, sport);
  if (!current) throw new Error(`no production model for ${family}/${sport} to roll back`);
  if (!current.supersedesId) throw new Error(`production model ${current.name} has no prior version to roll back to`);
  return promoteToProduction(prisma, current.supersedesId, actor, { rollbackOf: current.id, rollbackAt: new Date().toISOString() });
}

/**
 * Returns the live PRODUCTION model for a family+sport, bootstrapping a baseline
 * one on first run if none exists.
 *
 * The prediction pipeline must be able to stamp every snapshot with the model
 * that produced it from day one — before anyone has manually registered a model.
 * On a cold registry this fast-tracks a baseline version DRAFT→TRAINING→APPROVED
 * →PRODUCTION with a full transition audit, so attribution works immediately and
 * the first real challenger has an incumbent to be compared against. Idempotent:
 * once a production model exists it is simply returned.
 */
export async function ensureProductionModel(
  prisma: PrismaClient,
  input: { family: string; sport?: string; name: string; featureSetName?: string; featureSetVersion?: number; gitSha?: string },
) {
  const sport = input.sport ?? 'FOOTBALL';
  const existing = await getProductionModel(prisma, input.family, sport);
  if (existing) return existing;

  // Name must be unique; a prior half-finished bootstrap may already hold it.
  const versionName = `${input.name}@baseline-1`;
  const priorByName = await prisma.modelVersion.findUnique({ where: { name: versionName } });
  const version =
    priorByName ??
    (await registerModel(prisma, {
      name: versionName,
      family: input.family,
      sport,
      ...(input.gitSha ? { gitSha: input.gitSha } : {}),
      ...(input.featureSetName ? { featureSetName: input.featureSetName } : {}),
      ...(input.featureSetVersion !== undefined ? { featureSetVersion: input.featureSetVersion } : {}),
      actor: 'system:bootstrap',
    }));

  // Walk the lifecycle only from whatever stage it is actually in, so a partial
  // prior bootstrap resumes rather than throwing on an illegal transition.
  const stage = version.stage as ModelStage;
  if (stage === 'DRAFT') {
    await transitionStage(prisma, version.id, 'TRAINING', 'system:bootstrap', 'bootstrap baseline');
    await transitionStage(prisma, version.id, 'APPROVED', 'system:bootstrap', 'bootstrap baseline');
  } else if (stage === 'TRAINING') {
    await transitionStage(prisma, version.id, 'APPROVED', 'system:bootstrap', 'bootstrap baseline');
  }

  const refreshed = await prisma.modelVersion.findUnique({ where: { id: version.id } });
  if (refreshed && (refreshed.stage as ModelStage) === 'PRODUCTION') return refreshed;

  const { promoted } = await promoteToProduction(prisma, version.id, 'system:bootstrap', { bootstrap: true });
  return promoted;
}
