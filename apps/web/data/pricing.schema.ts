import { z } from 'zod';

export const PricingRegionSchema = z.object({
  region: z.enum(['US', 'NG', 'GB', 'EU', 'ZA', 'KE']),
  currency: z.enum(['USD', 'NGN', 'GBP', 'EUR', 'ZAR', 'KES']),
  monthly: z.number().positive(),
  yearly: z.number().positive(),
  pctOffBase: z.number().min(0).max(100),
});

export const PricingSchema = z.array(PricingRegionSchema).length(6);

// ── Tier entitlements (data/entitlements.json) ───────────────────────────────

/** Subscription tiers, in ladder order. */
export const SUBSCRIPTION_TIERS = ['FREE', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

/** Per-tier feature entitlements. */
export const EntitlementsSchema = z.object({
  picksPerDay: z.number().int().nonnegative(),
  valueBets: z.boolean(),
  alerts: z.enum(['email', 'push', 'priority']).nullable(),
  kelly: z.boolean(),
  warRoom: z.enum(['none', 'partial', 'full']),
  telegram: z.boolean(),
  whatsapp: z.boolean(),
  calibrationDepthDays: z.number().int().positive(),
});
export type Entitlements = z.infer<typeof EntitlementsSchema>;

/** The full tier -> entitlements matrix. Every tier must be present. */
export const TierMatrixSchema = z.object({
  FREE: EntitlementsSchema,
  WEEKLY: EntitlementsSchema,
  MONTHLY: EntitlementsSchema,
  YEARLY: EntitlementsSchema,
});
export type TierMatrix = z.infer<typeof TierMatrixSchema>;
