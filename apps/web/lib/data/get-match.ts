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

export async function getMatch(matchId: string): Promise<Match | undefined> {
  if (!matchId.startsWith('live-')) return (cannedFixtures as Match[]).find((match) => match.id === matchId);
  if (!process.env.DATABASE_URL) return undefined;

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
  } catch {
    return undefined;
  }
}
