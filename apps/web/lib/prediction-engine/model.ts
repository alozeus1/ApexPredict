import type { OddsByBook } from '@apexpredix/types';
import type { FootballDataMatch, FootballDataStandingRow } from '@/lib/live-data/football-data';

export interface PredictionInput {
  match: FootballDataMatch;
  homeStats: FootballDataStandingRow | undefined;
  awayStats: FootballDataStandingRow | undefined;
  marketOdds?: Array<{ bookCode: string; market: string; price: number }>;
  /** Outcome shape of the competition. Defaults to football's 1/X/2. */
  marketType?: OutcomeMarketType;
}

export interface EnginePrediction {
  market: OddsByBook['market'];
  probability: number;
  edge: number;
  elo: number;
  poisson: number;
  xg: number;
  ensemble: number;
  confidence: number;
  topPick: string;
  valueBet: boolean;
  narrative: string;
  odds: OddsByBook[];
}

export type PredictionMarket = Extract<OddsByBook['market'], '1' | 'X' | '2'>;

/**
 * Outcome shape of a competition. Mirrors the `MarketType` enum in the Prisma
 * schema — only the outcome-market variants the engine currently scores.
 *
 * Basketball, tennis, NFL, baseball and hockey moneylines have no draw, so the
 * engine cannot assume a three-slot outcome space.
 */
export type OutcomeMarketType = 'MONEYLINE_3WAY' | 'MONEYLINE_2WAY';

const MARKET_SETS: Record<OutcomeMarketType, readonly PredictionMarket[]> = {
  MONEYLINE_3WAY: ['1', 'X', '2'],
  MONEYLINE_2WAY: ['1', '2'],
};

export const DEFAULT_MARKET_TYPE: OutcomeMarketType = 'MONEYLINE_3WAY';

/** The active outcome markets for a competition's market shape. */
export function marketsFor(marketType: OutcomeMarketType = DEFAULT_MARKET_TYPE): readonly PredictionMarket[] {
  return MARKET_SETS[marketType];
}

export function hasDraw(marketType: OutcomeMarketType = DEFAULT_MARKET_TYPE): boolean {
  return marketsFor(marketType).includes('X');
}

export interface PredictionCandidate {
  market: PredictionMarket;
  probability: number;
  odds: { bookCode: string; market: PredictionMarket; price: number };
  synthetic: boolean;
  edge: number;
}

export interface PredictionContext {
  homeStrength: number;
  awayStrength: number;
  spread: number;
  marketType: OutcomeMarketType;
  markets: PredictionCandidate[];
}

export interface PredictionSignalBlend {
  elo?: number;
  poisson?: number;
  xg?: number;
  ensemble?: number;
  confidence?: number;
  narrativeSuffix?: string;
}

/** A full probability distribution over the 1X2 outcome space. Always sums to 1. */
export type MarketDistribution = Record<PredictionMarket, number>;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Recent-form score in [0,1] from the provider `form` string (e.g. "W,D,L,W,W"
 * or "WDLWW"), most recent result first. Exponentially decayed so the last
 * match matters more than the fifth-last.
 *
 * Returns undefined when no parsable form exists — callers must fall back to
 * season-to-date figures rather than assume neutral form.
 */
export function recentFormScore(form?: string): number | undefined {
  if (!form) return undefined;
  const results = form
    .toUpperCase()
    .replace(/[^WDL]/g, '')
    .split('')
    .slice(0, 6);
  if (results.length === 0) return undefined;

  const DECAY = 0.82;
  let weighted = 0;
  let weightTotal = 0;
  results.forEach((result, index) => {
    const weight = DECAY ** index;
    const value = result === 'W' ? 1 : result === 'D' ? 0.5 : 0;
    weighted += value * weight;
    weightTotal += weight;
  });

  return weightTotal > 0 ? weighted / weightTotal : undefined;
}

/**
 * Team strength in [0.18, 0.86].
 *
 * Season-to-date table figures are cumulative, so on their own they lag badly:
 * a team on a six-match losing streak in April still reads as strong. Recent
 * form is blended in when the provider supplies it.
 */
export function teamStrength(stats?: FootballDataStandingRow) {
  if (!stats || !stats.playedGames) return 0.5;
  const pointsPerGame = stats.points / Math.max(1, stats.playedGames);
  const goalDiffPerGame = stats.goalDifference / Math.max(1, stats.playedGames);
  const tablePosition = stats.position ? clamp((24 - stats.position) / 24, 0.1, 0.95) : 0.5;
  const seasonal = pointsPerGame * 0.19 + goalDiffPerGame * 0.08 + tablePosition * 0.35 + 0.18;

  const form = recentFormScore(stats.form);
  const blended = form === undefined ? seasonal : seasonal * 0.75 + form * 0.25;

  return clamp(blended, 0.18, 0.86);
}

/**
 * Normalises a raw home/draw/away triple into a valid distribution.
 *
 * For two-way markets the draw slot is pinned to exactly 0 and the remaining
 * mass is normalised over home/away, so a distribution always sums to 1 over
 * the markets that actually exist for that sport.
 */
export function toDistribution(
  home: number,
  draw: number,
  away: number,
  marketType: OutcomeMarketType = DEFAULT_MARKET_TYPE,
): MarketDistribution {
  const drawn = hasDraw(marketType) ? Math.max(draw, 0.0001) : 0;
  const safeHome = Math.max(home, 0.0001);
  const safeAway = Math.max(away, 0.0001);
  const total = safeHome + drawn + safeAway;

  return { '1': safeHome / total, X: drawn / total, '2': safeAway / total };
}

export function normalizeMarkets(home: number, draw: number, away: number) {
  const total = home + draw + away;
  return { '1': home / total, X: draw / total, '2': away / total };
}

export function fairPrice(probability: number) {
  return Number((1 / clamp(probability, 0.05, 0.9)).toFixed(2));
}

export function bestPrice(market: OddsByBook['market'], odds: PredictionInput['marketOdds']) {
  const candidates = odds?.filter((odd) => odd.market === market && odd.price > 1) ?? [];
  if (candidates.length === 0) return undefined;
  const first = candidates[0];
  if (!first) return undefined;
  return candidates.reduce((best, odd) => (odd.price > best.price ? odd : best), first);
}

export function pickLabel(market: OddsByBook['market'], match: FootballDataMatch) {
  if (market === '1') return `${match.homeTeam.tla ?? match.homeTeam.shortName ?? match.homeTeam.name} Win`;
  if (market === '2') return `${match.awayTeam.tla ?? match.awayTeam.shortName ?? match.awayTeam.name} Win`;
  return 'Draw';
}

/**
 * Builds the candidate market set.
 *
 * `distributionOverride` lets the agent graph supply its ensembled probability
 * distribution so the ensemble actually drives the selected pick. Without it,
 * the deterministic single-signal heuristic is used — this is the fallback path
 * and must keep working when the graph throws.
 */
export function buildPredictionContext(
  input: PredictionInput,
  distributionOverride?: MarketDistribution,
  marketType: OutcomeMarketType = input.marketType ?? DEFAULT_MARKET_TYPE,
): PredictionContext {
  const { homeStats, awayStats } = input;
  const homeStrength = teamStrength(homeStats);
  const awayStrength = teamStrength(awayStats);
  const spread = homeStrength - awayStrength;

  const rawHome = clamp(0.46 + spread * 0.7 + 0.045, 0.12, 0.78);
  const rawAway = clamp(0.46 - spread * 0.7 - 0.035, 0.1, 0.76);
  const rawDraw = clamp(0.25 - Math.abs(spread) * 0.08, 0.16, 0.31);
  const probabilities = distributionOverride ?? toDistribution(rawHome, rawDraw, rawAway, marketType);

  // Only the markets that exist for this sport become candidates. A two-way
  // sport must never be able to surface a Draw pick.
  const markets = marketsFor(marketType).map((market) => {
    const probability = probabilities[market];
    const realOdds = bestPrice(market, input.marketOdds);
    const synthetic = !realOdds;
    // Synthetic fair price is an in-memory placeholder only — it is never written
    // to the Odds table (the cron filters MODEL_FAIR_PRICE out before persisting).
    const odds = realOdds
      ? { bookCode: realOdds.bookCode, market, price: realOdds.price }
      : { bookCode: 'MODEL_FAIR_PRICE', market, price: fairPrice(probability) };

    // Edge only exists against a real market price. The synthetic fair price is
    // derived from `probability` itself and rounded to 2dp, so subtracting its
    // implied probability produced pure rounding noise (~1e-4) — noise that was
    // then used to rank candidates. Synthetic candidates therefore carry zero
    // edge by definition.
    const edge = synthetic ? 0 : probability - 1 / odds.price;
    return { market, probability, odds, synthetic, edge };
  });

  return { homeStrength, awayStrength, spread, marketType, markets };
}

/**
 * Selects the pick from a candidate set.
 *
 * Ranking by edge is only valid where a real bookmaker price exists. When no
 * candidate has real odds, every edge is zero and the model must fall back to
 * its own probability — otherwise the pick is decided by arbitrary tie-breaks.
 *
 * This previously ranked purely by edge, which meant that on any fixture
 * without live odds the 2dp rounding of the synthetic price chose the pick,
 * systematically favouring mid-probability outcomes over high-probability ones.
 */
export function selectPick(markets: PredictionCandidate[]): PredictionCandidate {
  const firstCandidate = markets[0];
  if (!firstCandidate) throw new Error('Prediction engine produced no candidate markets');

  const priced = markets.filter((candidate) => !candidate.synthetic);
  const pool = priced.length > 0 ? priced : markets;
  const rankByEdge = priced.length > 0;
  const first = pool[0] as PredictionCandidate;

  return pool.reduce((best, candidate) => {
    if (rankByEdge) {
      if (candidate.edge > best.edge) return candidate;
      if (candidate.edge === best.edge && candidate.probability > best.probability) return candidate;
      return best;
    }
    return candidate.probability > best.probability ? candidate : best;
  }, first);
}

export function assemblePrediction(
  input: PredictionInput,
  context = buildPredictionContext(input),
  signalBlend: PredictionSignalBlend = {},
): EnginePrediction {
  const { match, homeStats, awayStats } = input;
  const { markets, homeStrength, spread } = context;
  const pick = selectPick(markets);

  const confidence =
    signalBlend.confidence ?? clamp(0.5 + Math.abs(spread) * 0.42 + Math.max(0, pick.edge) * 0.35, 0.52, 0.86);
  const elo = signalBlend.elo ?? clamp(pick.probability * 0.98 + homeStrength * 0.02, 0.08, 0.86);
  const poisson = signalBlend.poisson ?? clamp(pick.probability * 0.88 + confidence * 0.12, 0.08, 0.86);
  const xgProxy = signalBlend.xg ?? clamp(
    pick.probability * 0.82 + ((homeStats?.goalsFor ?? 0) - (awayStats?.goalsAgainst ?? 0)) / 500,
    0.08,
    0.86,
  );
  const ensemble = signalBlend.ensemble ?? clamp((elo + poisson + xgProxy) / 3, 0.08, 0.86);
  const topPick = pickLabel(pick.market, match);
  // No value claim without a real market price — synthetic odds cannot be a value bet.
  const valueBet = !pick.synthetic && pick.edge >= 0.03 && confidence >= 0.58;

  return {
    market: pick.market,
    probability: pick.probability,
    edge: pick.edge,
    elo,
    poisson,
    xg: xgProxy,
    ensemble,
    confidence,
    topPick,
    valueBet,
    narrative:
      `${topPick} is the current model side after blending table position, points pace, goal difference, ` +
      `home edge, and market-implied probability. Model probability ${(pick.probability * 100).toFixed(1)}%; ` +
      `estimated edge ${(pick.edge * 100).toFixed(1)} percentage points.` +
      (signalBlend.narrativeSuffix ? ` ${signalBlend.narrativeSuffix}` : ''),
    odds: [{ bookCode: pick.odds.bookCode, market: pick.market, price: pick.odds.price }],
  };
}

export function generatePrediction(input: PredictionInput): EnginePrediction {
  return assemblePrediction(input);
}
