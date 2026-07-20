import { describe, expect, it } from 'vitest';
import {
  assemblePrediction,
  buildPredictionContext,
  recentFormScore,
  selectPick,
  teamStrength,
  toDistribution,
} from '../model';
import { MARKETS, blendSignals, eloDistribution, poissonDistribution, signalAgreement } from '../signals';
import type { PredictionInput } from '../model';
import type { FootballDataMatch, FootballDataStandingRow } from '@/lib/live-data/football-data';

const match: FootballDataMatch = {
  id: 1,
  competition: { id: 2021, code: 'PL', name: 'Premier League' },
  homeTeam: { id: 10, name: 'Home FC', shortName: 'Home', tla: 'HOM' },
  awayTeam: { id: 20, name: 'Away FC', shortName: 'Away', tla: 'AWY' },
  utcDate: '2026-08-10T18:00:00.000Z',
  status: 'SCHEDULED',
};

const tableRow: FootballDataStandingRow = {
  position: 4,
  team: match.homeTeam,
  playedGames: 30,
  won: 15,
  draw: 8,
  lost: 7,
  points: 53,
  goalsFor: 48,
  goalsAgainst: 34,
  goalDifference: 14,
};

const noStats: PredictionInput = { match, homeStats: undefined, awayStats: undefined };

const sum = (distribution: Record<string, number>) =>
  MARKETS.reduce((total, market) => total + distribution[market]!, 0);

describe('distributions', () => {
  it.each([
    [0.86, 0.18],
    [0.5, 0.5],
    [0.2, 0.85],
  ])('eloDistribution(%s, %s) is a valid probability distribution', (home, away) => {
    const distribution = eloDistribution(home, away);
    expect(sum(distribution)).toBeCloseTo(1, 9);
    for (const market of MARKETS) {
      expect(distribution[market]).toBeGreaterThan(0);
      expect(distribution[market]).toBeLessThan(1);
    }
  });

  it.each([
    [1.8, 0.9],
    [1.0, 1.0],
    [0.35, 3.1],
  ])('poissonDistribution(%s, %s) is a valid probability distribution', (home, away) => {
    expect(sum(poissonDistribution(home, away))).toBeCloseTo(1, 9);
  });

  it('favours the stronger side and allocates more draw mass to level matchups', () => {
    const mismatch = eloDistribution(0.82, 0.25);
    const level = eloDistribution(0.5, 0.5);

    expect(mismatch['1']).toBeGreaterThan(mismatch['2']);
    expect(eloDistribution(0.25, 0.82)['2']).toBeGreaterThan(eloDistribution(0.25, 0.82)['1']);
    expect(level.X).toBeGreaterThan(mismatch.X);
  });

  it('keeps ELO and Poisson genuinely independent signals', () => {
    // Regression: the previous elo/xg agents were affine transforms of the same
    // probability, so "blending" them added no information.
    const elo = eloDistribution(0.72, 0.38);
    const poisson = poissonDistribution(1.9, 1.0);
    const totalVariation = MARKETS.reduce((total, market) => total + Math.abs(elo[market] - poisson[market]), 0) / 2;

    expect(totalVariation).toBeGreaterThan(0.02);
  });
});

describe('blendSignals', () => {
  const elo = eloDistribution(0.72, 0.38);
  const poisson = poissonDistribution(1.9, 1.0);

  it('averages weighted signals and excludes zero-weight ones', () => {
    const blended = blendSignals([
      { name: 'elo', available: true, weight: 0.5, distribution: elo },
      { name: 'poisson', available: true, weight: 0.5, distribution: poisson },
      { name: 'xg', available: false, weight: 0, distribution: poisson, reason: 'shot-event-feed-not-connected' },
    ]);

    expect(blended).toBeDefined();
    expect(sum(blended!)).toBeCloseTo(1, 9);
    expect(blended!['1']).toBeCloseTo((elo['1'] + poisson['1']) / 2, 9);
  });

  it('returns undefined when no signal is usable', () => {
    expect(blendSignals([{ name: 'xg', available: false, weight: 0, distribution: poisson }])).toBeUndefined();
  });
});

describe('signalAgreement', () => {
  const elo = eloDistribution(0.72, 0.38);

  it('is 1 for identical distributions and ~0 for opposed ones', () => {
    expect(
      signalAgreement([
        { name: 'a', available: true, weight: 1, distribution: elo },
        { name: 'b', available: true, weight: 1, distribution: elo },
      ]),
    ).toBeCloseTo(1, 9);

    expect(
      signalAgreement([
        { name: 'a', available: true, weight: 1, distribution: toDistribution(0.98, 0.01, 0.01) },
        { name: 'b', available: true, weight: 1, distribution: toDistribution(0.01, 0.01, 0.98) },
      ]),
    ).toBeLessThan(0.05);
  });

  it('treats a lone signal as full agreement', () => {
    expect(signalAgreement([{ name: 'a', available: true, weight: 1, distribution: elo }])).toBe(1);
  });
});

describe('recentFormScore', () => {
  it('scores wins and losses at the extremes', () => {
    expect(recentFormScore('W,W,W,W,W')).toBe(1);
    expect(recentFormScore('L,L,L,L,L')).toBe(0);
  });

  it('returns undefined rather than assuming neutral form', () => {
    expect(recentFormScore(undefined)).toBeUndefined();
    expect(recentFormScore('----')).toBeUndefined();
  });

  it('weights the most recent result most heavily', () => {
    expect(recentFormScore('W,W,L,L,L')!).toBeGreaterThan(recentFormScore('L,L,W,W,W')!);
  });
});

describe('teamStrength', () => {
  it('reflects recent form for an otherwise identical table row', () => {
    const slumping = { ...tableRow, form: 'L,L,L,L,L' };
    const surging = { ...tableRow, form: 'W,W,W,W,W' };

    expect(teamStrength(slumping)).toBeLessThan(teamStrength(tableRow));
    expect(teamStrength(surging)).toBeGreaterThan(teamStrength(tableRow));
    expect(teamStrength(surging)).toBeLessThanOrEqual(0.86);
    expect(teamStrength(slumping)).toBeGreaterThanOrEqual(0.18);
  });

  it('returns a neutral value when standings are unavailable', () => {
    expect(teamStrength(undefined)).toBe(0.5);
  });
});

describe('pick selection', () => {
  it('follows the supplied ensemble distribution rather than the raw heuristic', () => {
    // Regression: the ensemble used to be computed and displayed while the pick
    // came from the single-signal heuristic.
    const awayHeavy = toDistribution(0.1, 0.15, 0.75);
    const context = buildPredictionContext(noStats, awayHeavy);

    expect(context.markets.find((candidate) => candidate.market === '2')?.probability).toBeCloseTo(0.75, 9);
    expect(assemblePrediction(noStats, context).market).toBe('2');
  });

  it('ranks by probability when no real odds exist', () => {
    // Regression: synthetic fair prices are rounded to 2dp, so ranking by edge
    // was ranking by rounding noise — which systematically preferred
    // mid-probability outcomes over high-probability ones.
    const context = buildPredictionContext(noStats, toDistribution(0.1, 0.15, 0.75));

    for (const candidate of context.markets) {
      expect(candidate.synthetic).toBe(true);
      expect(candidate.edge).toBe(0);
    }
    expect(selectPick(context.markets).market).toBe('2');
  });

  it('ranks by edge against real prices, ignoring unpriced markets', () => {
    const context = buildPredictionContext(
      { ...noStats, marketOdds: [{ bookCode: 'BK', market: '1', price: 3.2 }] },
      toDistribution(0.45, 0.2, 0.35),
    );
    const pick = selectPick(context.markets);

    expect(pick.market).toBe('1');
    expect(pick.synthetic).toBe(false);
    expect(pick.edge).toBeCloseTo(0.45 - 1 / 3.2, 9);
  });

  it('never flags a value bet without a real market price', () => {
    const prediction = assemblePrediction(noStats, buildPredictionContext(noStats, toDistribution(0.8, 0.1, 0.1)));
    expect(prediction.odds[0]?.bookCode).toBe('MODEL_FAIR_PRICE');
    expect(prediction.valueBet).toBe(false);
  });
});
