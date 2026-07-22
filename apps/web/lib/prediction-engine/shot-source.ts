import { kv } from '@vercel/kv';
import * as Sentry from '@sentry/nextjs';
import type { ApiSportsClient } from '@/lib/providers/api-sports/client';
import { ApiSportsQuotaError } from '@/lib/providers/api-sports/client';
import {
  fetchTeamRecentFixtures,
  fetchFixtureShotStats,
  aggregateShotProfile,
  type ShotLinePair,
  type TeamFixtureShots,
} from '@/lib/providers/api-sports/football/statistics';
import type { TeamShotProfile } from './xg';

/**
 * Builds `TeamShotProfile`s from API-Sports for the xG model (gap #4 activation).
 *
 * Cost control is the whole design:
 *   - Settled-fixture statistics are IMMUTABLE, so each is fetched once and
 *     cached in KV forever. A fixture stays in a team's "last N" for weeks, so
 *     steady-state cost is a handful of new fixtures per team per week, not N
 *     calls every run.
 *   - A hard per-run CALL BUDGET caps how much of the daily quota one refresh can
 *     spend. When it is hit, remaining teams simply return undefined (xG stays
 *     weight-0 for them this run) and fill in over subsequent runs as the cache
 *     warms — a cold start spreads across days instead of draining the quota in
 *     one run.
 *   - The client's own quota guard is the backstop; a thrown quota error stops
 *     the source cleanly rather than propagating into the refresh.
 */

const CACHE_PREFIX = 'xg:fixstat:';
// Settled stats never change; cache for a long time. Kept finite so a one-off
// bad cache entry self-heals rather than persisting indefinitely.
const CACHE_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 days

type CachedStats = Record<string, TeamFixtureShots>;

export interface ShotSourceOptions {
  /** Recent settled fixtures to average per team. */
  games?: number;
  /** Max API calls this source may spend in one run (across all teams). */
  callBudget?: number;
}

export class ApiSportsShotSource {
  private readonly client: ApiSportsClient;
  private readonly games: number;
  private readonly callBudget: number;
  private callsUsed = 0;

  constructor(client: ApiSportsClient, options: ShotSourceOptions = {}) {
    this.client = client;
    this.games = options.games ?? Number(process.env.XG_SHOTS_GAMES ?? 6);
    this.callBudget = options.callBudget ?? Number(process.env.XG_SHOTS_CALL_BUDGET ?? 250);
  }

  /** True while the per-run budget has headroom. */
  private hasBudget(): boolean {
    return this.callsUsed < this.callBudget;
  }

  private async cachedFixtureStats(fixtureId: number): Promise<Map<number, TeamFixtureShots> | null> {
    try {
      const hit = await kv.get<CachedStats>(`${CACHE_PREFIX}${fixtureId}`);
      if (!hit) return null;
      return new Map(Object.entries(hit).map(([id, line]) => [Number(id), line]));
    } catch {
      return null; // a cache read failure must never block the fetch path
    }
  }

  private async fetchAndCacheFixtureStats(fixtureId: number): Promise<Map<number, TeamFixtureShots>> {
    const stats = await fetchFixtureShotStats(this.client, fixtureId);
    this.callsUsed += 1;
    try {
      const serialisable: CachedStats = {};
      for (const [id, line] of stats) serialisable[String(id)] = line;
      await kv.set(`${CACHE_PREFIX}${fixtureId}`, serialisable, { ex: CACHE_TTL_SECONDS });
    } catch {
      // Caching is best-effort; a write failure just means we refetch next time.
    }
    return stats;
  }

  /**
   * Builds a shot profile for one API-Sports team id, or undefined when the data
   * or budget is unavailable. Never throws into the caller — a provider fault
   * degrades to "no xG for this fixture", the honest fallback.
   */
  async buildProfile(apiTeamId: number): Promise<TeamShotProfile | undefined> {
    if (!this.client.configured() || !this.hasBudget()) return undefined;

    try {
      // One call to list the team's recent fixtures.
      const recent = await fetchTeamRecentFixtures(this.client, apiTeamId, this.games + 4);
      this.callsUsed += 1;
      const settled = recent.filter((fx) => fx.lifecycle === 'SETTLED').slice(0, this.games);

      const lines: ShotLinePair[] = [];
      for (const fixture of settled) {
        const opponentId = fixture.homeTeamId === apiTeamId ? fixture.awayTeamId : fixture.homeTeamId;

        let stats = await this.cachedFixtureStats(fixture.fixtureId);
        if (!stats) {
          if (!this.hasBudget()) break; // out of budget mid-team: keep what we have
          stats = await this.fetchAndCacheFixtureStats(fixture.fixtureId);
        }

        const teamLine = stats.get(apiTeamId);
        const oppLine = stats.get(opponentId);
        if (!teamLine || !oppLine) continue; // incomplete fixture — skip, don't guess

        lines.push({
          teamShots: teamLine.shots,
          teamSot: teamLine.shotsOnTarget,
          oppShots: oppLine.shots,
          oppSot: oppLine.shotsOnTarget,
          ...(teamLine.xg !== undefined ? { teamXg: teamLine.xg } : {}),
          ...(oppLine.xg !== undefined ? { oppXg: oppLine.xg } : {}),
        });
      }

      if (lines.length === 0) return undefined;
      const profile = aggregateShotProfile(lines);
      return profile as TeamShotProfile;
    } catch (error) {
      if (!(error instanceof ApiSportsQuotaError)) {
        Sentry.captureException(error, { tags: { area: 'xg.shot-source', team: String(apiTeamId) } });
      }
      return undefined;
    }
  }
}

/**
 * Constructs the shot source for a run, or null when API-Sports is not
 * configured. One instance PER RUN so its call counter — and the client's quota
 * guard — accumulate across every fixture instead of resetting each time.
 */
export function createApiSportsShotSource(client: ApiSportsClient): ApiSportsShotSource | null {
  return client.configured() ? new ApiSportsShotSource(client) : null;
}
