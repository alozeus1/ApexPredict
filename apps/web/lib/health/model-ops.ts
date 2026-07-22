import type { PrismaClient } from '@apexpredix/db';
import { getProductionModel } from '@/lib/models/registry';
import { adaptiveEnsembleWeights } from '@/lib/prediction-engine/ensemble-weights';

/**
 * Model-ops observability readout.
 *
 * "Verified in motion" at a glance: after a refresh runs, this answers the
 * questions that a green build cannot — is every prediction attributed to a
 * model, are feature vectors being written, how many fixtures got LIVE xG vs.
 * stayed shots-unavailable, have adaptive weights started moving, and is
 * anything drifting. Read-only; safe to poll.
 *
 * The counting helpers are pure and unit-tested; the assembler is thin DB I/O.
 */

export interface VectorSummary {
  total: number;
  averageCompleteness: number;
  /** Vectors whose shots-xG features are populated — i.e. xG was live for that fixture. */
  withLiveXg: number;
  xgLivePct: number;
}

export function pct(part: number, total: number): number {
  return total > 0 ? Number(((part / total) * 100).toFixed(1)) : 0;
}

/** Summarises feature-vector coverage, including how many carried live xG. */
export function summarizeVectors(rows: Array<{ completeness: number; values: Record<string, unknown> }>): VectorSummary {
  const total = rows.length;
  if (total === 0) return { total: 0, averageCompleteness: 0, withLiveXg: 0, xgLivePct: 0 };

  const completenessSum = rows.reduce((sum, row) => sum + (Number.isFinite(row.completeness) ? row.completeness : 0), 0);
  const withLiveXg = rows.filter((row) => {
    const home = row.values?.home_shots_xg;
    const away = row.values?.away_shots_xg;
    return typeof home === 'number' && typeof away === 'number';
  }).length;

  return {
    total,
    averageCompleteness: Number((completenessSum / total).toFixed(3)),
    withLiveXg,
    xgLivePct: pct(withLiveXg, total),
  };
}

export interface ModelOpsReport {
  asOf: string;
  windowHours: number;
  since: string;
  production: { name: string; family: string; stage: string; promotedAt: string | null } | null;
  predictions: { total: number; attributed: number; attributionPct: number };
  featureVectors: VectorSummary;
  weights: { adaptive: boolean; values: Record<string, number> | null };
  shadow: { settledInWindow: number };
  drift: { reportsInWindow: number; breachedInWindow: number; latestGlobalEce: number | null };
  backtest: { createdAt: string; sampleSize: number; roi: number; maxDrawdown: number; maxLosingStreak: number } | null;
}

/** Assembles the model-ops readout over a recent window (default 36h — one daily cycle plus slack). */
export async function buildModelOpsReport(
  prisma: PrismaClient,
  options: { asOf: Date; windowHours?: number; family?: string; sport?: string },
): Promise<ModelOpsReport> {
  const windowHours = options.windowHours ?? 36;
  const family = options.family ?? 'ensemble';
  const sport = options.sport ?? 'FOOTBALL';
  const since = new Date(options.asOf.getTime() - windowHours * 3_600_000);

  const [
    production,
    predictionsTotal,
    predictionsAttributed,
    vectors,
    shadowSettled,
    driftTotal,
    driftBreached,
    latestCalibration,
    latestBacktest,
    adaptive,
  ] = await Promise.all([
    getProductionModel(prisma, family, sport),
    prisma.predictionSnapshot.count({ where: { generatedAt: { gte: since } } }),
    prisma.predictionSnapshot.count({ where: { generatedAt: { gte: since }, modelVersionId: { not: null } } }),
    prisma.featureVector.findMany({ where: { computedAt: { gte: since } }, select: { completeness: true, values: true } }),
    prisma.shadowScore.count({ where: { settledAt: { gte: since } } }),
    prisma.driftReport.count({ where: { createdAt: { gte: since } } }),
    prisma.driftReport.count({ where: { createdAt: { gte: since }, breached: true } }),
    prisma.driftReport.findFirst({
      where: { kind: 'calibration', scope: 'global' },
      orderBy: { createdAt: 'desc' },
      select: { currentValue: true },
    }),
    prisma.predictionBacktestRun.findFirst({ orderBy: { createdAt: 'desc' } }),
    adaptiveEnsembleWeights(prisma, { asOf: options.asOf }).catch(() => null),
  ]);

  return {
    asOf: options.asOf.toISOString(),
    windowHours,
    since: since.toISOString(),
    production: production
      ? {
          name: production.name,
          family: production.family,
          stage: production.stage,
          promotedAt: production.promotedAt ? production.promotedAt.toISOString() : null,
        }
      : null,
    predictions: {
      total: predictionsTotal,
      attributed: predictionsAttributed,
      attributionPct: pct(predictionsAttributed, predictionsTotal),
    },
    featureVectors: summarizeVectors(vectors as Array<{ completeness: number; values: Record<string, unknown> }>),
    weights: {
      adaptive: adaptive ? !adaptive.fellBackToUniform : false,
      values: adaptive?.weights ?? null,
    },
    shadow: { settledInWindow: shadowSettled },
    drift: {
      reportsInWindow: driftTotal,
      breachedInWindow: driftBreached,
      latestGlobalEce: latestCalibration?.currentValue ?? null,
    },
    backtest: latestBacktest
      ? {
          createdAt: latestBacktest.createdAt.toISOString(),
          sampleSize: latestBacktest.sampleSize,
          roi: latestBacktest.roi,
          maxDrawdown: latestBacktest.maxDrawdown,
          maxLosingStreak: latestBacktest.maxLosingStreak,
        }
      : null,
  };
}
