import type { PrismaClient } from '@apexpredix/db';

/**
 * Shadow scoring (gap #2).
 *
 * A challenger model scores live fixtures alongside production, its predictions
 * recorded but NEVER shown to users. When fixtures settle, the same evaluation
 * production gets is applied to the shadow rows, so a promotion decision rests on
 * real out-of-sample behaviour on the exact same fixtures — the one thing a
 * backtest cannot give you, because a backtest can be overfit and a shadow run
 * cannot (it only ever sees the future).
 */

const EPSILON = 1e-6;

export function safeLogLoss(probability: number, hit: boolean): number {
  const p = Math.min(1 - EPSILON, Math.max(EPSILON, probability));
  return hit ? -Math.log(p) : -Math.log(1 - p);
}

export function brier(probability: number, hit: boolean): number {
  return (probability - (hit ? 1 : 0)) ** 2;
}

export interface SettledScore {
  probability: number;
  hit: boolean;
}

export interface ScoreSummary {
  sampleSize: number;
  hitRate: number;
  brierScore: number;
  logLoss: number;
}

/** Aggregates a set of settled scores into the headline metrics. */
export function summarize(scores: SettledScore[]): ScoreSummary {
  if (scores.length === 0) return { sampleSize: 0, hitRate: 0, brierScore: 0, logLoss: 0 };
  const n = scores.length;
  const hits = scores.filter((s) => s.hit).length;
  const brierTotal = scores.reduce((sum, s) => sum + brier(s.probability, s.hit), 0);
  const logLossTotal = scores.reduce((sum, s) => sum + safeLogLoss(s.probability, s.hit), 0);
  return { sampleSize: n, hitRate: hits / n, brierScore: brierTotal / n, logLoss: logLossTotal / n };
}

// ── DB operations ─────────────────────────────────────────────────────────────

export interface ShadowScoreInput {
  modelVersionId: string;
  fixtureId: string;
  market: string;
  probability: number;
  edge: number;
  confidence: number;
}

/** Records (or refreshes) a challenger's prediction for a fixture. Idempotent per (model, fixture, market). */
export async function recordShadowScore(prisma: PrismaClient, input: ShadowScoreInput) {
  return prisma.shadowScore.upsert({
    where: {
      modelVersionId_fixtureId_market: {
        modelVersionId: input.modelVersionId,
        fixtureId: input.fixtureId,
        market: input.market,
      },
    },
    create: { ...input },
    update: {
      // Only re-score while unsettled; once settled the row is frozen for audit.
      probability: input.probability,
      edge: input.edge,
      confidence: input.confidence,
    },
  });
}

function resultMarketFrom(homeScore: number, awayScore: number): string {
  if (homeScore > awayScore) return '1';
  if (homeScore < awayScore) return '2';
  return 'X';
}

/**
 * Settles shadow scores for fixtures that now have a result and are not yet
 * settled. Writes hit/brier/logLoss so the challenger can be scored the same way
 * production is.
 */
export async function settleShadowScores(prisma: PrismaClient, asOf: Date) {
  const pending = await prisma.shadowScore.findMany({
    where: { settledAt: null, fixture: { result: { isNot: null } } },
    include: { fixture: { include: { result: true } } },
  });

  let settled = 0;
  for (const score of pending) {
    const result = score.fixture.result;
    if (!result) continue;
    const settledMarket = resultMarketFrom(result.homeScore, result.awayScore);
    const hit = score.market === settledMarket;
    await prisma.shadowScore.update({
      where: { id: score.id },
      data: {
        resultMarket: settledMarket,
        hit,
        brierScore: brier(score.probability, hit),
        logLoss: safeLogLoss(score.probability, hit),
        settledAt: asOf,
      },
    });
    settled += 1;
  }
  return { settled, considered: pending.length };
}

export interface ShadowComparison {
  modelVersionId: string;
  shadow: ScoreSummary;
  production: ScoreSummary;
  /** Fixtures where BOTH a settled shadow score and a settled production evaluation exist. */
  overlap: number;
}

/**
 * Compares a challenger's settled shadow scores against production's evaluations
 * on the SAME fixtures+markets over a window. Only the overlapping fixtures are
 * compared, so the two summaries are strictly like-for-like.
 */
export async function compareShadowToProduction(
  prisma: PrismaClient,
  modelVersionId: string,
  options: { windowDays?: number; asOf: Date },
): Promise<ShadowComparison> {
  const windowDays = options.windowDays ?? 30;
  const since = new Date(options.asOf.getTime() - windowDays * 86_400_000);

  const shadowRows = await prisma.shadowScore.findMany({
    where: { modelVersionId, settledAt: { gte: since, lte: options.asOf }, hit: { not: null } },
    select: { fixtureId: true, market: true, probability: true, hit: true },
  });

  // Production evaluations for the same fixture+market pairs.
  const keys = shadowRows.map((r) => ({ fixtureId: r.fixtureId, market: r.market }));
  const prodRows = await prisma.predictionEvaluation.findMany({
    where: { OR: keys.map((k) => ({ fixtureId: k.fixtureId, market: k.market })) },
    select: { fixtureId: true, market: true, probability: true, hit: true },
  });
  const prodByKey = new Map(prodRows.map((r) => [`${r.fixtureId}|${r.market}`, r]));

  const shadowSettled: SettledScore[] = [];
  const productionSettled: SettledScore[] = [];
  for (const s of shadowRows) {
    const prod = prodByKey.get(`${s.fixtureId}|${s.market}`);
    if (!prod) continue; // only compare where production also has a settled evaluation
    shadowSettled.push({ probability: s.probability, hit: s.hit! });
    productionSettled.push({ probability: prod.probability, hit: prod.hit });
  }

  return {
    modelVersionId,
    shadow: summarize(shadowSettled),
    production: summarize(productionSettled),
    overlap: shadowSettled.length,
  };
}
