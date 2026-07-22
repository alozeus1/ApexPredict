import { edgeVsFair, expectedValue } from './market';

/**
 * Publishing policy and risk controls (Phase 10).
 *
 * Probability generation and publishing are deliberately separate concerns. The
 * model's job is to state what it believes; this layer decides whether that
 * belief is well-founded enough to put in front of a paying subscriber.
 *
 * "NO BET" is a first-class, valuable output. A service that publishes a
 * selection on every fixture is not a prediction service, it is a content
 * treadmill — and it will publish its worst picks with the same confidence as
 * its best.
 */

export type PublishDecision = 'PASS' | 'WATCH' | 'NO_BET' | 'SUPPRESSED';

export interface PolicyInput {
  fixtureId: string;
  market: string;
  outcome: string;
  /** Post-calibration model probability. */
  calibratedProbability: number;
  /** De-vigged consensus market probability. Undefined when no complete book priced it. */
  fairMarketProbability?: number;
  /** Best available decimal price. Undefined when the market is unpriced. */
  bestPrice?: number;
  /** 0–1. Share of required inputs actually present. */
  dataCompleteness: number;
  /** Age of the oldest input feeding this prediction. */
  dataAgeMinutes: number;
  /** 0–1 agreement between contributing models. */
  modelAgreement: number;
  /** Training/backtest sample supporting this competition + market. */
  sampleCoverage: number;
  /** Measured ECE for this competition/market, if known. */
  calibrationError?: number;
  minutesToKickoff: number;
  /** True when lineups are required for this market and are confirmed. */
  lineupsConfirmed?: boolean;
  /** True when entity mapping for this fixture is verified. */
  mappingVerified: boolean;
  /** True when an authoritative provider is currently degraded. */
  providerDegraded: boolean;
}

export interface PolicyThresholds {
  minDataCompleteness: number;
  maxDataAgeMinutes: number;
  minModelAgreement: number;
  minSampleCoverage: number;
  minEdge: number;
  minExpectedValue: number;
  minPrice: number;
  maxPrice: number;
  maxCalibrationError: number;
  minMinutesToKickoff: number;
  requireLineupsWithinMinutes: number;
}

export const DEFAULT_THRESHOLDS: PolicyThresholds = {
  minDataCompleteness: 0.7,
  maxDataAgeMinutes: 24 * 60,
  minModelAgreement: 0.6,
  minSampleCoverage: 200,
  minEdge: 0.03,
  minExpectedValue: 0.02,
  minPrice: 1.3,
  maxPrice: 10,
  maxCalibrationError: 0.08,
  minMinutesToKickoff: 5,
  requireLineupsWithinMinutes: 60,
};

export interface PolicyResult {
  decision: PublishDecision;
  /** Every failed gate, not just the first — so diagnostics are actionable. */
  reasons: string[];
  edge: number | null;
  expectedValue: number | null;
  confidence: number;
}

/**
 * Applies publishing gates.
 *
 * Ordering matters. SUPPRESSED (we cannot trust the inputs) is distinct from
 * NO_BET (we trust the inputs and there is no edge). Collapsing them would hide
 * data outages behind what looks like ordinary model caution.
 */
export function evaluatePolicy(input: PolicyInput, thresholds: PolicyThresholds = DEFAULT_THRESHOLDS): PolicyResult {
  const suppressReasons: string[] = [];

  if (!input.mappingVerified) suppressReasons.push('fixture entity mapping is unverified');
  if (input.providerDegraded) suppressReasons.push('an authoritative provider is degraded');
  if (input.dataCompleteness < thresholds.minDataCompleteness) {
    suppressReasons.push(
      `data completeness ${(input.dataCompleteness * 100).toFixed(0)}% below ${(thresholds.minDataCompleteness * 100).toFixed(0)}%`,
    );
  }
  if (input.dataAgeMinutes > thresholds.maxDataAgeMinutes) {
    suppressReasons.push(`inputs are ${Math.round(input.dataAgeMinutes)}m old, limit ${thresholds.maxDataAgeMinutes}m`);
  }
  if (input.sampleCoverage < thresholds.minSampleCoverage) {
    suppressReasons.push(`sample coverage ${input.sampleCoverage} below ${thresholds.minSampleCoverage}`);
  }
  if (input.calibrationError !== undefined && input.calibrationError > thresholds.maxCalibrationError) {
    suppressReasons.push(
      `calibration error ${input.calibrationError.toFixed(3)} exceeds ${thresholds.maxCalibrationError}`,
    );
  }
  if (
    input.minutesToKickoff <= thresholds.requireLineupsWithinMinutes &&
    input.lineupsConfirmed === false
  ) {
    suppressReasons.push('lineups unconfirmed inside the confirmation window');
  }
  if (input.minutesToKickoff < thresholds.minMinutesToKickoff) {
    suppressReasons.push('too close to kickoff to act on');
  }

  const confidence = computeConfidence(input);

  if (suppressReasons.length > 0) {
    return { decision: 'SUPPRESSED', reasons: suppressReasons, edge: null, expectedValue: null, confidence };
  }

  // Inputs are trustworthy. Now: is there an edge?
  if (input.fairMarketProbability === undefined || input.bestPrice === undefined) {
    return {
      decision: 'NO_BET',
      reasons: ['no complete market price available, so edge cannot be established'],
      edge: null,
      expectedValue: null,
      confidence,
    };
  }

  const edge = edgeVsFair(input.calibratedProbability, input.fairMarketProbability);
  const ev = expectedValue(input.calibratedProbability, input.bestPrice);
  const noBetReasons: string[] = [];

  if (edge < thresholds.minEdge) {
    noBetReasons.push(`edge ${(edge * 100).toFixed(1)}pts below ${(thresholds.minEdge * 100).toFixed(1)}pts`);
  }
  if (ev < thresholds.minExpectedValue) {
    noBetReasons.push(`expected value ${(ev * 100).toFixed(1)}% below ${(thresholds.minExpectedValue * 100).toFixed(1)}%`);
  }
  if (input.bestPrice < thresholds.minPrice || input.bestPrice > thresholds.maxPrice) {
    noBetReasons.push(`price ${input.bestPrice} outside [${thresholds.minPrice}, ${thresholds.maxPrice}]`);
  }

  if (noBetReasons.length > 0) {
    return { decision: 'NO_BET', reasons: noBetReasons, edge, expectedValue: ev, confidence };
  }

  // Edge exists, but the models disagree — surface it rather than publishing it
  // as a confident selection.
  if (input.modelAgreement < thresholds.minModelAgreement) {
    return {
      decision: 'WATCH',
      reasons: [
        `models agree only ${(input.modelAgreement * 100).toFixed(0)}%, below ${(thresholds.minModelAgreement * 100).toFixed(0)}%`,
      ],
      edge,
      expectedValue: ev,
      confidence,
    };
  }

  return { decision: 'PASS', reasons: [], edge, expectedValue: ev, confidence };
}

/**
 * Confidence in [0,1].
 *
 * Deliberately a function of evidence quality — completeness, agreement, sample
 * support and freshness — NOT of how extreme the probability is. A 90%
 * probability built on stale, partial data is not a confident prediction.
 */
export function computeConfidence(input: PolicyInput): number {
  const completeness = Math.min(1, Math.max(0, input.dataCompleteness));
  const agreement = Math.min(1, Math.max(0, input.modelAgreement));
  const sample = Math.min(1, input.sampleCoverage / 1000);
  const freshness = Math.max(0, 1 - input.dataAgeMinutes / (48 * 60));

  const score = completeness * 0.3 + agreement * 0.3 + sample * 0.2 + freshness * 0.2;
  return Math.min(0.95, Math.max(0.05, score));
}

/** Only PASS is publishable. WATCH is internal/diagnostic. */
export function isPublishable(result: PolicyResult): boolean {
  return result.decision === 'PASS';
}
