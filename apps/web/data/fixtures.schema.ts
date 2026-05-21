import { z } from 'zod';

export const FixtureSchema = z.object({
  id: z.string().min(1),
  sport: z.enum(['soccer', 'basketball', 'tennis', 'football', 'hockey', 'rugby']),
  league: z.string().min(1),
  home: z.object({ name: z.string(), code: z.string() }),
  away: z.object({ name: z.string(), code: z.string() }),
  kickoff: z.string().datetime(),
  odds: z.array(z.object({
    bookCode: z.string(),
    price: z.number().positive(),
    market: z.enum(['1', 'X', '2', 'O2.5', 'U2.5', 'BTTS-Y', 'BTTS-N']),
  })).min(1),
  model: z.object({
    elo: z.number().min(0).max(1),
    poisson: z.number().min(0).max(1),
    xg: z.number().min(0).max(1),
    ensemble: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
  }),
  topPick: z.string(),
  valueBet: z.boolean(),
  narrative: z.string().min(20),
  featured: z.boolean().optional(),
});

export const FixturesSchema = z.array(FixtureSchema).min(30).max(40);

export type Fixture = z.infer<typeof FixtureSchema>;
