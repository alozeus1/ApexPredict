import { describe, expect, it } from 'vitest';
import { pct, summarizeVectors } from '../model-ops';

describe('pct', () => {
  it('computes a rounded percentage and guards zero', () => {
    expect(pct(1, 4)).toBe(25);
    expect(pct(1, 3)).toBe(33.3);
    expect(pct(0, 0)).toBe(0);
  });
});

describe('summarizeVectors', () => {
  it('is empty-safe', () => {
    expect(summarizeVectors([])).toEqual({ total: 0, averageCompleteness: 0, withLiveXg: 0, xgLivePct: 0 });
  });

  it('counts live-xG vectors (both shot features numeric) and averages completeness', () => {
    const rows = [
      { completeness: 1, values: { home_shots_xg: 1.4, away_shots_xg: 0.9 } }, // live xG
      { completeness: 0.5, values: { home_shots_xg: 1.1, away_shots_xg: null } }, // away missing → not live
      { completeness: 0.8, values: {} }, // no shots → not live
    ];
    const s = summarizeVectors(rows);
    expect(s.total).toBe(3);
    expect(s.withLiveXg).toBe(1);
    expect(s.xgLivePct).toBe(33.3);
    expect(s.averageCompleteness).toBeCloseTo((1 + 0.5 + 0.8) / 3, 3);
  });

  it('does not count a non-numeric shot value as live', () => {
    const rows = [{ completeness: 1, values: { home_shots_xg: 'x', away_shots_xg: 1 } }];
    expect(summarizeVectors(rows as never).withLiveXg).toBe(0);
  });
});
