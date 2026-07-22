import { describe, expect, it } from 'vitest';
import { generatePrediction } from '../model';
import { runPredictionGraph } from '../orchestrator';

const match = {
  id: 1,
  competition: { id: 2021, code: 'PL', name: 'Premier League' },
  homeTeam: { id: 10, name: 'Home FC', shortName: 'Home', tla: 'HOM' },
  awayTeam: { id: 20, name: 'Away FC', shortName: 'Away', tla: 'AWY' },
  utcDate: '2026-06-10T18:00:00.000Z',
  status: 'SCHEDULED',
};

describe('generatePrediction', () => {
  it('returns a calibrated market pick with probability and odds comparison fields', () => {
    const prediction = generatePrediction({
      match,
      homeStats: {
        position: 1,
        team: match.homeTeam,
        playedGames: 20,
        won: 15,
        draw: 3,
        lost: 2,
        points: 48,
        goalsFor: 44,
        goalsAgainst: 15,
        goalDifference: 29,
      },
      awayStats: {
        position: 12,
        team: match.awayTeam,
        playedGames: 20,
        won: 6,
        draw: 4,
        lost: 10,
        points: 22,
        goalsFor: 21,
        goalsAgainst: 33,
        goalDifference: -12,
      },
      marketOdds: [{ bookCode: 'BK', market: '1', price: 2.25 }],
    });

    expect(prediction.market).toBe('1');
    expect(prediction.probability).toBeGreaterThan(0.45);
    expect(prediction.edge).toBeGreaterThan(0);
    expect(prediction.odds[0]).toMatchObject({ bookCode: 'BK', market: '1', price: 2.25 });
  });

  it('uses a synthetic MODEL_FAIR_PRICE and is never a value bet when no real odds exist', () => {
    const prediction = generatePrediction({
      match,
      homeStats: {
        position: 1, team: match.homeTeam, playedGames: 20, won: 15, draw: 3, lost: 2,
        points: 48, goalsFor: 44, goalsAgainst: 15, goalDifference: 29,
      },
      awayStats: {
        position: 18, team: match.awayTeam, playedGames: 20, won: 3, draw: 3, lost: 14,
        points: 12, goalsFor: 14, goalsAgainst: 40, goalDifference: -26,
      },
      // no marketOdds → synthetic fair price
    });

    expect(prediction.odds[0]?.bookCode).toBe('MODEL_FAIR_PRICE');
    expect(prediction.valueBet).toBe(false);
  });

  it('runs the agent graph with baseline enrichment and a normal prediction payload', async () => {
    const result = await runPredictionGraph({
      match,
      homeStats: {
        position: 1, team: match.homeTeam, playedGames: 20, won: 15, draw: 3, lost: 2,
        points: 48, goalsFor: 44, goalsAgainst: 15, goalDifference: 29,
      },
      awayStats: {
        position: 18, team: match.awayTeam, playedGames: 20, won: 3, draw: 3, lost: 14,
        points: 12, goalsFor: 14, goalsAgainst: 40, goalDifference: -26,
      },
    });

    expect(result.prediction.market).toBe('1');
    expect(result.prediction.narrative).toContain('Expected goals baseline');
    expect(result.enrichment?.weather.available).toBe(false);
    expect(result.enrichment?.injuries.available).toBe(false);
  });
});
