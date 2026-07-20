import type { ApiSportsClient } from '../client';

/**
 * League + coverage lookup.
 *
 * API-Sports publishes a per-league-season `coverage` object stating which
 * features actually exist for that competition. Coverage is materially thinner
 * for NPFL and CAF competitions than for the top five European leagues, so this
 * must be checked BEFORE scheduling injury/lineup calls — otherwise quota is
 * spent discovering that data does not exist.
 */

export interface ApiSportsCoverage {
  fixtures: {
    events: boolean;
    lineups: boolean;
    statistics_fixtures: boolean;
    statistics_players: boolean;
  };
  standings: boolean;
  players: boolean;
  top_scorers: boolean;
  top_assists: boolean;
  top_cards: boolean;
  injuries: boolean;
  predictions: boolean;
  odds: boolean;
}

interface ApiSportsLeagueResponse {
  league: { id: number; name: string; type: string; logo?: string };
  country: { name: string; code: string | null; flag: string | null };
  seasons: Array<{ year: number; start: string; end: string; current: boolean; coverage: ApiSportsCoverage }>;
}

export interface LeagueCoverage {
  leagueId: number;
  leagueName: string;
  country: string;
  season: number;
  coverage: ApiSportsCoverage;
  /** Season start date as reported by the provider, if present. */
  seasonStart?: string;
  /**
   * True when the season has not begun yet.
   *
   * Coverage flags describe what EXISTS for that season, so an unstarted season
   * legitimately reports no lineups or statistics. Treating that as a permanent
   * provider gap would wrongly disqualify a league.
   */
  seasonNotStarted: boolean;
}

/** Feature slots the prediction engine actually consumes. */
export type CoverageFeature = 'injuries' | 'lineups' | 'fixtureStats' | 'playerStats' | 'standings' | 'odds';

export function supportsFeature(coverage: ApiSportsCoverage, feature: CoverageFeature): boolean {
  switch (feature) {
    case 'injuries':
      return coverage.injuries;
    case 'lineups':
      return coverage.fixtures.lineups;
    case 'fixtureStats':
      return coverage.fixtures.statistics_fixtures;
    case 'playerStats':
      return coverage.fixtures.statistics_players;
    case 'standings':
      return coverage.standings;
    case 'odds':
      return coverage.odds;
    default:
      return false;
  }
}

/** Features missing for a league — recorded as unavailable, never guessed. */
export function missingFeatures(coverage: ApiSportsCoverage, required: CoverageFeature[]): CoverageFeature[] {
  return required.filter((feature) => !supportsFeature(coverage, feature));
}

/**
 * Football-Data competition codes → API-Sports search terms.
 *
 * Our `Competition.name` rows store Football-Data CODES (`PL`, `SA`, `WC`),
 * not league names. API-Sports `/leagues?search=` requires at least 3
 * characters and matches on names, so passing the code returns either a 400 or
 * the wrong league. `SA` would also collide with unrelated competitions.
 */
const COMPETITION_SEARCH: Record<string, { search: string; country?: string }> = {
  PL: { search: 'Premier League', country: 'England' },
  // Some rows store the full name rather than the Football-Data code.
  'CAMPEONATO BRASILEIRO SÉRIE A': { search: 'Serie A', country: 'Brazil' },
  'CAMPEONATO BRASILEIRO SERIE A': { search: 'Serie A', country: 'Brazil' },
  'PRIMEIRA LIGA': { search: 'Primeira Liga', country: 'Portugal' },
  EREDIVISIE: { search: 'Eredivisie', country: 'Netherlands' },
  PD: { search: 'La Liga', country: 'Spain' },
  BL1: { search: 'Bundesliga', country: 'Germany' },
  SA: { search: 'Serie A', country: 'Italy' },
  FL1: { search: 'Ligue 1', country: 'France' },
  CL: { search: 'UEFA Champions League', country: 'World' },
  BSA: { search: 'Serie A', country: 'Brazil' },
  WC: { search: 'World Cup', country: 'World' },
};

/** Resolves a stored competition name/code into a usable API-Sports query. */
export function searchTermFor(competitionName: string): { search: string; country?: string } | undefined {
  const direct = COMPETITION_SEARCH[competitionName.trim().toUpperCase()];
  if (direct) return direct;

  // Not a known code — fall back to the stored name if it is long enough to search.
  const trimmed = competitionName.trim();
  return trimmed.length >= 3 ? { search: trimmed } : undefined;
}

/**
 * Fetches leagues and their per-season coverage.
 *
 * **`search` is mutually exclusive with every other filter on this endpoint.**
 * API-Sports rejects `search`+`season` AND `search`+`country` with an HTTP 200
 * carrying an `errors` object. So when a search term is supplied it is sent
 * ALONE, and `country`/`season` are applied client-side to the response.
 *
 * The alternative — discovering each incompatible pair by trial and error —
 * costs a request and a round trip per attempt.
 */
export async function fetchLeagues(
  client: ApiSportsClient,
  params: { search?: string; country?: string; season?: number } = {},
): Promise<LeagueCoverage[]> {
  const search = params.search?.trim();
  const useSearch = Boolean(search);

  // Below the provider's minimum; a request would only return a 400.
  if (useSearch && (search as string).length < 3) return [];

  const query = useSearch
    ? { search }
    : {
        ...(params.country ? { country: params.country } : {}),
        ...(params.season ? { season: params.season } : {}),
      };

  const raw = await client.get<ApiSportsLeagueResponse>('leagues', query);

  const output: LeagueCoverage[] = [];
  for (const entry of raw) {
    // Client-side country filter — cannot be pushed to the API alongside search.
    if (useSearch && params.country && entry.country.name.toLowerCase() !== params.country.toLowerCase()) {
      continue;
    }

    // Prefer the requested season, else the current one, else the most recent.
    const season =
      entry.seasons.find((candidate) => (params.season ? candidate.year === params.season : candidate.current)) ??
      entry.seasons[entry.seasons.length - 1];
    if (!season) continue;

    const start = season.start ? new Date(season.start) : undefined;
    output.push({
      leagueId: entry.league.id,
      leagueName: entry.league.name,
      country: entry.country.name,
      season: season.year,
      coverage: season.coverage,
      ...(season.start ? { seasonStart: season.start } : {}),
      seasonNotStarted: Boolean(start && !Number.isNaN(start.getTime()) && start.getTime() > Date.now()),
    });
  }

  return output;
}
