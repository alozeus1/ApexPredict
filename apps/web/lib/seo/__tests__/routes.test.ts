import { describe, expect, it } from 'vitest';
import { SEO_ROUTES, parseLeafPath, toSlug } from '../routes';
import { organizationLD, sportsEventLD, websiteLD } from '@/components/seo/JsonLd';

describe('SEO_ROUTES', () => {
  it.each([
    [SEO_ROUTES.freeTips('npfl', '2026-06-24'), { kind: 'freeTips', league: 'npfl', date: '2026-06-24' }],
    [SEO_ROUTES.team('rivers-united'), { kind: 'team', slug: 'rivers-united' }],
    [SEO_ROUTES.h2h('rivers-united', 'enyimba'), { kind: 'h2h', a: 'rivers-united', b: 'enyimba' }],
    [SEO_ROUTES.competitionPredictions('npfl'), { kind: 'competitionPredictions', slug: 'npfl' }],
    [SEO_ROUTES.competitionTable('npfl'), { kind: 'competitionTable', slug: 'npfl' }],
  ])('round-trips %s through parseLeafPath', (path, expected) => {
    expect(parseLeafPath(path)).toEqual(expected);
  });

  it('rejects invalid leaf paths', () => {
    expect(parseLeafPath('/free-tips/npfl/not-a-date')).toBeNull();
    expect(parseLeafPath('/team/Rivers United')).toBeNull();
    expect(parseLeafPath('/competition/npfl/results')).toBeNull();
  });

  it('normalizes names into URL slugs', () => {
    expect(toSlug('Rivers United FC')).toBe('rivers-united-fc');
    expect(toSlug('  Enyimba / Aba  ')).toBe('enyimba-aba');
  });
});

describe('JSON-LD SEO shapes', () => {
  it('exports schema.org organization and website objects', () => {
    expect(organizationLD).toMatchObject({ '@context': 'https://schema.org', '@type': 'Organization', name: 'ApexPredict AI' });
    expect(websiteLD).toMatchObject({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'ApexPredict AI' });
  });

  it('builds SportsEvent JSON-LD for a match', () => {
    expect(
      sportsEventLD({
        id: 'fixture-1',
        sport: 'Football',
        league: 'NPFL',
        home: { name: 'Rivers United' },
        away: { name: 'Enyimba' },
        kickoff: '2026-06-24T18:00:00.000Z',
      }),
    ).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: 'Rivers United vs Enyimba',
      homeTeam: { '@type': 'SportsTeam', name: 'Rivers United' },
      awayTeam: { '@type': 'SportsTeam', name: 'Enyimba' },
    });
  });
});
