import type { MetadataRoute } from 'next';
import { LOCALES } from '@apexpredix/types';
import fixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';
const TOP = ['', '/predictions', '/methodology', '/how-it-works', '/premium', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/disclaimer'];

export default function sitemap(): MetadataRoute.Sitemap {
  const items: MetadataRoute.Sitemap = [];
  for (const l of LOCALES) {
    for (const r of TOP) items.push({ url: `${SITE}/${l}${r}`, changeFrequency: 'weekly', priority: r === '' ? 1 : 0.6 });
    for (const m of fixtures as Match[]) items.push({ url: `${SITE}/${l}/predictions/${m.id}`, changeFrequency: 'hourly', priority: 0.5 });
  }
  return items;
}
