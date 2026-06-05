/**
 * Tier entitlements. SCAFFOLD for PR feat/copy-repositioning: returns static tier
 * defaults so the Premium UI can render tier-aware. The full implementation —
 * sourcing the matrix from data/pricing.json with a Zod schema and mapping a real
 * `User`/`Subscription` to a tier — lands in feat/identity-foundation (PR 4).
 */

export type SubscriptionTier = 'FREE' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Entitlements {
  picksPerDay: number;
  valueBets: boolean;
  alerts: 'email' | 'push' | 'priority' | null;
  kelly: boolean;
  warRoom: 'none' | 'partial' | 'full';
  telegram: boolean;
  whatsapp: boolean;
  calibrationDepthDays: number;
}

const MATRIX: Record<SubscriptionTier, Entitlements> = {
  FREE: {
    picksPerDay: 4,
    valueBets: false,
    alerts: null,
    kelly: false,
    warRoom: 'none',
    telegram: false,
    whatsapp: false,
    calibrationDepthDays: 7,
  },
  WEEKLY: {
    picksPerDay: 10,
    valueBets: true,
    alerts: 'email',
    kelly: true,
    warRoom: 'partial',
    telegram: true,
    whatsapp: false,
    calibrationDepthDays: 30,
  },
  MONTHLY: {
    picksPerDay: 10,
    valueBets: true,
    alerts: 'push',
    kelly: true,
    warRoom: 'partial',
    telegram: true,
    whatsapp: true,
    calibrationDepthDays: 90,
  },
  YEARLY: {
    picksPerDay: 10,
    valueBets: true,
    alerts: 'priority',
    kelly: true,
    warRoom: 'full',
    telegram: true,
    whatsapp: true,
    calibrationDepthDays: 365,
  },
};

/** Entitlements for the given tier. A null/absent input resolves to the FREE tier. */
export function entitlementsFor(input?: { tier?: SubscriptionTier } | null): Entitlements {
  return MATRIX[input?.tier ?? 'FREE'];
}

/** Convenience accessor for a specific tier (used by tier-comparison UI). */
export function entitlementsForTier(tier: SubscriptionTier): Entitlements {
  return MATRIX[tier];
}
