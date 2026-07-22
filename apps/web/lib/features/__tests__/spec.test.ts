import { describe, expect, it } from 'vitest';
import {
  buildVector,
  hashSpecs,
  assertParity,
  FeatureParityError,
  MATCH_1X2_FEATURE_SET,
  type FeatureSpec,
} from '../spec';

const specs: FeatureSpec[] = [
  { name: 'a', dtype: 'number', source: 's', fillPolicy: 'zero' },
  { name: 'b', dtype: 'number', source: 's', fillPolicy: 'mean', fillValue: 0.5 },
  { name: 'c', dtype: 'number', source: 's', fillPolicy: 'none' },
];

describe('spec hashing', () => {
  it('is stable for identical specs', () => {
    expect(hashSpecs(specs)).toBe(hashSpecs([...specs]));
  });

  it('is order-sensitive', () => {
    const reordered = [specs[1]!, specs[0]!, specs[2]!];
    expect(hashSpecs(specs)).not.toBe(hashSpecs(reordered));
  });

  it('changes when a transform changes', () => {
    const changed = specs.map((s) => (s.name === 'a' ? { ...s, transform: 'log1p' } : s));
    expect(hashSpecs(specs)).not.toBe(hashSpecs(changed));
  });
});

describe('vector build + completeness', () => {
  it('applies zero and mean fills, leaves none as null', () => {
    const built = buildVector(specs, { a: undefined, b: undefined, c: undefined });
    expect(built.values).toEqual({ a: 0, b: 0.5, c: null });
    // a and b filled, c not → 2/3 complete
    expect(built.completeness).toBeCloseTo(2 / 3, 6);
  });

  it('counts real values as present', () => {
    const built = buildVector(specs, { a: 1, b: 2, c: 3 });
    expect(built.completeness).toBe(1);
  });

  it('treats non-finite input as missing', () => {
    const built = buildVector(specs, { a: NaN, b: Infinity, c: 3 });
    expect(built.values.a).toBe(0); // zero fill
    expect(built.values.c).toBe(3);
  });
});

describe('parity', () => {
  it('throws when hashes differ', () => {
    expect(() => assertParity('aaaa', 'bbbb')).toThrow(FeatureParityError);
  });
  it('passes when hashes match', () => {
    expect(() => assertParity('aaaa', 'aaaa')).not.toThrow();
  });
});

describe('match-1x2 feature set', () => {
  it('has a stable, non-empty hash', () => {
    expect(MATCH_1X2_FEATURE_SET.specs.length).toBeGreaterThan(5);
    expect(hashSpecs(MATCH_1X2_FEATURE_SET.specs)).toMatch(/^[0-9a-f]{32}$/);
  });
});
