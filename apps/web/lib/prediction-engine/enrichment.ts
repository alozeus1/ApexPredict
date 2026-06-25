import type { FootballDataMatch, FootballDataStandingRow } from '@/lib/live-data/football-data';

export interface PredictionEnrichment {
  weather: {
    available: boolean;
    provider?: string;
    temperatureC?: number;
    windKph?: number;
    precipitationMm?: number;
    capturedAt?: string;
  };
  injuries: {
    available: boolean;
    provider?: string;
    homeUnavailable?: number;
    awayUnavailable?: number;
    capturedAt?: string;
  };
  referee: {
    available: boolean;
    provider?: string;
    name?: string;
    cardsPerMatch?: number;
    capturedAt?: string;
  };
  goals: {
    expectedHomeGoals: number;
    expectedAwayGoals: number;
    source: string;
  };
  cards: {
    expectedCards: number;
    source: string;
  };
}

function perGame(value: number | undefined, played: number | undefined, fallback: number) {
  if (value == null || !played) return fallback;
  return value / Math.max(1, played);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function buildBaselineEnrichment(
  _match: FootballDataMatch,
  homeStats: FootballDataStandingRow | undefined,
  awayStats: FootballDataStandingRow | undefined,
): PredictionEnrichment {
  const homeGoalsFor = perGame(homeStats?.goalsFor, homeStats?.playedGames, 1.25);
  const homeGoalsAgainst = perGame(homeStats?.goalsAgainst, homeStats?.playedGames, 1.25);
  const awayGoalsFor = perGame(awayStats?.goalsFor, awayStats?.playedGames, 1.15);
  const awayGoalsAgainst = perGame(awayStats?.goalsAgainst, awayStats?.playedGames, 1.35);

  return {
    weather: { available: false },
    injuries: { available: false },
    referee: { available: false },
    goals: {
      expectedHomeGoals: Number(clamp((homeGoalsFor * 0.58 + awayGoalsAgainst * 0.42) * 1.05, 0.35, 3.4).toFixed(3)),
      expectedAwayGoals: Number(clamp((awayGoalsFor * 0.58 + homeGoalsAgainst * 0.42) * 0.96, 0.25, 3.1).toFixed(3)),
      source: 'team-stat-baseline',
    },
    cards: {
      expectedCards: 4.2,
      source: 'league-baseline-pending-referee-provider',
    },
  };
}

export function enrichmentNarrative(enrichment: PredictionEnrichment) {
  const missing: string[] = [];
  if (!enrichment.weather.available) missing.push('weather');
  if (!enrichment.injuries.available) missing.push('injuries');
  if (!enrichment.referee.available) missing.push('referee');

  const goalNote = `Expected goals baseline ${enrichment.goals.expectedHomeGoals.toFixed(2)}-${enrichment.goals.expectedAwayGoals.toFixed(2)}.`;
  if (missing.length === 0) return goalNote;
  return `${goalNote} External ${missing.join(', ')} feeds are not yet connected, so those factors are excluded rather than guessed.`;
}
