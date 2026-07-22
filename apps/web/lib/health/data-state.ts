import type { PrismaClient } from '@apexpredix/db';
import { rightsGateReport } from '@/lib/providers/registry/rights';

/**
 * Data-state report: what we actually hold, and what we are missing.
 *
 * The point of this endpoint is to answer "is the pipeline producing anything,
 * and how far are we from a defensible baseline" without anyone reading it
 * having to trust a summary. Every number is a count of rows that exist.
 *
 * Two rules it must never break:
 *
 * 1. **Absent is not zero.** A count of 0 and a query that failed are different
 *    facts and are reported differently. A dashboard that renders a failed
 *    query as 0 tells you the pipeline is empty when it may be fine.
 * 2. **No readiness claim without the evidence.** `baseline.ready` is false
 *    unless the sample actually exists AND the rights gate passes. It does not
 *    become true because a deadline is close.
 */

/** Below this, calibration error bars are wider than any difference we'd claim. */
export const MIN_BASELINE_SAMPLE = 200;

/** A cron that has not checked in this long is not running. */
const CRON_STALE_MS = 36 * 60 * 60 * 1000;

export interface DataStateReport {
  generatedAt: string;
  counts: Record<string, number | null>;
  /** Populated when a count could not be read. Never merged into `counts`. */
  errors: Record<string, string>;
  freshness: {
    latestKickoff: string | null;
    latestResultAt: string | null;
    latestEvaluationAt: string | null;
    lastCronHeartbeatAt: string | null;
    cronStale: boolean | null;
  };
  mapping: {
    total: number | null;
    verified: number | null;
    /** Unverified rows are unusable by the engine, not partially usable. */
    unverified: number | null;
  };
  baseline: {
    settledSample: number | null;
    required: number;
    shortfall: number | null;
    rightsGatePasses: boolean;
    ready: boolean;
    blockedBy: string[];
  };
}

async function count(
  errors: Record<string, string>,
  label: string,
  fn: () => Promise<number>,
): Promise<number | null> {
  try {
    return await fn();
  } catch (error) {
    errors[label] = error instanceof Error ? error.message : String(error);
    return null;
  }
}

async function value<T>(
  errors: Record<string, string>,
  label: string,
  fn: () => Promise<T | null>,
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    errors[label] = error instanceof Error ? error.message : String(error);
    return null;
  }
}

export async function buildDataStateReport(prisma: PrismaClient): Promise<DataStateReport> {
  const errors: Record<string, string> = {};

  const [fixtures, results, predictions, evaluations, teams, teamSeasons, teamAliases, mapTotal, mapVerified] =
    await Promise.all([
      count(errors, 'fixtures', () => prisma.fixture.count()),
      count(errors, 'results', () => prisma.fixtureResult.count()),
      count(errors, 'predictions', () => prisma.predictionSnapshot.count()),
      count(errors, 'evaluations', () => prisma.predictionEvaluation.count()),
      count(errors, 'teams', () => prisma.team.count()),
      count(errors, 'teamSeasons', () => prisma.teamSeason.count()),
      count(errors, 'teamAliases', () => prisma.teamAlias.count()),
      count(errors, 'providerEntityMap', () => prisma.providerEntityMap.count()),
      count(errors, 'providerEntityMapVerified', () =>
        prisma.providerEntityMap.count({ where: { verifiedBy: { not: null } } }),
      ),
    ]);

  const [latestFixture, latestResult, latestEvaluation, latestHeartbeat] = await Promise.all([
    value(errors, 'latestKickoff', () =>
      prisma.fixture.findFirst({ orderBy: { kickoff: 'desc' }, select: { kickoff: true } }),
    ),
    value(errors, 'latestResult', () =>
      prisma.fixtureResult.findFirst({ orderBy: { finishedAt: 'desc' }, select: { finishedAt: true } }),
    ),
    value(errors, 'latestEvaluation', () =>
      prisma.predictionEvaluation.findFirst({
        orderBy: { evaluatedAt: 'desc' },
        select: { evaluatedAt: true },
      }),
    ),
    value(errors, 'lastCronHeartbeat', () =>
      prisma.agentHeartbeat.findFirst({
        where: { agentId: 'fixture-sync', status: 'live' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ),
  ]);

  const heartbeatAt = latestHeartbeat?.createdAt ?? null;

  const rights = rightsGateReport();

  // The baseline sample is SETTLED predictions — ones with a known outcome.
  // Prediction count is not a proxy: a thousand predictions about matches that
  // have not kicked off yet is zero evidence about accuracy.
  const settledSample = evaluations;

  const blockedBy: string[] = [];
  if (!rights.passes) {
    // Only ENABLED providers block. A disabled provider with unresolved rights
    // is a future problem, not a current one, and folding the two together
    // would make the gate impossible to clear by disabling nothing.
    blockedBy.push(
      `provider rights gate fails for enabled provider(s): ` +
        rights.blocking.map((finding) => finding.providerId).join(', '),
    );
  }
  if (settledSample === null) {
    blockedBy.push('settled sample could not be read; treat as unknown, not zero');
  } else if (settledSample < MIN_BASELINE_SAMPLE) {
    blockedBy.push(`settled sample ${settledSample} is below the ${MIN_BASELINE_SAMPLE} minimum`);
  }
  if (heartbeatAt === null) {
    blockedBy.push('no successful fixture-sync heartbeat recorded; ingestion may never have run');
  } else if (Date.now() - heartbeatAt.getTime() > CRON_STALE_MS) {
    blockedBy.push(`last successful fixture-sync was ${heartbeatAt.toISOString()}; ingestion is stale`);
  }

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      fixtures,
      results,
      predictions,
      evaluations,
      teams,
      teamSeasons,
      teamAliases,
    },
    errors,
    freshness: {
      latestKickoff: latestFixture?.kickoff.toISOString() ?? null,
      latestResultAt: latestResult?.finishedAt.toISOString() ?? null,
      latestEvaluationAt: latestEvaluation?.evaluatedAt.toISOString() ?? null,
      lastCronHeartbeatAt: heartbeatAt?.toISOString() ?? null,
      cronStale: heartbeatAt === null ? null : Date.now() - heartbeatAt.getTime() > CRON_STALE_MS,
    },
    mapping: {
      total: mapTotal,
      verified: mapVerified,
      unverified: mapTotal !== null && mapVerified !== null ? mapTotal - mapVerified : null,
    },
    baseline: {
      settledSample,
      required: MIN_BASELINE_SAMPLE,
      shortfall: settledSample === null ? null : Math.max(0, MIN_BASELINE_SAMPLE - settledSample),
      rightsGatePasses: rights.passes,
      // Conjunction, not disjunction: a large sample does not excuse an
      // unresolved rights gate, and cleared rights do not excuse a thin sample.
      ready: blockedBy.length === 0,
      blockedBy,
    },
  };
}
