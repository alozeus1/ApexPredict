import { z } from 'zod';

/**
 * Canonical prediction/odds markets. This is the widened set the data layer
 * accepts going forward (the DB `market` column is a free-form String, so this
 * Zod schema — not a DB constraint — is the enforcement point).
 *
 * Distinct from the legacy display union on `OddsByBook.market`; the engine
 * currently emits only 1/X/2, with the over/under + BTTS markets reserved for S2.
 */
export const MARKETS = ['1', 'X', '2', 'O25_OVER', 'O25_UNDER', 'BTTS_YES', 'BTTS_NO'] as const;

export const MarketSchema = z.enum(MARKETS);

export type Market = z.infer<typeof MarketSchema>;

/** Type guard for a canonical market identifier. */
export const isMarket = (value: unknown): value is Market => MarketSchema.safeParse(value).success;
