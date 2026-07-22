/**
 * Drift statistics (gap #3, pure half).
 *
 * Two failure modes are watched:
 *
 *  - DATA / FEATURE DRIFT: the live feature distribution moves away from the one
 *    the model was trained on (a new scoring regime, a provider changing units,
 *    a league behaving differently). Measured with PSI and the KS statistic.
 *  - CALIBRATION DRIFT: predicted probabilities stop matching observed rates.
 *    Measured with rolling ECE (from calibration.ts) compared to a baseline.
 *
 * All functions here are pure and unit-tested against known values, because a
 * monitor that is itself wrong is worse than no monitor — it manufactures false
 * confidence or false alarms.
 */

const EPSILON = 1e-6;

export type DriftSeverity = 'ok' | 'warn' | 'critical';

export interface DriftThresholds {
  warn: number;
  critical: number;
}

/** Industry-standard PSI bands: <0.1 stable, 0.1–0.25 moderate, >0.25 significant. */
export const PSI_THRESHOLDS: DriftThresholds = { warn: 0.1, critical: 0.25 };

export function severityFor(statistic: number, thresholds: DriftThresholds): DriftSeverity {
  if (statistic >= thresholds.critical) return 'critical';
  if (statistic >= thresholds.warn) return 'warn';
  return 'ok';
}

/**
 * Bin edges from the baseline's quantiles. Quantile binning (rather than equal
 * width) keeps roughly equal expected mass per bin, so PSI is not dominated by
 * one crowded bucket. Returns `bins-1` interior edges; +/-Infinity are implied.
 */
export function quantileEdges(baseline: number[], bins: number): number[] {
  const sorted = [...baseline].filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const edges: number[] = [];
  for (let i = 1; i < bins; i += 1) {
    const q = i / bins;
    const pos = q * (sorted.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    const value = sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
    edges.push(value);
  }
  return edges;
}

function binShares(values: number[], edges: number[]): number[] {
  const counts = new Array(edges.length + 1).fill(0);
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    let bin = edges.length; // last bin by default
    for (let i = 0; i < edges.length; i += 1) {
      if (v <= edges[i]!) {
        bin = i;
        break;
      }
    }
    counts[bin] += 1;
  }
  const total = values.filter(Number.isFinite).length || 1;
  return counts.map((c) => c / total);
}

export interface PsiResult {
  psi: number;
  perBin: Array<{ bin: number; expected: number; actual: number; contribution: number }>;
}

/**
 * Population Stability Index between a baseline and a current sample.
 *
 * PSI = Σ (actual% − expected%) · ln(actual% / expected%), over baseline-quantile
 * bins. Empty bins are floored to EPSILON so a bin that emptied out contributes a
 * large-but-finite term rather than NaN/Infinity — an emptied bin is exactly the
 * drift we want flagged, not silently dropped.
 */
export function psi(baseline: number[], current: number[], bins = 10): PsiResult {
  const edges = quantileEdges(baseline, bins);
  const expected = binShares(baseline, edges);
  const actual = binShares(current, edges);

  let total = 0;
  const perBin = expected.map((exp, i) => {
    const e = Math.max(exp, EPSILON);
    const a = Math.max(actual[i]!, EPSILON);
    const contribution = (a - e) * Math.log(a / e);
    total += contribution;
    return { bin: i, expected: exp, actual: actual[i]!, contribution };
  });

  return { psi: total, perBin };
}

/**
 * Two-sample Kolmogorov–Smirnov statistic: the maximum vertical gap between the
 * two empirical CDFs. Distribution-shape sensitive and scale-free, a good
 * complement to PSI's binned view.
 */
export function ksStatistic(baseline: number[], current: number[]): number {
  const a = [...baseline].filter(Number.isFinite).sort((x, y) => x - y);
  const b = [...current].filter(Number.isFinite).sort((x, y) => x - y);
  if (a.length === 0 || b.length === 0) return 0;

  let i = 0;
  let j = 0;
  let maxGap = 0;
  while (i < a.length && j < b.length) {
    const x = Math.min(a[i]!, b[j]!);
    while (i < a.length && a[i]! <= x) i += 1;
    while (j < b.length && b[j]! <= x) j += 1;
    const gap = Math.abs(i / a.length - j / b.length);
    if (gap > maxGap) maxGap = gap;
  }
  return maxGap;
}

/**
 * KS critical value at ~95% confidence: 1.36 · sqrt((n+m)/(n·m)). A KS statistic
 * above this rejects "same distribution". Provided so the caller can set a
 * sample-aware threshold instead of a fixed magic number.
 */
export function ksCriticalValue(n: number, m: number, alphaCoefficient = 1.36): number {
  if (n === 0 || m === 0) return Infinity;
  return alphaCoefficient * Math.sqrt((n + m) / (n * m));
}
