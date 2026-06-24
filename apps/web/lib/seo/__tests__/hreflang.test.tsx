import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

describe('hreflangUrls', () => {
  afterEach(() => {
    delete process.env.LOCALE_YO_ENABLED;
    delete process.env.LOCALE_HA_ENABLED;
    delete process.env.LOCALE_IG_ENABLED;
    vi.resetModules();
  });

  it('omits alternates while launch is English-only', async () => {
    const { HreflangTags, hreflangUrls } = await import('../hreflang');

    expect(hreflangUrls('/predictions')).toEqual([]);
    expect(renderToStaticMarkup(<HreflangTags path="/predictions" />)).toBe('');
  });

  it('emits enabled locale alternates and x-default when locale flags open', async () => {
    process.env.LOCALE_YO_ENABLED = 'true';
    process.env.LOCALE_HA_ENABLED = 'true';
    vi.resetModules();
    const { HreflangTags, hreflangUrls } = await import('../hreflang');
    const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';

    expect(hreflangUrls('/predictions')).toEqual([
      { locale: 'en', href: `${SITE}/en/predictions` },
      { locale: 'yo', href: `${SITE}/yo/predictions` },
      { locale: 'ha', href: `${SITE}/ha/predictions` },
      { locale: 'x-default', href: `${SITE}/en/predictions` },
    ]);
    expect(renderToStaticMarkup(<HreflangTags path="/predictions" />)).toContain('hrefLang="x-default"');
  });
});
