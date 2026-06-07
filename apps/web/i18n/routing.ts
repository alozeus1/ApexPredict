import { defineRouting } from 'next-intl/routing';
import { ENABLED_LOCALES, DEFAULT_LOCALE } from './locales';

// Routing is gated to ENABLED_LOCALES: middleware, request config, static
// params, and the 404 guard all key off routing.locales, so disabled locales
// are not routable. Launch ships English-only.
export const routing = defineRouting({
  locales: ENABLED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});
