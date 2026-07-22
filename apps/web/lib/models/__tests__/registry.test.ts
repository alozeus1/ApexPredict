import { describe, expect, it } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  assertTransition,
  InvalidTransitionError,
  evaluatePromotionGate,
  DEFAULT_PROMOTION_THRESHOLDS,
  type ModelQuality,
} from '../registry';

describe('model stage transitions', () => {
  it('permits the canonical lifecycle path', () => {
    expect(canTransition('DRAFT', 'TRAINING')).toBe(true);
    expect(canTransition('TRAINING', 'SHADOW')).toBe(true);
    expect(canTransition('SHADOW', 'APPROVED')).toBe(true);
    expect(canTransition('APPROVED', 'PRODUCTION')).toBe(true);
    expect(canTransition('PRODUCTION', 'RETIRED')).toBe(true);
  });

  it('allows RETIRED → PRODUCTION only for rollback', () => {
    expect(canTransition('RETIRED', 'PRODUCTION')).toBe(true);
  });

  it('treats FAILED as terminal', () => {
    expect(ALLOWED_TRANSITIONS.FAILED).toHaveLength(0);
    expect(canTransition('FAILED', 'DRAFT')).toBe(false);
  });

  it('rejects skipping straight from DRAFT to PRODUCTION', () => {
    expect(canTransition('DRAFT', 'PRODUCTION')).toBe(false);
    expect(() => assertTransition('DRAFT', 'PRODUCTION')).toThrow(InvalidTransitionError);
  });

  it('rejects reviving a retired model into training', () => {
    expect(canTransition('RETIRED', 'TRAINING')).toBe(false);
  });
});

describe('promotion gate', () => {
  const solidCandidate: ModelQuality = { brierScore: 0.20, logLoss: 0.55, calibrationError: 0.03, sampleSize: 500 };

  it('returns INSUFFICIENT_DATA below the sample floor regardless of metrics', () => {
    const result = evaluatePromotionGate({ ...solidCandidate, sampleSize: 50 }, null);
    expect(result.recommendation).toBe('INSUFFICIENT_DATA');
    expect(result.passes).toBe(false);
  });

  it('rejects a candidate that is miscalibrated', () => {
    const result = evaluatePromotionGate({ ...solidCandidate, calibrationError: 0.2 }, null);
    expect(result.recommendation).toBe('REJECT');
  });

  it('promotes a strictly better candidate over an incumbent', () => {
    const champion: ModelQuality = { brierScore: 0.24, logLoss: 0.62, calibrationError: 0.04, sampleSize: 500 };
    const result = evaluatePromotionGate(solidCandidate, champion);
    expect(result.recommendation).toBe('PROMOTE');
    expect(result.passes).toBe(true);
  });

  it('holds a non-inferior but not strictly better candidate', () => {
    const champion: ModelQuality = { brierScore: 0.20, logLoss: 0.55, calibrationError: 0.04, sampleSize: 500 };
    const result = evaluatePromotionGate(solidCandidate, champion);
    expect(result.recommendation).toBe('HOLD');
    expect(result.passes).toBe(true);
  });

  it('rejects a candidate that regresses beyond tolerance', () => {
    const champion: ModelQuality = { brierScore: 0.20, logLoss: 0.50, calibrationError: 0.04, sampleSize: 500 };
    const worse: ModelQuality = { brierScore: 0.30, logLoss: 0.70, calibrationError: 0.03, sampleSize: 500 };
    const result = evaluatePromotionGate(worse, champion);
    expect(result.recommendation).toBe('REJECT');
  });

  it('uses absolute ceilings when there is no incumbent', () => {
    const badAbsolute: ModelQuality = { brierScore: 0.4, logLoss: 1.5, calibrationError: 0.03, sampleSize: 500 };
    expect(evaluatePromotionGate(badAbsolute, null).recommendation).toBe('REJECT');
    expect(DEFAULT_PROMOTION_THRESHOLDS.maxLogLossAbsolute).toBeGreaterThan(0);
  });
});
