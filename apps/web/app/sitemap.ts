import type { MetadataRoute } from 'next';
import { prisma } from '@apexpredix/db';
import { ENABLED_LOCALES } from '@/i18n/locales';
import fixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';
import { SEO_ROUTES, toSlug } from '@/lib/seo/routes';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';
const TOP = ['', '/predictions', '/methodology', '/how-it-works', '/premium', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/disclaimer'];
export const revalidate = 3600;

function addLocalized(items: MetadataRoute.Sitemap, path: string, lastModified?: Date, priority = 0.5) {
  for (const locale of ENABLED_LOCALES) {
    items.push({ url: `${SITE}/${locale}${path}`, lastModified, changeFrequency: 'daily', priority });
  }
}

async function dbLeafEntries() {
  const now = new Date();
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const last90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  try {
    const [fixtureRows, teams, competitions] = await Promise.all([
      prisma.fixture.findMany({
        where: { OR: [{ kickoff: { gte: now, lte: next30 } }, { kickoff: { gte: last90, lt: now } }] },
        orderBy: { updatedAt: 'desc' },
        take: 10_000,
        include: { competition: true, homeTeam: true, awayTeam: true },
      }),
      prisma.team.findMany({ orderBy: { name: 'asc' }, take: 10_000 }),
      prisma.competition.findMany({ orderBy: { name: 'asc' }, take: 1000 }),
    ]);

    return [
      ...fixtureRows.flatMap((fixture) => {
        const league = toSlug(fixture.competition.name || fixture.competitionId);
        const date = fixture.kickoff.toISOString().slice(0, 10);
        return [
          { path: SEO_ROUTES.freeTips(league, date), updatedAt: fixture.updatedAt },
          {
            path: SEO_ROUTES.h2h(toSlug(fixture.homeTeam.name), toSlug(fixture.awayTeam.name)),
            updatedAt: fixture.updatedAt,
          },
        ];
      }),
      ...teams.map((team) => ({ path: SEO_ROUTES.team(toSlug(team.name)), updatedAt: new Date() })),
      ...competitions.flatMap((competition) => {
        const slug = toSlug(competition.name);
        return [
          { path: SEO_ROUTES.competitionPredictions(slug), updatedAt: competition.updatedAt },
          { path: SEO_ROUTES.competitionTable(slug), updatedAt: competition.updatedAt },
        ];
      }),
    ];
  } catch {
    return (fixtures as Match[]).map((match) => ({
      path: `/predictions/${match.id}`,
      updatedAt: new Date(match.kickoff),
    }));
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items: MetadataRoute.Sitemap = [];
  for (const l of ENABLED_LOCALES) {
    for (const r of TOP) items.push({ url: `${SITE}/${l}${r}`, changeFrequency: 'weekly', priority: r === '' ? 1 : 0.6 });
  }

  const seen = new Set(items.map((item) => item.url));
  for (const entry of await dbLeafEntries()) {
    const primaryUrl = `${SITE}/${ENABLED_LOCALES[0]}${entry.path}`;
    if (!seen.has(primaryUrl)) {
      for (const locale of ENABLED_LOCALES) seen.add(`${SITE}/${locale}${entry.path}`);
      addLocalized(items, entry.path, entry.updatedAt, 0.5);
    }
    if (items.length >= 50_000) break;
  }

  return items.slice(0, 50_000);
}
