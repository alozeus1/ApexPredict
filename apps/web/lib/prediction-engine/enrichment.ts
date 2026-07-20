import type { FootballDataMatch, FootballDataStandingRow } from '@/lib/live-data/football-data';
import { fetchOpenMeteoWeather, type WeatherContext } from '@/lib/providers/enrichment/weather';

export interface PredictionEnrichment {
  weather: WeatherContext;
  injuries: {
    available: boolean;
    provider?: string;
    reason?: string;
    homeUnavailable?: number;
    awayUnavailable?: number;
    capturedAt?: string;
  };
  referee: {
    available: boolean;
    provider?: string;
    reason?: string;
    name?: string;
    cardsPerMatch?: number;
    capturedAt?: string;
  };
  lineups: {
    available: boolean;
    provider?: string;
    reason?: string;
    homeConfirmed?: boolean;
    awayConfirmed?: boolean;
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
    weather: { available: false, provider: 'open-meteo', reason: 'venue-coordinates-not-configured' },
    injuries: { available: false, reason: 'injury-provider-not-configured' },
    referee: { available: false, reason: 'referee-provider-not-configured' },
    lineups: { available: false, reason: 'lineup-provider-not-configured' },
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

export async function buildFixtureEnrichment(
  match: FootballDataMatch,
  homeStats: FootballDataStandingRow | undefined,
  awayStats: FootballDataStandingRow | undefined,
): Promise<PredictionEnrichment> {
  const baseline = buildBaselineEnrichment(match, homeStats, awayStats);
  const weather = await fetchOpenMeteoWeather(match).catch(() => ({
    available: false,
    provider: 'open-meteo',
    reason: 'open-meteo-fetch-failed',
  }));

  return { ...baseline, weather };
}

export function enrichmentNarrative(enrichment: PredictionEnrichment) {
  const missing: string[] = [];
  if (!enrichment.weather.available) missing.push('weather');
  if (!enrichment.injuries.available) missing.push('injuries');
  if (!enrichment.referee.available) missing.push('referee');
  if (!enrichment.lineups.available) missing.push('lineups');

  const goalNote = `Expected goals baseline ${enrichment.goals.expectedHomeGoals.toFixed(2)}-${enrichment.goals.expectedAwayGoals.toFixed(2)}.`;
  if (missing.length === 0) return goalNote;
  return `${goalNote} External ${missing.join(', ')} feeds are not yet connected, so those factors are excluded rather than guessed.`;
}
