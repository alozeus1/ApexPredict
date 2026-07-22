import { describe, expect, it } from 'vitest';
import { psi, ksStatistic, ksCriticalValue, severityFor, PSI_THRESHOLDS, quantileEdges } from '../drift';

const base = Array.from({ length: 1000 }, (_, i) => (i % 100) / 100);
const same = Array.from({ length: 1000 }, (_, i) => ((i * 7) % 100) / 100);
const shifted = Array.from({ length: 1000 }, (_, i) => 0.5 + (i % 100) / 100);

describe('PSI', () => {
  it('is ~0 for same-support samples', () => {
    expect(psi(base, same).psi).toBeLessThan(0.1);
  });
  it('is significant for a shifted sample', () => {
    expect(psi(base, shifted).psi).toBeGreaterThan(0.25);
  });
  it('bands map to severities', () => {
    expect(severityFor(psi(base, same).psi, PSI_THRESHOLDS)).toBe('ok');
    expect(severityFor(psi(base, shifted).psi, PSI_THRESHOLDS)).toBe('critical');
  });
  it('perBin contributions sum to the total', () => {
    const r = psi(base, shifted);
    const sum = r.perBin.reduce((s, b) => s + b.contribution, 0);
    expect(sum).toBeCloseTo(r.psi, 6);
  });
});

describe('KS', () => {
  it('is 0 for identical samples', () => {
    expect(ksStatistic([1, 2, 3], [1, 2, 3])).toBe(0);
  });
  it('is ~1 for disjoint samples', () => {
    expect(ksStatistic([0, 0, 0, 0], [1, 1, 1, 1])).toBeGreaterThan(0.99);
  });
  it('exceeds its critical value under a real shift', () => {
    expect(ksStatistic(base, shifted)).toBeGreaterThan(ksCriticalValue(1000, 1000));
  });
});

describe('quantile edges', () => {
  it('produces bins-1 monotone interior edges', () => {
    const edges = quantileEdges(base, 10);
    expect(edges).toHaveLength(9);
    for (let i = 1; i < edges.length; i += 1) expect(edges[i]!).toBeGreaterThanOrEqual(edges[i - 1]!);
  });
});
