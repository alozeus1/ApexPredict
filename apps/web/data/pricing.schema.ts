import { z } from 'zod';

export const PricingRegionSchema = z.object({
  region: z.enum(['US', 'NG', 'GB', 'EU', 'ZA', 'KE']),
  currency: z.enum(['USD', 'NGN', 'GBP', 'EUR', 'ZAR', 'KES']),
  monthly: z.number().positive(),
  yearly: z.number().positive(),
  pctOffBase: z.number().min(0).max(100),
});

export const PricingSchema = z.array(PricingRegionSchema).length(6);
