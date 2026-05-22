import type { Metadata } from 'next';
import { LOCALES } from '@apexpredix/types';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';

export function hrefLang(path: string): Record<string, string> {
  const out: Record<string, string> = { 'x-default': `${SITE}/en${path}` };
  for (const l of LOCALES) out[l] = `${SITE}/${l}${path}`;
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
      siteName: 'ApexPredix AI',
    },
    twitter: { card: 'summary_large_image', title: opts.title, description: opts.description },
  };
}
