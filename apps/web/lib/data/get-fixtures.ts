import { prisma } from '@apexpredix/db';
import cannedFixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';
import { normalizeFixture } from './normalize';

export async function getFixtures(): Promise<Match[]> {
  if (!process.env.DATABASE_URL) return cannedFixtures as Match[];

  try {
    const rows = await prisma.fixture.findMany({
      where: { kickoff: { gte: new Date() } },
      orderBy: { kickoff: 'asc' },
      take: 40,
      include: {
        competition: true,
        homeTeam: true,
        awayTeam: true,
        odds: { orderBy: { capturedAt: 'desc' }, take: 8 },
        predictions: { orderBy: { generatedAt: 'desc' }, take: 1 },
      },
    });

    if (rows.length > 0) return rows.map((row, index) => normalizeFixture(row, index));
  } catch {
    return cannedFixtures as Match[];
  }

  return cannedFixtures as Match[];
}
