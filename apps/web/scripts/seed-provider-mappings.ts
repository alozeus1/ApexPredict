#!/usr/bin/env tsx
/**
 * Seeds ProviderEntityMap candidates for API-Sports and reports coverage.
 *
 * This answers the question that gates the whole API-Sports integration:
 * for the competitions we actually run, can we map our teams to theirs, and
 * does the data we want even exist for those leagues?
 *
 * Nothing this script writes is trusted. Every proposed row lands with
 * `verifiedBy: null`, which `resolveProviderId` reports as `unverified` and
 * callers must treat as unavailable. A human confirms before the model sees it.
 *
 * Usage:
 *   API_SPORTS_KEY=... tsx scripts/seed-provider-mappings.ts --season 2026
 *   API_SPORTS_KEY=... tsx scripts/seed-provider-mappings.ts --season 2026 --write
 *   tsx scripts/seed-provider-mappings.ts --env-file ../../.env.staging
 *
 * Without --write it is a dry run: it reports and changes nothing.
 */
// MUST stay first: populates process.env before the Prisma client module is
// evaluated. See scripts/load-env.ts.
import { databaseHost, loadedEnvFile } from './load-env';
import { prisma } from '@apexpredix/db';
import { ApiSportsClient, ApiSportsQuotaError } from '../lib/providers/api-sports/client';
import { fetchLeagues, missingFeatures, searchTermFor, type CoverageFeature } from '../lib/providers/api-sports/football/leagues';
import { fetchTeams } from '../lib/providers/api-sports/football/teams';
import { proposeMappingsDetailed, type MappingCandidate, type MappingConflict } from '../lib/providers/mapping/resolve';

const REQUIRED_FEATURES: CoverageFeature[] = ['injuries', 'lineups', 'fixtureStats', 'standings'];
const PROVIDER = 'api-sports';

function arg(name: string, fallback?: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const season = Number(arg('season', String(new Date().getUTCFullYear())));
const write = process.argv.includes('--write');
const minimumConfidence = Number(arg('min-confidence', '0.6'));

interface CompetitionReport {
  competition: string;
  country: string;
  leagueId: number | null;
  matchedLeague: string | null;
  missingFeatures: CoverageFeature[];
  seasonUsed: number | null;
  seasonNotStarted: boolean;
  ourTeams: number;
  providerTeams: number;
  proposed: number;
  unmatched: string[];
  coveragePct: number;
  conflicts: MappingConflict[];
  ambiguous: MappingCandidate[];
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      loadedEnvFile
        ? `Loaded ${loadedEnvFile} but DATABASE_URL is not in it. Pass --env-file <path> to point at the right one.`
        : 'No env file found (looked for apps/web/.env.local, .env.local, .env). Pass --env-file <path>.',
    );
    process.exit(1);
  }

  const client = new ApiSportsClient({ sport: 'football' });

  if (!client.configured()) {
    console.error(
      'API_SPORTS_KEY is not set. It lives in Vercel but not in your local env file — either add it there or prefix the command:\n' +
        '  API_SPORTS_KEY=... pnpm tsx scripts/seed-provider-mappings.ts --season 2026',
    );
    process.exit(1);
  }

  // Writing goes to whatever DATABASE_URL points at. Say which, out loud,
  // before touching anything.
  console.log(`env:      ${loadedEnvFile ?? 'process environment'}`);
  console.log(`database: ${databaseHost()}`);
  console.log(`mode:     ${write ? 'WRITE' : 'dry run'}`);

  if (write) {
    console.log('\nAbout to write UNVERIFIED mapping proposals to the database above.');
    console.log('Ctrl-C within 5 seconds to abort.\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const competitions = await prisma.competition.findMany({
    where: { sport: 'FOOTBALL' },
    include: { teams: { select: { id: true, name: true, shortName: true, tla: true } } },
    orderBy: { name: 'asc' },
  });

  if (competitions.length === 0) {
    console.error('No competitions found. Run the daily-refresh cron first so there is something to map.');
    process.exit(1);
  }

  const reports: CompetitionReport[] = [];

  for (const competition of competitions) {
    const report: CompetitionReport = {
      competition: competition.name,
      country: competition.country,
      leagueId: null,
      matchedLeague: null,
      missingFeatures: [],
      seasonUsed: null,
      seasonNotStarted: false,
      ourTeams: competition.teams.length,
      providerTeams: 0,
      proposed: 0,
      unmatched: [],
      coveragePct: 0,
      conflicts: [],
      ambiguous: [],
    };

    try {
      // Competition.name holds Football-Data codes ("PL", "SA"), which are both
      // too short for API-Sports search and ambiguous across countries.
      const term = searchTermFor(competition.name);
      if (!term) {
        report.matchedLeague = null;
        reports.push(report);
        continue;
      }

      // `season` is applied INSIDE fetchLeagues, which picks that season's entry
      // from each league's own `seasons` array.
      //
      // It must NOT be used to filter the returned leagues: fetchLeagues already
      // collapses each league to one season, so filtering the result by season
      // selects a DIFFERENT COMPETITION whose current season happens to match.
      // That silently resolved "Premier League" to league 695 instead of 39.
      const leagues = await fetchLeagues(client, {
        search: term.search,
        ...(term.country ? { country: term.country } : {}),
        season,
      });

      const preferredCountry = (term.country ?? competition.country).toLowerCase();
      const league =
        leagues.find((candidate) => candidate.country.toLowerCase() === preferredCountry) ?? leagues[0];

      if (!league) {
        reports.push(report);
        continue;
      }

      report.leagueId = league.leagueId;
      report.matchedLeague = `${league.leagueName} (${league.country})`;
      report.missingFeatures = missingFeatures(league.coverage, REQUIRED_FEATURES);
      report.seasonUsed = league.season;
      report.seasonNotStarted = league.seasonNotStarted;
      if (league.season !== season) {
        console.error(
          `  ! ${competition.name}: requested season ${season} unavailable for league ` +
            `${league.leagueId}; provider returned ${league.season}. Coverage and team ` +
            `counts below refer to ${league.season}.`,
        );
      }

      // Use the season the provider ACTUALLY resolved, not the one requested.
      // WC resolved to 2026 while we asked for 2025, so fetching teams for 2025
      // returned nothing and reported 0/45 as if the matcher had failed.
      const providerTeams = await fetchTeams(client, { league: league.leagueId, season: league.season });
      report.providerTeams = providerTeams.length;

      const { candidates, conflicts } = proposeMappingsDetailed(
        competition.teams.map((team) => ({
          id: team.id,
          name: team.name,
          aliases: [team.shortName, team.tla].filter((value): value is string => Boolean(value)),
        })),
        providerTeams.map((team) => ({ id: String(team.id), name: team.name })),
        minimumConfidence,
      );

      report.conflicts = conflicts;
      report.ambiguous = candidates.filter((candidate) => candidate.ambiguous);
      // Count DISTINCT internal teams. Counting proposals let two provider teams
      // claim one internal team and produced a 107% coverage figure.
      const distinctInternal = new Set(candidates.map((candidate) => candidate.internalId));
      report.proposed = distinctInternal.size;
      report.coveragePct = report.ourTeams > 0 ? distinctInternal.size / report.ourTeams : 0;

      const mappedInternalIds = new Set(candidates.map((candidate) => candidate.internalId));
      report.unmatched = competition.teams
        .filter((team) => !mappedInternalIds.has(team.id))
        .map((team) => team.name);

      if (write) {
        for (const candidate of candidates) {
          await prisma.providerEntityMap.upsert({
            where: {
              provider_providerId_entityType: {
                provider: PROVIDER,
                providerId: candidate.providerId,
                entityType: 'team',
              },
            },
            create: {
              entityType: 'team',
              internalId: candidate.internalId,
              provider: PROVIDER,
              providerId: candidate.providerId,
              sport: 'FOOTBALL',
              confidence: candidate.confidence,
              // Deliberately null: unverified until a human confirms it.
              verifiedBy: null,
            },
            // Never overwrite a human-verified row with a fuzzy guess.
            update: {},
          });
        }

        await prisma.providerEntityMap.upsert({
          where: {
            provider_providerId_entityType: {
              provider: PROVIDER,
              providerId: String(league.leagueId),
              entityType: 'competition',
            },
          },
          create: {
            entityType: 'competition',
            internalId: competition.id,
            provider: PROVIDER,
            providerId: String(league.leagueId),
            sport: 'FOOTBALL',
            confidence: 1,
            verifiedBy: null,
          },
          update: {},
        });
      }
    } catch (error) {
      if (error instanceof ApiSportsQuotaError) {
        console.error(`\nQuota guard tripped: ${error.message}`);
        console.error('Partial report below. Re-run tomorrow or raise API_SPORTS_DAILY_QUOTA.\n');
        break;
      }
      console.error(`  ! ${competition.name}: ${error instanceof Error ? error.message : String(error)}`);
    }

    reports.push(report);
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(`\nAPI-Sports mapping + coverage report — season ${season}`);
  console.log(write ? 'MODE: write (proposals saved as UNVERIFIED)' : 'MODE: dry run (nothing written)');
  console.log('='.repeat(96));
  console.log(
    ['competition'.padEnd(26), 'league'.padEnd(7), 'season'.padEnd(9), 'teams'.padEnd(6), 'mapped'.padEnd(9), 'missing features'].join(' '),
  );
  console.log('-'.repeat(96));

  for (const report of reports) {
    const mapped = `${report.proposed}/${report.ourTeams}`;
    const pct = `${Math.round(report.coveragePct * 100)}%`;
    console.log(
      [
        report.competition.slice(0, 25).padEnd(26),
        String(report.leagueId ?? 'none').padEnd(7),
        `${report.seasonUsed ?? '-'}${report.seasonNotStarted ? '*' : ''}`.padEnd(9),
        String(report.ourTeams).padEnd(6),
        `${mapped} ${pct}`.padEnd(9),
        report.missingFeatures.length === 0 ? '-' : report.missingFeatures.join(', '),
      ].join(' '),
    );
  }

  console.log('='.repeat(96));

  const unmapped = reports.filter((report) => report.leagueId === null);
  const partial = reports.filter((report) => report.leagueId !== null && report.coveragePct < 0.9);
  const degraded = reports.filter((report) => report.missingFeatures.length > 0);

  if (unmapped.length > 0) {
    console.log(`\nNo league match (${unmapped.length}): ${unmapped.map((r) => r.competition).join(', ')}`);
  }

  if (partial.length > 0) {
    console.log(`\nBelow 90% team mapping (${partial.length}) — needs manual review:`);
    for (const report of partial) {
      console.log(`  ${report.competition}: unmatched -> ${report.unmatched.slice(0, 12).join(', ')}`);
    }
  }

  const unstarted = reports.filter((report) => report.seasonNotStarted);
  if (unstarted.length > 0) {
    console.log(
      `\n* Season not started (${unstarted.length}): ${unstarted.map((r) => r.competition).join(', ')}`,
    );
    console.log(
      '  Coverage flags describe what EXISTS for that season, so an unstarted season',
    );
    console.log(
      '  reports no lineups/stats. Re-run with a completed season to see true coverage.',
    );
  }

  if (degraded.length > 0) {
    console.log(`\nFeature gaps (${degraded.length}) — verify against a COMPLETED season before treating as permanent:`);
    for (const report of degraded) {
      const caveat = report.seasonNotStarted ? '  (season not started — likely not a real gap)' : '';
      console.log(`  ${report.competition}: missing ${report.missingFeatures.join(', ')}${caveat}`);
    }
  }

  const withConflicts = reports.filter((report) => report.conflicts.length > 0);
  if (withConflicts.length > 0) {
    console.log(`\nMapping conflicts (${withConflicts.length}) — two provider teams claimed one of ours:`);
    for (const report of withConflicts) {
      for (const conflict of report.conflicts) {
        const losers = conflict.rejected
          .map((entry) => `${entry.providerName} (${entry.confidence.toFixed(2)})`)
          .join(', ');
        console.log(
          `  ${report.competition}: "${conflict.internalName}" <- kept ` +
            `${conflict.accepted.providerName} (${conflict.accepted.confidence.toFixed(2)}); rejected ${losers}`,
        );
      }
    }
  }

  const withAmbiguous = reports.filter((report) => report.ambiguous.length > 0);
  if (withAmbiguous.length > 0) {
    const total = withAmbiguous.reduce((sum, report) => sum + report.ambiguous.length, 0);
    console.log(
      `\nAmbiguous proposals (${total}) — matched on ONE shared token, usually a city. Review these first:`,
    );
    for (const report of withAmbiguous) {
      for (const candidate of report.ambiguous) {
        console.log(
          `  ${report.competition}: "${candidate.internalName}" <- ${candidate.providerName} ` +
            `(${candidate.confidence.toFixed(2)})`,
        );
      }
    }
  }

  const quota = client.quota();
  console.log(`\nQuota used this run: ${quota.used}/${quota.limit} (${Math.round(quota.usablePct * 100)}%)`);
  if (!write) console.log('Re-run with --write to persist proposals as unverified rows.');
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
