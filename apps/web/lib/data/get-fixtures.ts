import { prisma } from '@apexpredix/db';
import cannedFixtures from '@/data/fixtures.json';
import type { Match, PerformanceContext } from '@apexpredix/types';
import { normalizeFixture } from './normalize';

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

export async function getFixtures(): Promise<Match[]> {
  if (!process.env.DATABASE_URL) return cannedFixtures as Match[];

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

    if (rows.length > 0) return rows.map((row, index) => normalizeFixture(row, index, performance));
  } catch {
    return cannedFixtures as Match[];
  }

  return cannedFixtures as Match[];
}
