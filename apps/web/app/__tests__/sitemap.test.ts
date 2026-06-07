import { describe, it, expect } from 'vitest';
import sitemap from '../sitemap';
import fixtures from '../../data/fixtures.json';
import { ENABLED_LOCALES } from '@/i18n/locales';

describe('sitemap', () => {
  it('includes every enabled locale × top-level route × match', async () => {
    const entries = await sitemap();
    const urls = new Set(entries.map((e) => e.url));
    const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';
    const routes = ['', '/predictions', '/methodology', '/how-it-works', '/premium', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/disclaimer'];
    for (const l of ENABLED_LOCALES) for (const r of routes) {
      expect(urls.has(`${SITE}/${l}${r}`)).toBe(true);
    }
    for (const l of ENABLED_LOCALES) for (const m of fixtures as Array<{ id: string }>) {
      expect(urls.has(`${SITE}/${l}/predictions/${m.id}`)).toBe(true);
    }
    // Disabled/removed locales must not appear.
    expect(urls.has(`${SITE}/es`)).toBe(false);
  });
});
