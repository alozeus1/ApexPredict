import { describe, expect, it } from 'vitest';
import { maxDrawdown, maxLosingStreak, compareModels } from '../backtest-metrics';

describe('max drawdown', () => {
  it('finds the worst peak-to-trough decline', () => {
    // cumulative: 10, 0, -10, 20 → peak 10, worst decline 20 at index 2
    const dd = maxDrawdown([10, -10, -10, 30], 40);
    expect(dd.absolute).toBe(20);
    expect(dd.fraction).toBe(0.5);
    expect(dd.troughIndex).toBe(2);
  });

  it('is zero for a monotonically rising curve', () => {
    expect(maxDrawdown([5, 5, 5], 100).absolute).toBe(0);
  });

  it('guards a zero bankroll base', () => {
    expect(maxDrawdown([-10], 0).fraction).toBe(0);
  });
});

describe('max losing streak', () => {
  it('counts the longest run of losses', () => {
    expect(maxLosingStreak([true, false, false, true, false])).toBe(2);
    expect(maxLosingStreak([false, false, false])).toBe(3);
    expect(maxLosingStreak([true, true])).toBe(0);
  });
});

describe('compareModels', () => {
  it('promotes a strictly better, well-calibrated candidate and reports deltas', () => {
    const r = compareModels(
      { brierScore: 0.2, logLoss: 0.55, calibrationError: 0.03, sampleSize: 500, roi: 0.06 },
      { brierScore: 0.24, logLoss: 0.62, calibrationError: 0.04, sampleSize: 500, roi: 0.02 },
    );
    expect(r.recommendation).toBe('PROMOTE');
    expect(r.roiDelta).toBeCloseTo(0.04, 9);
    expect(r.logLossDelta!).toBeLessThan(0);
  });

  it('refuses a high-ROI but miscalibrated candidate', () => {
    const r = compareModels(
      { brierScore: 0.2, logLoss: 0.55, calibrationError: 0.2, sampleSize: 500, roi: 0.5 },
      { brierScore: 0.24, logLoss: 0.62, calibrationError: 0.04, sampleSize: 500, roi: 0.02 },
    );
    expect(r.recommendation).toBe('REJECT');
  });
});
