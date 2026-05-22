import { describe, it, expect } from 'vitest';
import sitemap from '../sitemap';
import fixtures from '../../data/fixtures.json';
import { LOCALES } from '@apexpredix/types';

describe('sitemap', () => {
  it('includes every locale × top-level route × match', async () => {
    const entries = await sitemap();
    const urls = new Set(entries.map((e) => e.url));
    const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';
    const routes = ['', '/predictions', '/methodology', '/how-it-works', '/premium', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/disclaimer'];
    for (const l of LOCALES) for (const r of routes) {
      expect(urls.has(`${SITE}/${l}${r}`)).toBe(true);
    }
    for (const l of LOCALES) for (const m of fixtures as Array<{ id: string }>) {
      expect(urls.has(`${SITE}/${l}/predictions/${m.id}`)).toBe(true);
    }
  });
});
