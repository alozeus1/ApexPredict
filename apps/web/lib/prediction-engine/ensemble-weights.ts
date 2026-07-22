import type { PrismaClient } from '@apexpredix/db';

/**
 * Adaptive, performance-weighted ensemble weights (gap #5).
 *
 * The ensemble previously blended Elo and Poisson at a fixed 0.5/0.5. That gives
 * a persistently worse signal the same say as a better one, forever. Here each
 * signal's weight is derived from its OWN measured out-of-sample log loss on
 * settled predictions, so a signal that has been reliably better earns more
 * influence and one whose accuracy deteriorates is turned down automatically.
 *
 * Three safeguards keep this from chasing noise:
 *   - SHRINKAGE toward equal weights, strong when the sample is small, so a lucky
 *     week cannot seize the ensemble.
 *   - A per-signal FLOOR, so no signal is ever fully silenced by short-run noise
 *     and can recover when it improves.
 *   - An equal-weight FALLBACK when no signal has enough settled data to judge.
 *
 * `computeWeights` is pure and unit-tested; the DB reader assembles its inputs.
 */

export interface SignalPerformance {
  name: string;
  /** Mean log loss of this signal's probability on the settled outcome. Lower is better. */
  logLoss: number;
  sampleSize: number;
}

export interface WeightOptions {
  /** A signal needs at least this many settled predictions to earn a measured weight. */
  minSample: number;
  /** Softmax temperature. Higher = flatter (closer to equal); lower = sharper. */
  temperature: number;
  /** Minimum normalised weight any participating signal retains. */
  floor: number;
  /** Pseudo-observations of the uniform prior — controls shrinkage strength. */
  priorStrength: number;
}

export const DEFAULT_WEIGHT_OPTIONS: WeightOptions = {
  minSample: 100,
  temperature: 0.15,
  floor: 0.1,
  priorStrength: 200,
};

function uniform(names: string[]): Record<string, number> {
  const w = 1 / names.length;
  return Object.fromEntries(names.map((n) => [n, w]));
}

function applyFloorAndNormalise(weights: Record<string, number>, floor: number): Record<string, number> {
  const names = Object.keys(weights);
  const n = names.length;
  if (n === 0) return {};

  // Guaranteeing a floor cannot be done by max()-then-normalise: dividing by the
  // post-floor total pushes a floored weight back BELOW the floor. Instead reserve
  // `floor * n` of the unit mass for the floors and distribute the remaining
  // `1 - floor * n` proportionally to the raw weights. Every result is then
  // >= floor and the set sums to exactly 1, by construction.
  if (floor * n >= 1) {
    // Floors cannot all fit under a unit sum -- the floor is ill-specified, so
    // fall back to equal weights rather than silently violate the constraint.
    const uniformWeight = 1 / n;
    return Object.fromEntries(names.map((k) => [k, uniformWeight]));
  }

  const total = Object.values(weights).reduce((s, v) => s + v, 0) || 1;
  const reserved = 1 - floor * n;
  return Object.fromEntries(names.map((k) => [k, floor + reserved * (weights[k]! / total)]));
}

/**
 * Turns measured per-signal log loss into normalised ensemble weights.
 *
 * Signals below `minSample` do not get a measured score — they ride the uniform
 * prior so a barely-observed signal cannot dominate or vanish. The result always
 * sums to 1 over the input signal names.
 */
export function computeWeights(
  performance: SignalPerformance[],
  options: WeightOptions = DEFAULT_WEIGHT_OPTIONS,
): Record<string, number> {
  const names = performance.map((p) => p.name);
  if (names.length === 0) return {};
  if (names.length === 1) return { [names[0]!]: 1 };

  const judged = performance.filter((p) => p.sampleSize >= options.minSample);
  if (judged.length === 0) return uniform(names); // nothing to judge on → equal weights

  // Softmax over negative log loss: lower loss → higher score. Only judged
  // signals get a measured score; unjudged signals get the mean measured score
  // (i.e. treated as average) so they neither win nor lose on no evidence.
  const meanLoss = judged.reduce((s, p) => s + p.logLoss, 0) / judged.length;
  const scores: Record<string, number> = {};
  for (const p of performance) {
    const loss = p.sampleSize >= options.minSample ? p.logLoss : meanLoss;
    scores[p.name] = Math.exp(-loss / options.temperature);
  }
  const scoreTotal = Object.values(scores).reduce((s, v) => s + v, 0) || 1;
  const measured = Object.fromEntries(names.map((n) => [n, scores[n]! / scoreTotal]));

  // Shrinkage toward uniform: lambda grows with total evidence.
  const totalSample = judged.reduce((s, p) => s + p.sampleSize, 0);
  const lambda = totalSample / (totalSample + options.priorStrength);
  const uni = uniform(names);
  const blended = Object.fromEntries(names.map((n) => [n, lambda * measured[n]! + (1 - lambda) * uni[n]!]));

  return applyFloorAndNormalise(blended, options.floor);
}

// ── DB reader ─────────────────────────────────────────────────────────────────

const EPSILON = 1e-6;
function safeLogLoss(probability: number, hit: boolean): number {
  const p = Math.min(1 - EPSILON, Math.max(EPSILON, probability));
  return hit ? -Math.log(p) : -Math.log(1 - p);
}

/**
 * Reads settled predictions over a window and returns adaptive ensemble weights
 * from each stored signal's own probability on the selected market.
 *
 * `PredictionSnapshot` stores each signal's probability on the picked market
 * (`elo`, `poisson`, `xg`) and the joined evaluation says whether that market
 * hit — enough to score each signal independently without having logged full
 * per-signal distributions.
 */
export async function adaptiveEnsembleWeights(
  prisma: PrismaClient,
  options: { windowDays?: number; asOf: Date; signals?: string[]; weightOptions?: WeightOptions },
): Promise<{ weights: Record<string, number>; performance: SignalPerformance[]; fellBackToUniform: boolean }> {
  const windowDays = options.windowDays ?? 90;
  const signalNames = options.signals ?? ['elo', 'poisson', 'xg'];
  const since = new Date(options.asOf.getTime() - windowDays * 86_400_000);

  const rows = await prisma.predictionSnapshot.findMany({
    where: { generatedAt: { gte: since, lte: options.asOf }, evaluation: { isNot: null } },
    select: { elo: true, poisson: true, xg: true, evaluation: { select: { hit: true } } },
  });

  const totals = new Map<string, { loss: number; n: number }>();
  for (const name of signalNames) totals.set(name, { loss: 0, n: 0 });

  for (const row of rows) {
    const hit = row.evaluation?.hit;
    if (hit === undefined || hit === null) continue;
    const probByName: Record<string, number> = { elo: row.elo, poisson: row.poisson, xg: row.xg };
    for (const name of signalNames) {
      const prob = probByName[name];
      // xg was historically stored at weight 0; a stored 0/NaN is not a real
      // probability and must not count as a confident miss.
      if (prob === undefined || !Number.isFinite(prob) || prob <= 0 || prob >= 1) continue;
      const bucket = totals.get(name)!;
      bucket.loss += safeLogLoss(prob, hit);
      bucket.n += 1;
    }
  }

  const performance: SignalPerformance[] = signalNames.map((name) => {
    const bucket = totals.get(name)!;
    return { name, logLoss: bucket.n > 0 ? bucket.loss / bucket.n : Infinity, sampleSize: bucket.n };
  });

  const weightOptions = options.weightOptions ?? DEFAULT_WEIGHT_OPTIONS;
  const judged = performance.filter((p) => p.sampleSize >= weightOptions.minSample);
  const weights = computeWeights(performance, weightOptions);

  return { weights, performance, fellBackToUniform: judged.length === 0 };
}
