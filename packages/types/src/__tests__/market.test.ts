import { describe, it, expect } from 'vitest';
import { MARKETS, MarketSchema, isMarket } from '../market';

describe('market schema', () => {
  it('accepts every canonical market', () => {
    for (const m of MARKETS) expect(MarketSchema.safeParse(m).success).toBe(true);
  });

  it('exposes the widened set', () => {
    expect(MARKETS).toEqual(['1', 'X', '2', 'O25_OVER', 'O25_UNDER', 'BTTS_YES', 'BTTS_NO']);
  });

  it('rejects unknown / legacy values', () => {
    for (const bad of ['O2.5', 'BTTS-Y', 'draw', '', '3']) {
      expect(MarketSchema.safeParse(bad).success).toBe(false);
      expect(isMarket(bad)).toBe(false);
    }
  });

  it('isMarket narrows valid values', () => {
    expect(isMarket('BTTS_YES')).toBe(true);
    expect(isMarket(42)).toBe(false);
  });
});
