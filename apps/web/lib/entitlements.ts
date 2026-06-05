import matrixJson from '@/data/entitlements.json';
import {
  TierMatrixSchema,
  type Entitlements,
  type SubscriptionTier,
} from '@/data/pricing.schema';

export type { Entitlements, SubscriptionTier };

// Validate the matrix once at module load — a malformed data/entitlements.json
// fails fast rather than silently shipping wrong entitlements.
const MATRIX = TierMatrixSchema.parse(matrixJson);

/** Tiers whose entitlements are actually granted (others fall back to FREE). */
const ACTIVE_STATUSES = new Set(['TRIALING', 'ACTIVE']);

/** Minimal user shape this resolver needs — compatible with the Prisma User + Subscription. */
export interface EntitlementUser {
  subscription?: { tier?: SubscriptionTier | null; status?: string | null } | null;
  disabledAt?: Date | null;
}

function resolveTier(input?: EntitlementUser | { tier?: SubscriptionTier } | null): SubscriptionTier {
  if (!input) return 'FREE';
  // Bare { tier } form (used by tier-comparison UI).
  if ('tier' in input && input.tier && !('subscription' in input)) return input.tier;
  const sub = (input as EntitlementUser).subscription;
  if ((input as EntitlementUser).disabledAt) return 'FREE';
  if (sub?.tier && sub.status && ACTIVE_STATUSES.has(sub.status)) return sub.tier;
  return 'FREE';
}

/** Entitlements for a given tier. */
export function entitlementsForTier(tier: SubscriptionTier): Entitlements {
  return MATRIX[tier];
}

/**
 * Entitlements for a user (or null). A null/absent/disabled user, or one without
 * an active/trialing subscription, resolves to the FREE tier.
 */
export function entitlementsFor(input?: EntitlementUser | { tier?: SubscriptionTier } | null): Entitlements {
  return MATRIX[resolveTier(input)];
}
