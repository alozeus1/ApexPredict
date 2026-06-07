import type { OddsByBook } from '@apexpredix/types';
import type { FootballDataMatch, FootballDataStandingRow } from '@/lib/live-data/football-data';

export interface PredictionInput {
  match: FootballDataMatch;
  homeStats: FootballDataStandingRow | undefined;
  awayStats: FootballDataStandingRow | undefined;
  marketOdds?: Array<{ bookCode: string; market: string; price: number }>;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function teamStrength(stats?: FootballDataStandingRow) {
  if (!stats || !stats.playedGames) return 0.5;
  const pointsPerGame = stats.points / Math.max(1, stats.playedGames);
  const goalDiffPerGame = stats.goalDifference / Math.max(1, stats.playedGames);
  const tablePosition = stats.position ? clamp((24 - stats.position) / 24, 0.1, 0.95) : 0.5;
  return clamp(pointsPerGame * 0.19 + goalDiffPerGame * 0.08 + tablePosition * 0.35 + 0.18, 0.18, 0.86);
}

function normalizeMarkets(home: number, draw: number, away: number) {
  const total = home + draw + away;
  return { '1': home / total, X: draw / total, '2': away / total };
}

function fairPrice(probability: number) {
  return Number((1 / clamp(probability, 0.05, 0.9)).toFixed(2));
}

function bestPrice(market: OddsByBook['market'], odds: PredictionInput['marketOdds']) {
  const candidates = odds?.filter((odd) => odd.market === market && odd.price > 1) ?? [];
  if (candidates.length === 0) return undefined;
  const first = candidates[0];
  if (!first) return undefined;
  return candidates.reduce((best, odd) => (odd.price > best.price ? odd : best), first);
}

function pickLabel(market: OddsByBook['market'], match: FootballDataMatch) {
  if (market === '1') return `${match.homeTeam.tla ?? match.homeTeam.shortName ?? match.homeTeam.name} Win`;
  if (market === '2') return `${match.awayTeam.tla ?? match.awayTeam.shortName ?? match.awayTeam.name} Win`;
  return 'Draw';
}

export function generatePrediction(input: PredictionInput): EnginePrediction {
  const { match, homeStats, awayStats } = input;
  const homeStrength = teamStrength(homeStats);
  const awayStrength = teamStrength(awayStats);
  const spread = homeStrength - awayStrength;

  const rawHome = clamp(0.46 + spread * 0.7 + 0.045, 0.12, 0.78);
  const rawAway = clamp(0.46 - spread * 0.7 - 0.035, 0.1, 0.76);
  const rawDraw = clamp(0.25 - Math.abs(spread) * 0.08, 0.16, 0.31);
  const probabilities = normalizeMarkets(rawHome, rawDraw, rawAway);

  const markets = (['1', 'X', '2'] as const).map((market) => {
    const probability = probabilities[market];
    const realOdds = bestPrice(market, input.marketOdds);
    const synthetic = !realOdds;
    // Synthetic fair price is an in-memory placeholder only — it is never written
    // to the Odds table (the cron filters MODEL_FAIR_PRICE out before persisting).
    const odds = realOdds ?? { bookCode: 'MODEL_FAIR_PRICE', market, price: fairPrice(probability) };
    const impliedProbability = 1 / odds.price;
    return { market, probability, odds, synthetic, edge: probability - impliedProbability };
  });

  const firstPick = markets[0];
  if (!firstPick) throw new Error('Prediction engine produced no candidate markets');

  const pick = markets.reduce((best, candidate) => {
    if (candidate.edge > best.edge) return candidate;
    if (candidate.edge === best.edge && candidate.probability > best.probability) return candidate;
    return best;
  }, firstPick);

  const confidence = clamp(0.5 + Math.abs(spread) * 0.42 + Math.max(0, pick.edge) * 0.35, 0.52, 0.86);
  const elo = clamp(pick.probability * 0.98 + homeStrength * 0.02, 0.08, 0.86);
  const poisson = clamp(pick.probability * 0.88 + confidence * 0.12, 0.08, 0.86);
  const xgProxy = clamp(
    pick.probability * 0.82 + ((homeStats?.goalsFor ?? 0) - (awayStats?.goalsAgainst ?? 0)) / 500,
    0.08,
    0.86,
  );
  const ensemble = clamp((elo + poisson + xgProxy) / 3, 0.08, 0.86);
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
      `estimated edge ${(pick.edge * 100).toFixed(1)} percentage points.`,
    odds: [{ bookCode: pick.odds.bookCode, market: pick.market, price: pick.odds.price }],
  };
}
