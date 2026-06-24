export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';

export const organizationLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ApexPredict AI',
  url: SITE,
  logo: `${SITE}/icon.png`,
  parentOrganization: { '@type': 'Organization', name: 'Maralito Labs' },
  contactPoint: [
    { '@type': 'ContactPoint', email: 'help@apexpredix.ai', contactType: 'customer support' },
    { '@type': 'ContactPoint', email: 'legal@apexpredix.ai', contactType: 'legal' },
    { '@type': 'ContactPoint', email: 'privacy@apexpredix.ai', contactType: 'privacy' },
  ],
};

export const websiteLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  url: SITE,
  name: 'ApexPredict AI',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/en/predictions?q={query}` },
    'query-input': 'required name=query',
  },
};

export const sportsEventLD = (match: {
  id: string; sport: string; league: string;
  home: { name: string }; away: { name: string }; kickoff: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: `${match.home.name} vs ${match.away.name}`,
  sport: match.sport,
  startDate: match.kickoff,
  url: `${SITE}/en/predictions/${match.id}`,
  homeTeam: { '@type': 'SportsTeam', name: match.home.name },
  awayTeam: { '@type': 'SportsTeam', name: match.away.name },
  superEvent: { '@type': 'SportsEvent', name: match.league },
});

export const breadcrumbLD = (items: Array<{ name: string; href: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE}${it.href}` })),
});
