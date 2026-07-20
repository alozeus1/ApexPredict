import {
  DEFAULT_MARKET_TYPE,
  clamp,
  hasDraw,
  marketsFor,
  toDistribution,
  type MarketDistribution,
  type OutcomeMarketType,
  type PredictionMarket,
} from './model';

/**
 * Full 1X2 slot list. Signal maths iterates the ACTIVE markets for a given
 * market type via `marketsFor()`; this constant is only the superset used where
 * a distribution object's shape is being walked.
 */
export const MARKETS: readonly PredictionMarket[] = ['1', 'X', '2'] as const;

/**
 * One model's view of the outcome space.
 *
 * Every agent returns a full distribution rather than a single market plus a
 * score. Returning a single market was the source of a real defect: the Poisson
 * agent could vote "Draw" while the ensemble was being assembled for "Home
 * Win", so the blend averaged probabilities of different events.
 */
export interface AgentSignal {
  name: string;
  available: boolean;
  /** Relative weight in the ensemble. Zero means reported but not blended. */
  weight: number;
  distribution?: MarketDistribution;
  reason?: string;
}

/**
 * ELO-style distribution derived directly from the team-strength spread.
 *
 * Deliberately NOT a function of the heuristic's own 1X2 probabilities. The
 * previous implementation computed `pick.probability * 0.98 + …`, which made it
 * an affine transform of the signal it was supposed to corroborate — three
 * "agents" that were mathematically one agent.
 */
export function eloDistribution(
  homeStrength: number,
  awayStrength: number,
  marketType: OutcomeMarketType = DEFAULT_MARKET_TYPE,
): MarketDistribution {
  const HOME_ADVANTAGE = 60;
  const homeRating = (homeStrength - 0.5) * 800 + HOME_ADVANTAGE;
  const awayRating = (awayStrength - 0.5) * 800;
  const delta = homeRating - awayRating;

  // Standard ELO score expectation (a win plus half a draw).
  const expectedScore = 1 / (1 + 10 ** (-delta / 400));

  // Two-way sports have no draw to allocate: the score expectation IS the
  // win probability. Splitting off draw mass here would silently misprice
  // every basketball, tennis and NFL market.
  if (!hasDraw(marketType)) {
    return toDistribution(expectedScore, 0, 1 - expectedScore, marketType);
  }

  // Draw propensity peaks when ratings are level and decays as they diverge.
  const drawProbability = clamp(0.3 * Math.exp(-Math.abs(delta) / 250), 0.08, 0.32);
  const decisive = 1 - drawProbability;

  return toDistribution(
    decisive * expectedScore,
    drawProbability,
    decisive * (1 - expectedScore),
    marketType,
  );
}

function poissonProbability(lambda: number, goals: number) {
  let factorial = 1;
  for (let i = 2; i <= goals; i += 1) factorial *= i;
  return (Math.E ** -lambda * lambda ** goals) / factorial;
}

/** 1X2 distribution from independent home/away goal rates over a scoreline grid. */
export function poissonDistribution(homeGoals: number, awayGoals: number): MarketDistribution {
  let home = 0;
  let draw = 0;
  let away = 0;

  for (let h = 0; h <= 7; h += 1) {
    for (let a = 0; a <= 7; a += 1) {
      const probability = poissonProbability(homeGoals, h) * poissonProbability(awayGoals, a);
      if (h > a) home += probability;
      else if (h === a) draw += probability;
      else away += probability;
    }
  }

  return toDistribution(home, draw, away);
}

function usableSignals(signals: AgentSignal[]) {
  return signals.filter(
    (signal): signal is AgentSignal & { distribution: MarketDistribution } =>
      signal.available && signal.weight > 0 && signal.distribution !== undefined,
  );
}

/**
 * Blends the available signals into a single distribution.
 * Signals with zero weight or no distribution are reported but not blended.
 */
export function blendSignals(
  signals: AgentSignal[],
  marketType: OutcomeMarketType = DEFAULT_MARKET_TYPE,
): MarketDistribution | undefined {
  const usable = usableSignals(signals);
  if (usable.length === 0) return undefined;

  const weightTotal = usable.reduce((sum, signal) => sum + signal.weight, 0);
  const weighted = (market: PredictionMarket) =>
    usable.reduce((sum, signal) => sum + (signal.distribution[market] * signal.weight) / weightTotal, 0);

  return toDistribution(weighted('1'), hasDraw(marketType) ? weighted('X') : 0, weighted('2'), marketType);
}

/**
 * Agreement in [0,1] between the blended signals — 1 means identical
 * distributions, 0 means maximally opposed. Used to damp confidence when the
 * models disagree, which is exactly when a stated confidence should fall.
 */
export function signalAgreement(
  signals: AgentSignal[],
  marketType: OutcomeMarketType = DEFAULT_MARKET_TYPE,
): number {
  const usable = usableSignals(signals);
  if (usable.length < 2) return 1;

  const active = marketsFor(marketType);
  let worst = 1;
  for (let i = 0; i < usable.length; i += 1) {
    for (let j = i + 1; j < usable.length; j += 1) {
      const a = usable[i]?.distribution as MarketDistribution;
      const b = usable[j]?.distribution as MarketDistribution;
      // Total variation distance over the markets that exist, in [0,1].
      const tvd = active.reduce((sum, market) => sum + Math.abs(a[market] - b[market]), 0) / 2;
      worst = Math.min(worst, 1 - tvd);
    }
  }

  return clamp(worst, 0, 1);
}
