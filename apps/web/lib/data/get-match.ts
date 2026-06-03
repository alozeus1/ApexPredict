import { prisma } from '@apexpredix/db';
import cannedFixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';
import { normalizeFixture } from './normalize';

export async function getMatch(matchId: string): Promise<Match | undefined> {
  if (!matchId.startsWith('live-')) return (cannedFixtures as Match[]).find((match) => match.id === matchId);
  if (!process.env.DATABASE_URL) return undefined;

  const externalId = Number(matchId.replace('live-', ''));
  if (!Number.isFinite(externalId)) return undefined;

  try {
    const row = await prisma.fixture.findUnique({
      where: { externalId },
      include: {
        competition: true,
        homeTeam: true,
        awayTeam: true,
        odds: { orderBy: { capturedAt: 'desc' }, take: 8 },
        predictions: { orderBy: { generatedAt: 'desc' }, take: 1 },
      },
    });

    return row ? normalizeFixture(row) : undefined;
  } catch {
    return undefined;
  }
}
