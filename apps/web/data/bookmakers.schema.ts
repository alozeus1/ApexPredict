import { z } from 'zod';

export const BookmakerSchema = z.object({
  code: z.string(),
  name: z.string(),
  regions: z.array(z.enum(['US', 'NG', 'GB', 'EU', 'ZA', 'KE'])).min(1),
  deeplink: z.string().url(),
  logoUrl: z.string(),
});

export const BookmakersSchema = z.array(BookmakerSchema).min(10);
