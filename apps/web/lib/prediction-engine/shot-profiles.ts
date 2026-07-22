import type { PrismaClient } from '@apexpredix/db';
import { resolveProviderId } from '@/lib/providers/mapping/resolve';
import type { ApiSportsShotSource } from './shot-source';
import type { TeamShotProfile } from './xg';

/**
 * Shot-profile resolution for the xG model (gap #4).
 *
 * The live prediction path uses football-data.org IDs; API-Sports uses its own.
 * This bridges them through the `ProviderEntityMap` (the same table injuries and
 * odds resolve through), then delegates the quota-managed fetch to the shot
 * source. A team resolves only when it is mapped to API-Sports; unmapped or
 * low-confidence teams return no profile, so `shotsEnrichment` stays honestly
 * "unavailable" and the xg-agent stays weight-0 rather than scoring off a
 * possibly-wrong team.
 */

const API_SPORTS_PROVIDER = 'api-sports';

/** Auto-matched mappings are trusted for shots only at/above this confidence. */
const MIN_MAPPING_CONFIDENCE = Number(process.env.XG_MIN_MAPPING_CONFIDENCE ?? 0.9);
/** Set true to require a human-verified mapping (strictest; xG waits for verification). */
const REQUIRE_VERIFIED = process.env.XG_REQUIRE_VERIFIED_MAPPING === 'true';

export interface TeamShotProfiles {
  home?: TeamShotProfile;
  away?: TeamShotProfile;
}

export interface ShotProfileDeps {
  prisma: PrismaClient;
  /** Null when API-Sports is not configured — every team then returns undefined. */
  source: ApiSportsShotSource | null;
}

export interface ShotProfileLookup {
  /** football-data.org external team ids, as carried on the live match. */
  homeExternalId: number;
  awayExternalId: number;
  asOf: Date;
}

/**
 * Resolves a football-data external team id to its API-Sports id via the mapping
 * table. Returns null (skip) when unmapped, or when the only mapping is an
 * auto-matched one below the confidence bar / unverified under strict mode.
 */
async function resolveApiTeamId(prisma: PrismaClient, externalId: number): Promise<number | null> {
  const team = await prisma.team.findUnique({ where: { externalId }, select: { id: true } });
  if (!team) return null;

  const outcome = await resolveProviderId(prisma, {
    internalId: team.id,
    provider: API_SPORTS_PROVIDER,
    entityType: 'team',
  });

  if (outcome.status === 'unmapped') return null;
  if (outcome.status === 'unverified') {
    if (REQUIRE_VERIFIED) return null;
    if (outcome.entity.confidence < MIN_MAPPING_CONFIDENCE) return null;
  }

  const apiId = Number(outcome.entity.providerId);
  return Number.isFinite(apiId) ? apiId : null;
}

/**
 * Resolves shot profiles for a fixture's two teams. Both sides are attempted
 * independently — a fixture where only one team maps still yields a partial
 * result, and the xG estimator withholds unless BOTH are present anyway.
 */
export async function buildTeamShotProfiles(
  deps: ShotProfileDeps,
  lookup: ShotProfileLookup,
): Promise<TeamShotProfiles> {
  if (!deps.source) return {};

  const [homeApiId, awayApiId] = await Promise.all([
    resolveApiTeamId(deps.prisma, lookup.homeExternalId),
    resolveApiTeamId(deps.prisma, lookup.awayExternalId),
  ]);

  const [home, away] = await Promise.all([
    homeApiId !== null ? deps.source.buildProfile(homeApiId) : Promise.resolve(undefined),
    awayApiId !== null ? deps.source.buildProfile(awayApiId) : Promise.resolve(undefined),
  ]);

  return {
    ...(home ? { home } : {}),
    ...(away ? { away } : {}),
  };
}
