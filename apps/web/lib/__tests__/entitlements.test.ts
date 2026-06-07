import { describe, it, expect } from 'vitest';
import { entitlementsFor, entitlementsForTier, type Entitlements } from '../entitlements';
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/data/pricing.schema';

// Expected matrix mirrors data/entitlements.json. The test is the contract: any
// drift in the data file is caught here.
const EXPECTED: Record<SubscriptionTier, Entitlements> = {
  FREE: { picksPerDay: 4, valueBets: false, alerts: null, kelly: false, warRoom: 'none', telegram: false, whatsapp: false, calibrationDepthDays: 7 },
  WEEKLY: { picksPerDay: 10, valueBets: true, alerts: 'email', kelly: true, warRoom: 'partial', telegram: true, whatsapp: false, calibrationDepthDays: 30 },
  MONTHLY: { picksPerDay: 10, valueBets: true, alerts: 'push', kelly: true, warRoom: 'partial', telegram: true, whatsapp: true, calibrationDepthDays: 90 },
  YEARLY: { picksPerDay: 10, valueBets: true, alerts: 'priority', kelly: true, warRoom: 'full', telegram: true, whatsapp: true, calibrationDepthDays: 365 },
};

const FEATURES: ReadonlyArray<keyof Entitlements> = [
  'picksPerDay', 'valueBets', 'alerts', 'kelly', 'warRoom', 'telegram', 'whatsapp', 'calibrationDepthDays',
];

describe('entitlements matrix (every tier × every feature)', () => {
  for (const tier of SUBSCRIPTION_TIERS) {
    for (const feature of FEATURES) {
      it(`${tier}.${feature}`, () => {
        expect(entitlementsForTier(tier)[feature]).toEqual(EXPECTED[tier][feature]);
      });
    }
  }
});

describe('entitlementsFor (user resolution)', () => {
  it('null user resolves to FREE', () => {
    expect(entitlementsFor(null)).toEqual(EXPECTED.FREE);
    expect(entitlementsFor()).toEqual(EXPECTED.FREE);
  });

  it('active subscription grants its tier', () => {
    expect(entitlementsFor({ subscription: { tier: 'MONTHLY', status: 'ACTIVE' } })).toEqual(EXPECTED.MONTHLY);
    expect(entitlementsFor({ subscription: { tier: 'YEARLY', status: 'TRIALING' } })).toEqual(EXPECTED.YEARLY);
  });

  it('non-active subscription falls back to FREE', () => {
    expect(entitlementsFor({ subscription: { tier: 'MONTHLY', status: 'PAST_DUE' } })).toEqual(EXPECTED.FREE);
    expect(entitlementsFor({ subscription: { tier: 'YEARLY', status: 'CANCELLED' } })).toEqual(EXPECTED.FREE);
  });

  it('disabled user falls back to FREE even with an active subscription', () => {
    expect(
      entitlementsFor({ subscription: { tier: 'YEARLY', status: 'ACTIVE' }, disabledAt: new Date() }),
    ).toEqual(EXPECTED.FREE);
  });

  it('bare { tier } form resolves directly', () => {
    expect(entitlementsFor({ tier: 'WEEKLY' })).toEqual(EXPECTED.WEEKLY);
  });
});
