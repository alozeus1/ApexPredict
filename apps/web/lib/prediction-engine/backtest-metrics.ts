import { evaluatePromotionGate, type ModelQuality, type PromotionThresholds, DEFAULT_PROMOTION_THRESHOLDS } from '@/lib/models/registry';

/**
 * Backtest risk metrics and model comparison (gap #7, pure half).
 *
 * ROI and hit-rate say whether a strategy made money on average; they hide the
 * PATH. A strategy that finishes +8% ROI but was down 55% of bankroll halfway
 * through would have bankrupted a real bettor before the recovery. Max drawdown
 * and the longest losing streak are the risk half of the promotion decision, and
 * `compareModels` turns "candidate vs champion" into an auditable, gated verdict
 * instead of "it won last week".
 */

export interface DrawdownResult {
  /** Worst peak-to-trough decline of cumulative P&L, in stake currency. */
  absolute: number;
  /** `absolute` as a fraction of the assumed starting bankroll. */
  fraction: number;
  peakIndex: number;
  troughIndex: number;
}

/**
 * Max drawdown of a CHRONOLOGICALLY-ORDERED profit sequence.
 *
 * The equity curve is the running cumulative profit. Drawdown at each point is
 * peak-so-far minus current equity. `bankrollBase` is the denominator for the
 * fraction — there is no single "right" base for a flat-stake P&L, so the caller
 * states one explicitly (the backtest uses total turnover) and it is documented
 * rather than hidden inside a magic constant.
 */
export function maxDrawdown(profits: number[], bankrollBase: number): DrawdownResult {
  let equity = 0;
  let peak = 0;
  let peakIndex = 0;
  let worst: DrawdownResult = { absolute: 0, fraction: 0, peakIndex: 0, troughIndex: 0 };

  profits.forEach((profit, index) => {
    equity += profit;
    if (equity > peak) {
      peak = equity;
      peakIndex = index;
    }
    const decline = peak - equity;
    if (decline > worst.absolute) {
      worst = {
        absolute: decline,
        fraction: bankrollBase > 0 ? decline / bankrollBase : 0,
        peakIndex,
        troughIndex: index,
      };
    }
  });

  return worst;
}

/** Longest run of consecutive losing settlements. */
export function maxLosingStreak(hits: boolean[]): number {
  let current = 0;
  let longest = 0;
  for (const hit of hits) {
    if (hit) {
      current = 0;
    } else {
      current += 1;
      if (current > longest) longest = current;
    }
  }
  return longest;
}

export interface ModelComparisonResult {
  recommendation: 'PROMOTE' | 'HOLD' | 'REJECT' | 'INSUFFICIENT_DATA';
  reasons: string[];
  roiDelta: number | null;
  brierDelta: number | null;
  logLossDelta: number | null;
  eceDelta: number | null;
}

/**
 * Candidate-vs-production verdict. The quality gate (calibration + non-inferior
 * log loss/Brier on a minimum sample) comes from the same `evaluatePromotionGate`
 * used everywhere else, so the promotion bar is defined once. ROI/metric deltas
 * are reported for the operator but do NOT by themselves authorise promotion — a
 * high-ROI, badly-calibrated candidate must still be rejected.
 */
export function compareModels(
  candidate: ModelQuality,
  champion: ModelQuality | null,
  thresholds: PromotionThresholds = DEFAULT_PROMOTION_THRESHOLDS,
): ModelComparisonResult {
  const gate = evaluatePromotionGate(candidate, champion, thresholds);
  const delta = (a: number, b: number | undefined) => (b === undefined ? null : a - b);
  return {
    recommendation: gate.recommendation,
    reasons: gate.reasons,
    roiDelta: champion?.roi !== undefined && candidate.roi !== undefined ? candidate.roi - champion.roi : null,
    brierDelta: delta(candidate.brierScore, champion?.brierScore),
    logLossDelta: delta(candidate.logLoss, champion?.logLoss),
    eceDelta: delta(candidate.calibrationError, champion?.calibrationError),
  };
}
