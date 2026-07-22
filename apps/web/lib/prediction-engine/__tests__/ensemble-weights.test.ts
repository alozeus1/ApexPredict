import { describe, expect, it } from 'vitest';
import { computeWeights, DEFAULT_WEIGHT_OPTIONS } from '../ensemble-weights';

const sum = (w: Record<string, number>) => Object.values(w).reduce((s, v) => s + v, 0);

describe('adaptive ensemble weights', () => {
  it('falls back to uniform on thin data', () => {
    const w = computeWeights([
      { name: 'elo', logLoss: 0.5, sampleSize: 10 },
      { name: 'poisson', logLoss: 0.9, sampleSize: 5 },
    ]);
    expect(w.elo).toBeCloseTo(0.5, 9);
    expect(w.poisson).toBeCloseTo(0.5, 9);
  });

  it('gives a lower-log-loss signal more weight, normalised to 1', () => {
    const w = computeWeights([
      { name: 'elo', logLoss: 0.45, sampleSize: 2000 },
      { name: 'poisson', logLoss: 0.6, sampleSize: 2000 },
    ]);
    expect(sum(w)).toBeCloseTo(1, 9);
    expect(w.elo!).toBeGreaterThan(w.poisson!);
  });

  it('never silences a signal below the floor', () => {
    const w = computeWeights([
      { name: 'elo', logLoss: 0.3, sampleSize: 5000 },
      { name: 'poisson', logLoss: 1.2, sampleSize: 5000 },
    ]);
    expect(w.poisson!).toBeGreaterThanOrEqual(DEFAULT_WEIGHT_OPTIONS.floor - 1e-9);
  });

  it('separates more as evidence grows (shrinkage)', () => {
    const small = computeWeights([
      { name: 'a', logLoss: 0.45, sampleSize: 150 },
      { name: 'b', logLoss: 0.6, sampleSize: 150 },
    ]);
    const big = computeWeights([
      { name: 'a', logLoss: 0.45, sampleSize: 5000 },
      { name: 'b', logLoss: 0.6, sampleSize: 5000 },
    ]);
    expect(big.a! - big.b!).toBeGreaterThan(small.a! - small.b!);
  });

  it('lets an unjudged third signal ride the prior', () => {
    const w = computeWeights([
      { name: 'elo', logLoss: 0.45, sampleSize: 2000 },
      { name: 'poisson', logLoss: 0.55, sampleSize: 2000 },
      { name: 'xg', logLoss: 0.5, sampleSize: 20 },
    ]);
    expect(sum(w)).toBeCloseTo(1, 9);
    expect(w.xg!).toBeGreaterThanOrEqual(DEFAULT_WEIGHT_OPTIONS.floor - 1e-9);
  });
});
