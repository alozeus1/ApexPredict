import { describe, it, expect, vi } from 'vitest';

const db = vi.hoisted(() => ({
  fixtureFindMany: vi.fn(),
  teamFindMany: vi.fn(),
  competitionFindMany: vi.fn(),
}));

vi.mock('@apexpredix/db', () => ({
  prisma: {
    fixture: { findMany: db.fixtureFindMany },
    team: { findMany: db.teamFindMany },
    competition: { findMany: db.competitionFindMany },
  },
}));

import sitemap from '../sitemap';
import { ENABLED_LOCALES } from '@/i18n/locales';

describe('sitemap', () => {
  it('includes every enabled locale, top-level route, and DB-backed SEO leaf URL', async () => {
    const updatedAt = new Date('2026-06-24T12:00:00.000Z');
    db.fixtureFindMany.mockResolvedValue([
      {
        competitionId: 'npfl',
        competition: { id: 'npfl', name: 'NPFL', updatedAt },
        homeTeam: { name: 'Rivers United' },
        awayTeam: { name: 'Enyimba' },
        kickoff: new Date('2026-06-25T18:00:00.000Z'),
        updatedAt,
      },
    ]);
    db.teamFindMany.mockResolvedValue([{ name: 'Rivers United' }]);
    db.competitionFindMany.mockResolvedValue([{ name: 'NPFL', updatedAt }]);

    const entries = await sitemap();
    const urls = new Set(entries.map((e) => e.url));
    const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';
    const routes = ['', '/predictions', '/methodology', '/how-it-works', '/premium', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/disclaimer'];
    for (const l of ENABLED_LOCALES) for (const r of routes) {
      expect(urls.has(`${SITE}/${l}${r}`)).toBe(true);
    }
    for (const l of ENABLED_LOCALES) {
      expect(urls.has(`${SITE}/${l}/free-tips/npfl/2026-06-25`)).toBe(true);
      expect(urls.has(`${SITE}/${l}/h2h/rivers-united-vs-enyimba`)).toBe(true);
      expect(urls.has(`${SITE}/${l}/team/rivers-united`)).toBe(true);
      expect(urls.has(`${SITE}/${l}/competition/npfl/predictions`)).toBe(true);
      expect(urls.has(`${SITE}/${l}/competition/npfl/table`)).toBe(true);
    }
    // Disabled/removed locales must not appear.
    expect(urls.has(`${SITE}/es`)).toBe(false);
  });
});
