import { describe, expect, it } from 'vitest';
import { normalizeFixture } from '../normalize';

describe('normalizeFixture', () => {
  it('maps enrichment and odds movement into premium context', () => {
    const match = normalizeFixture({
      externalId: 537349,
      competitionId: 'WC',
      competition: { name: 'World Cup' },
      homeTeam: { name: 'Nigeria', tla: 'NGA' },
      awayTeam: { name: 'Ghana', tla: 'GHA' },
      kickoff: new Date('2026-06-26T18:00:00.000Z'),
      odds: [{ bookCode: 'DK', market: '1', price: 2.1 }],
      oddsMovements: [{
        bookCode: 'DK',
        market: '1',
        previousPrice: 2,
        currentPrice: 2.1,
        movementPct: 0.05,
        capturedAt: new Date('2026-06-25T12:00:00.000Z'),
      }],
      enrichment: {
        weatherJson: { available: true, provider: 'open-meteo', temperatureC: 24, windKph: 12, precipitationMm: 0 },
        injuriesJson: { available: false, reason: 'injury-provider-not-configured' },
        lineupsJson: { available: false, reason: 'lineup-provider-not-configured' },
        refereeJson: { available: false, reason: 'referee-provider-not-configured' },
      },
      predictions: [{
        elo: 0.6,
        poisson: 0.58,
        xg: 0.57,
        ensemble: 0.58,
        confidence: 0.64,
        topPick: 'NGA Win',
        valueBet: true,
        narrative: 'Provider-backed prediction.',
      }],
    });

    expect(match.premiumContext?.weather.available).toBe(true);
    expect(match.premiumContext?.weather.summary).toContain('24.0C');
    expect(match.premiumContext?.oddsMovement).toHaveLength(1);
    expect(match.premiumContext?.oddsMovement[0]?.movementPct).toBe(0.05);
  });
});
