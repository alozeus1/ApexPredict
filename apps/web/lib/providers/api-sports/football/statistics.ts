import type { ApiSportsClient } from '../client';
import { lifecycleOf, type FixtureLifecycle } from './fixtures';

/**
 * API-Sports `fixtures/statistics` — shot data for the xG model (gap #4).
 *
 * This is the feed that turns the xG signal from wired to live. Two endpoints:
 *   - `fixtures?team={id}&last={n}` → a team's most recent fixtures (one call).
 *   - `fixtures/statistics?fixture={id}` → both teams' per-match stats, including
 *     Total Shots, Shots on Goal, and (on covered leagues) `expected_goals`.
 *
 * The parsers are pure and unit-tested. The network + aggregation shape live in
 * `shot-source.ts`, which caches immutable settled-fixture stats so steady-state
 * quota cost is small.
 */

interface ApiSportsStatEntry {
  type: string;
  value: number | string | null;
}

interface ApiSportsStatisticsBlock {
  team: { id: number; name: string };
  statistics: ApiSportsStatEntry[];
}

interface ApiSportsFixtureListEntry {
  fixture: { id: number; status: { short: string } };
  teams: { home: { id: number }; away: { id: number } };
}

/** One team's shot line from a single fixture. */
export interface TeamFixtureShots {
  shots: number;
  shotsOnTarget: number;
  /** Provider expected goals, when the league is covered. Undefined otherwise. */
  xg?: number;
}

/**
 * Coerces an API-Sports stat value to a number. Values arrive as numbers, null,
 * or occasionally strings ("1.5", "45%"). A percentage or unparseable value is
 * not a shot count, so it returns undefined rather than a wrong number.
 */
export function statNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Extracts the shot line for one team from its statistics array. */
export function parseTeamShots(statistics: ApiSportsStatEntry[]): TeamFixtureShots | undefined {
  let shots: number | undefined;
  let sot: number | undefined;
  let xg: number | undefined;

  for (const entry of statistics) {
    const type = entry.type?.toLowerCase();
    if (type === 'total shots') shots = statNumber(entry.value);
    else if (type === 'shots on goal') sot = statNumber(entry.value);
    else if (type === 'expected_goals') xg = statNumber(entry.value);
  }

  // Total shots is the minimum viable signal. Without it there is no profile.
  if (shots === undefined) return undefined;
  // On-target cannot exceed total; a noisy feed is clamped rather than trusted.
  const boundedSot = Math.min(sot ?? 0, shots);
  return { shots, shotsOnTarget: boundedSot, ...(xg !== undefined ? { xg } : {}) };
}

/** Parses a `fixtures/statistics` response into per-team shot lines. */
export function parseFixtureStatistics(blocks: ApiSportsStatisticsBlock[]): Map<number, TeamFixtureShots> {
  const byTeam = new Map<number, TeamFixtureShots>();
  for (const block of blocks) {
    const line = parseTeamShots(block.statistics ?? []);
    if (line) byTeam.set(block.team.id, line);
  }
  return byTeam;
}

/** Fetches and parses shot statistics for one fixture (one API call). */
export async function fetchFixtureShotStats(
  client: ApiSportsClient,
  fixtureId: number,
): Promise<Map<number, TeamFixtureShots>> {
  const blocks = await client.get<ApiSportsStatisticsBlock>('fixtures/statistics', { fixture: fixtureId });
  return parseFixtureStatistics(blocks);
}

export interface RecentFixture {
  fixtureId: number;
  homeTeamId: number;
  awayTeamId: number;
  lifecycle: FixtureLifecycle;
}

/**
 * A team's most recent fixtures (one API call). Over-fetches by design: callers
 * ask for more than they need and keep only the SETTLED ones, since the last N
 * fixtures can include postponed or in-play games that carry no final stats.
 */
export async function fetchTeamRecentFixtures(
  client: ApiSportsClient,
  teamId: number,
  last: number,
): Promise<RecentFixture[]> {
  const raw = await client.get<ApiSportsFixtureListEntry>('fixtures', { team: teamId, last });
  return raw.map((entry) => ({
    fixtureId: entry.fixture.id,
    homeTeamId: entry.teams.home.id,
    awayTeamId: entry.teams.away.id,
    lifecycle: lifecycleOf(entry.fixture.status.short),
  }));
}

// ── Aggregation (pure) ────────────────────────────────────────────────────────

/** A single fixture's shot lines from the target team's perspective. */
export interface ShotLinePair {
  teamShots: number;
  teamSot: number;
  oppShots: number;
  oppSot: number;
  teamXg?: number;
  oppXg?: number;
}

export interface AggregatedShotProfile {
  shotsForPerGame: number;
  shotsOnTargetForPerGame: number;
  shotsAgainstPerGame: number;
  shotsOnTargetAgainstPerGame: number;
  xgForPerGame?: number;
  xgAgainstPerGame?: number;
  sampleSize: number;
}

const average = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);

/**
 * Averages per-fixture shot lines into a team profile.
 *
 * xG is included ONLY when every counted fixture carried a provider xG for both
 * sides — a profile that mixes real xG and gaps would misstate the average, so
 * partial xG coverage falls back to the shots-based path (xG omitted) rather
 * than averaging over an inconsistent denominator.
 */
export function aggregateShotProfile(lines: ShotLinePair[]): AggregatedShotProfile {
  const sampleSize = lines.length;
  const allHaveXg =
    sampleSize > 0 && lines.every((l) => typeof l.teamXg === 'number' && typeof l.oppXg === 'number');

  return {
    shotsForPerGame: average(lines.map((l) => l.teamShots)),
    shotsOnTargetForPerGame: average(lines.map((l) => l.teamSot)),
    shotsAgainstPerGame: average(lines.map((l) => l.oppShots)),
    shotsOnTargetAgainstPerGame: average(lines.map((l) => l.oppSot)),
    ...(allHaveXg ? { xgForPerGame: average(lines.map((l) => l.teamXg as number)) } : {}),
    ...(allHaveXg ? { xgAgainstPerGame: average(lines.map((l) => l.oppXg as number)) } : {}),
    sampleSize,
  };
}
