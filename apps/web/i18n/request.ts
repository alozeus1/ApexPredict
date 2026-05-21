import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import type { Locale } from './locales';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale =
    requested && (routing.locales as readonly string[]).includes(requested)
      ? (requested as Locale)
      : routing.defaultLocale;
  // Messages don't exist yet — Task 3.3 creates them. For now return empty so the build doesn't break.
  const messages = {};
  return { locale, messages };
});
