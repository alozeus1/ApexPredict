import { prisma } from '@apexpredix/db';
import cannedFixtures from '@/data/fixtures.json';
import type { Match, PerformanceContext } from '@apexpredix/types';
import { normalizeFixture } from './normalize';
import { isDemoDataEnabled, reportDataSourceFailure } from './demo-mode';

async function latestPerformance(): Promise<PerformanceContext | undefined> {
  const latest = await prisma.predictionBacktestRun.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!latest) return undefined;
  return {
    sampleSize: latest.sampleSize,
    windowDays: latest.windowDays,
    roi: latest.roi,
    hitRate: latest.hitRate,
    brierScore: latest.brierScore,
    logLoss: latest.logLoss,
    calibrationError: latest.calibrationError,
  };
}

/**
 * A single fixture by id.
 *
 * Canned demo matches resolve only in explicitly enabled demo mode. In
 * production an unknown or unavailable fixture returns undefined so the route
 * can render a not-found state rather than invented content.
 */
export async function getMatch(matchId: string): Promise<Match | undefined> {
  if (!matchId.startsWith('live-')) {
    if (!isDemoDataEnabled()) return undefined;
    return (cannedFixtures as Match[]).find((match) => match.id === matchId);
  }

  if (!process.env.DATABASE_URL) {
    reportDataSourceFailure('match', new Error('DATABASE_URL is not configured'));
    return undefined;
  }

  const externalId = Number(matchId.replace('live-', ''));
  if (!Number.isFinite(externalId)) return undefined;

  try {
    const [row, performance] = await Promise.all([prisma.fixture.findUnique({
      where: { externalId },
      include: {
        competition: true,
        homeTeam: true,
        awayTeam: true,
        odds: { orderBy: { capturedAt: 'desc' }, take: 8 },
        oddsMovements: { orderBy: { capturedAt: 'desc' }, take: 4 },
        enrichment: true,
        predictions: { orderBy: { generatedAt: 'desc' }, take: 1 },
      },
    }), latestPerformance()]);

    return row ? normalizeFixture(row, 0, performance) : undefined;
  } catch (error) {
    reportDataSourceFailure('match', error);
    return undefined;
  }
}
