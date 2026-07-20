import { prisma } from '@apexpredix/db';
import cannedFixtures from '@/data/fixtures.json';
import type { Match, PerformanceContext } from '@apexpredix/types';
import { normalizeFixture } from './normalize';
import { isDemoDataEnabled, reportDataSourceFailure, reportEmptyDataSource } from './demo-mode';

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
 * Upcoming fixtures with their latest prediction snapshot.
 *
 * Returns an EMPTY ARRAY when live data is unavailable. It must never fall back
 * to `data/fixtures.json` outside explicitly enabled demo mode — that file holds
 * invented model scores and value-bet flags. See `lib/data/demo-mode.ts`.
 */
export async function getFixtures(): Promise<Match[]> {
  if (isDemoDataEnabled()) return cannedFixtures as Match[];

  if (!process.env.DATABASE_URL) {
    reportDataSourceFailure('fixtures', new Error('DATABASE_URL is not configured'));
    return [];
  }

  try {
    const [rows, performance] = await Promise.all([prisma.fixture.findMany({
      where: { kickoff: { gte: new Date() } },
      orderBy: { kickoff: 'asc' },
      take: 40,
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

    if (rows.length === 0) {
      reportEmptyDataSource('fixtures');
      return [];
    }

    return rows.map((row, index) => normalizeFixture(row, index, performance));
  } catch (error) {
    reportDataSourceFailure('fixtures', error);
    return [];
  }
}
