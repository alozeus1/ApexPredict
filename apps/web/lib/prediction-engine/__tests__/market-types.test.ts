import { describe, expect, it } from 'vitest';
import {
  buildPredictionContext,
  hasDraw,
  marketsFor,
  selectPick,
  toDistribution,
  type PredictionInput,
} from '../model';
import { blendSignals, eloDistribution, signalAgreement } from '../signals';
import type { FootballDataMatch } from '@/lib/live-data/football-data';

const match: FootballDataMatch = {
  id: 1,
  competition: { id: 12, code: 'NBA', name: 'NBA' },
  homeTeam: { id: 10, name: 'Home Hoops', shortName: 'Home', tla: 'HOM' },
  awayTeam: { id: 20, name: 'Away Hoops', shortName: 'Away', tla: 'AWY' },
  utcDate: '2026-11-02T01:00:00.000Z',
  status: 'SCHEDULED',
};

const twoWayInput: PredictionInput = {
  match,
  homeStats: undefined,
  awayStats: undefined,
  marketType: 'MONEYLINE_2WAY',
};

describe('market sets', () => {
  it('exposes the right outcome space per market type', () => {
    expect(marketsFor('MONEYLINE_3WAY')).toEqual(['1', 'X', '2']);
    expect(marketsFor('MONEYLINE_2WAY')).toEqual(['1', '2']);
    expect(hasDraw('MONEYLINE_3WAY')).toBe(true);
    expect(hasDraw('MONEYLINE_2WAY')).toBe(false);
  });

  it('defaults to football when no market type is supplied', () => {
    expect(marketsFor()).toEqual(['1', 'X', '2']);
  });
});

describe('two-way distributions', () => {
  it('pins draw mass to exactly zero and normalises over home/away', () => {
    const distribution = toDistribution(0.6, 0.25, 0.4, 'MONEYLINE_2WAY');

    expect(distribution.X).toBe(0);
    expect(distribution['1'] + distribution['2']).toBeCloseTo(1, 9);
    expect(distribution['1']).toBeCloseTo(0.6, 9);
    expect(distribution['2']).toBeCloseTo(0.4, 9);
  });

  it('does not leak draw probability into a two-way ELO signal', () => {
    // Regression guard: allocating draw mass in a sport with no draw would
    // misprice every basketball, tennis and NFL market.
    const distribution = eloDistribution(0.7, 0.4, 'MONEYLINE_2WAY');

    expect(distribution.X).toBe(0);
    expect(distribution['1'] + distribution['2']).toBeCloseTo(1, 9);
    expect(distribution['1']).toBeGreaterThan(distribution['2']);
  });

  it('still models a draw for three-way markets', () => {
    expect(eloDistribution(0.7, 0.4, 'MONEYLINE_3WAY').X).toBeGreaterThan(0);
  });
});

describe('two-way candidate generation', () => {
  it('never produces a Draw candidate for a two-way competition', () => {
    const context = buildPredictionContext(twoWayInput);

    expect(context.marketType).toBe('MONEYLINE_2WAY');
    expect(context.markets.map((candidate) => candidate.market)).toEqual(['1', '2']);
    expect(context.markets.some((candidate) => candidate.market === 'X')).toBe(false);
  });

  it('cannot select a Draw pick in a two-way competition', () => {
    // Even with a distribution that puts mass on X, the draw is not a candidate.
    const context = buildPredictionContext(twoWayInput, toDistribution(0.3, 0.9, 0.7, 'MONEYLINE_2WAY'));
    expect(selectPick(context.markets).market).not.toBe('X');
  });

  it('keeps three-way behaviour unchanged', () => {
    const context = buildPredictionContext({ ...twoWayInput, marketType: 'MONEYLINE_3WAY' });
    expect(context.markets.map((candidate) => candidate.market)).toEqual(['1', 'X', '2']);
  });
});

describe('blending under two-way markets', () => {
  const a = eloDistribution(0.7, 0.4, 'MONEYLINE_2WAY');
  const b = eloDistribution(0.6, 0.5, 'MONEYLINE_2WAY');

  it('keeps the blend two-way', () => {
    const blended = blendSignals(
      [
        { name: 'elo', available: true, weight: 0.5, distribution: a },
        { name: 'other', available: true, weight: 0.5, distribution: b },
      ],
      'MONEYLINE_2WAY',
    );

    expect(blended?.X).toBe(0);
    expect((blended?.['1'] ?? 0) + (blended?.['2'] ?? 0)).toBeCloseTo(1, 9);
  });

  it('measures agreement only over markets that exist', () => {
    expect(signalAgreement(
      [
        { name: 'a', available: true, weight: 1, distribution: a },
        { name: 'b', available: true, weight: 1, distribution: a },
      ],
      'MONEYLINE_2WAY',
    )).toBeCloseTo(1, 9);
  });

  it('returns undefined when every signal is unavailable for the sport', () => {
    // A two-way sport has no Poisson goal model and no xG model yet, so if ELO
    // were ever unavailable the graph must fail loudly rather than invent one.
    const blended = blendSignals(
      [
        { name: 'poisson', available: false, weight: 0, reason: 'poisson-goal-model-is-football-only' },
        { name: 'xg', available: false, weight: 0, reason: 'xg-model-is-football-only' },
      ],
      'MONEYLINE_2WAY',
    );

    expect(blended).toBeUndefined();
  });
});
