/**
 * hreflang link helper. English-only launch omits alternates entirely; gated
 * locales are emitted only after their environment flags enable them.
 */
import { ENABLED_LOCALES } from '@/i18n/locales';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';

export function hreflangUrls(path: string) {
  if (ENABLED_LOCALES.length <= 1) return [];
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return [
    ...ENABLED_LOCALES.map((locale) => ({ locale, href: `${SITE}/${locale}${normalized}` })),
    { locale: 'x-default', href: `${SITE}/en${normalized}` },
  ];
}

export function HreflangTags({ path }: { path?: string }) {
  if (!path) return null;
  const urls = hreflangUrls(path);
  if (urls.length === 0) return null;
  return (
    <>
      {urls.map((item) => (
        <link key={item.locale} rel="alternate" hrefLang={item.locale} href={item.href} />
      ))}
    </>
  );
}
