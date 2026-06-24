import type { Metadata } from 'next';
import { ENABLED_LOCALES } from '@/i18n/locales';
import { hreflangUrls } from './hreflang';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';

export function hrefLang(path: string): Record<string, string> {
  if (ENABLED_LOCALES.length <= 1) return {};
  const urls = hreflangUrls(path);
  return Object.fromEntries(urls.map((item) => [item.locale, item.href]));
}

export function legacyHrefLang(path: string): Record<string, string> {
  // Only advertise locales that are actually routable — gated-off locales 404.
  const out: Record<string, string> = { 'x-default': `${SITE}/en${path}` };
  for (const l of ENABLED_LOCALES) out[l] = `${SITE}/${l}${path}`;
  return out;
}

export function pageMetadata(opts: {
  locale: string;
  path: string;
  title: string;
  description: string;
  ogImage?: string;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: `${SITE}/${opts.locale}${opts.path}`, languages: hrefLang(opts.path) },
    openGraph: {
      type: 'website',
      url: `${SITE}/${opts.locale}${opts.path}`,
      title: opts.title,
      description: opts.description,
      images: opts.ogImage ? [opts.ogImage] : [`${SITE}/opengraph-image`],
      siteName: 'ApexPredict AI',
    },
    twitter: { card: 'summary_large_image', title: opts.title, description: opts.description },
  };
}
