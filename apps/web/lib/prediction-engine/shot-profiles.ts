import type { TeamShotProfile } from './xg';

/**
 * Shot-profile source for the xG model (gap #4 activation seam).
 *
 * The live prediction path currently ingests standings/fixtures from
 * football-data.org, which carries NO shot data. Real shots-based xG therefore
 * needs a shot-statistics feed — API-Sports `fixtures/statistics` aggregated per
 * team over a recent window, or a positional provider. That fetch is quota-
 * sensitive (one call per team per window) and is deliberately kept as a single,
 * explicit integration point here rather than scattered through the cron.
 *
 * Until that fetch is implemented, this returns undefined profiles, so
 * `shotsEnrichment(...)` yields an `available: false` block and the xg-agent
 * stays honestly at weight 0. When the fetch lands, populate `home`/`away` and
 * xG activates with no other change — the orchestrator already consumes it.
 */

export interface TeamShotProfiles {
  home?: TeamShotProfile;
  away?: TeamShotProfile;
}

export interface ShotProfileLookup {
  homeExternalId: number;
  awayExternalId: number;
  /** As-of date; a real source fetches each team's last N games before this. */
  asOf: Date;
  games?: number;
}

/**
 * Resolves shot profiles for a fixture. Replace the body with an API-Sports
 * `fixtures/statistics` aggregation (respecting the quota guard) or a positional
 * feed. Must return `undefined` for a team rather than a guessed profile when
 * data is unavailable — an invented shot rate is exactly the fabricated signal
 * the honest weight-0 fallback exists to prevent.
 */
export async function buildTeamShotProfiles(_lookup: ShotProfileLookup): Promise<TeamShotProfiles> {
  // No shot-statistics source connected yet — see module docstring. Both keys
  // are optional and omitted (not set to undefined) to satisfy exactOptionalPropertyTypes.
  return {};
}
