import type { ApiSportsClient } from '../client';

interface ApiSportsFixtureResponse {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: { short: string; long: string; elapsed: number | null };
    venue?: { id: number | null; name: string | null; city: string | null };
  };
  league: { id: number; season: number; round: string | null };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

/**
 * Fixture lifecycle, as API-Sports reports it.
 *
 * `SETTLED` is deliberately narrower than "has a score". A match can carry
 * goals while abandoned or suspended, and treating those as settled would feed
 * the model an outcome that was never officially reached.
 */
export type FixtureLifecycle = 'SCHEDULED' | 'IN_PLAY' | 'SETTLED' | 'VOID' | 'UNKNOWN';

/** Regulation finish, extra time, and penalties. All are official results. */
const SETTLED_STATUSES = new Set(['FT', 'AET', 'PEN']);
/** Officially not played, or abandoned before a result stood. */
const VOID_STATUSES = new Set(['PST', 'CANC', 'ABD', 'AWD', 'WO', 'SUSP', 'INT']);
const SCHEDULED_STATUSES = new Set(['TBD', 'NS']);
const IN_PLAY_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);

export function lifecycleOf(status: string): FixtureLifecycle {
  if (SETTLED_STATUSES.has(status)) return 'SETTLED';
  if (VOID_STATUSES.has(status)) return 'VOID';
  if (SCHEDULED_STATUSES.has(status)) return 'SCHEDULED';
  if (IN_PLAY_STATUSES.has(status)) return 'IN_PLAY';
  // An unrecognised status must not be guessed into a bucket. Callers skip
  // UNKNOWN and record it, so a new provider status shows up as a gap rather
  // than silently settling or silently vanishing.
  return 'UNKNOWN';
}

export interface ApiSportsFixture {
  id: number;
  leagueId: number;
  season: number;
  round: string | null;
  kickoff: Date;
  status: string;
  lifecycle: FixtureLifecycle;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  /**
   * Score after 90 minutes. This is what settles 1X2, Over/Under and BTTS —
   * standard settlement rules disregard extra time and penalties.
   *
   * Null when the match has not reached full time. NOT defaulted to 0-0: a
   * goalless draw and an unplayed match are different facts.
   */
  regulationScore: { home: number; away: number } | null;
  /**
   * Final score including extra time (but not penalties), when played.
   * Recorded for reporting; must NOT be used to settle regulation markets.
   */
  finalScore: { home: number; away: number } | null;
  /** Shootout score when the tie went to penalties, else null. */
  penaltyScore: { home: number; away: number } | null;
}

function pair(
  value: { home: number | null; away: number | null } | undefined,
): { home: number; away: number } | null {
  if (!value || value.home === null || value.away === null) return null;
  return { home: value.home, away: value.away };
}

function map(entry: ApiSportsFixtureResponse): ApiSportsFixture {
  const status = entry.fixture.status.short;
  const lifecycle = lifecycleOf(status);
  const regulation = pair(entry.score.fulltime);
  const extra = pair(entry.score.extratime);

  return {
    id: entry.fixture.id,
    leagueId: entry.league.id,
    season: entry.league.season,
    round: entry.league.round ?? null,
    kickoff: new Date(entry.fixture.date),
    status,
    lifecycle,
    homeTeamId: entry.teams.home.id,
    homeTeamName: entry.teams.home.name,
    awayTeamId: entry.teams.away.id,
    awayTeamName: entry.teams.away.name,
    // Only a settled match has a regulation result. An abandoned match may
    // carry a fulltime score in the payload; it does not settle anything.
    regulationScore: lifecycle === 'SETTLED' ? regulation : null,
    finalScore:
      lifecycle === 'SETTLED'
        ? extra
          ? { home: (regulation?.home ?? 0) + extra.home, away: (regulation?.away ?? 0) + extra.away }
          : regulation
        : null,
    penaltyScore: lifecycle === 'SETTLED' ? pair(entry.score.penalty) : null,
  };
}

/**
 * Fixtures for a league season, optionally bounded by date.
 *
 * `from`/`to` are inclusive `YYYY-MM-DD` in the league's own timezone as
 * API-Sports interprets them, so callers should over-fetch by a day either side
 * rather than assume UTC alignment.
 */
export async function fetchFixtures(
  client: ApiSportsClient,
  params: { league: number; season: number; from?: string; to?: string; status?: string },
): Promise<ApiSportsFixture[]> {
  const raw = await client.get<ApiSportsFixtureResponse>('fixtures', {
    league: params.league,
    season: params.season,
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(params.status ? { status: params.status } : {}),
  });

  return raw.map(map);
}

/** Fixtures by provider fixture id. Used to re-check specific matches. */
export async function fetchFixturesByIds(
  client: ApiSportsClient,
  ids: number[],
): Promise<ApiSportsFixture[]> {
  if (ids.length === 0) return [];
  // API-Sports caps the `ids` parameter at 20 per call.
  const out: ApiSportsFixture[] = [];
  for (let index = 0; index < ids.length; index += 20) {
    const raw = await client.get<ApiSportsFixtureResponse>('fixtures', {
      ids: ids.slice(index, index + 20).join('-'),
    });
    out.push(...raw.map(map));
  }
  return out;
}

/** `YYYY-MM-DD` in UTC, the format API-Sports expects for from/to. */
export function apiDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
