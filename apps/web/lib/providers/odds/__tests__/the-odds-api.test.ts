import { describe, expect, it } from 'vitest';
import { TheOddsApiProvider } from '../the-odds-api';

const match = {
  id: 537349,
  competition: { id: 2000, code: 'WC', name: 'World Cup' },
  homeTeam: { id: 1, name: 'Nigeria', shortName: 'Nigeria', tla: 'NGA' },
  awayTeam: { id: 2, name: 'Ghana', shortName: 'Ghana', tla: 'GHA' },
  utcDate: '2026-06-26T18:00:00.000Z',
  status: 'SCHEDULED',
};

describe('TheOddsApiProvider', () => {
  it('is a no-op until an API key is configured', async () => {
    const provider = new TheOddsApiProvider('');
    const odds = await provider.fetchCompetitionOdds('WC', [match]);

    expect(provider.configured()).toBe(false);
    expect(odds.size).toBe(0);
  });
});
