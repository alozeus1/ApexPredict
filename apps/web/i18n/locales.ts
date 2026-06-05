import { LOCALES, DEFAULT_LOCALE, type Locale } from '@apexpredix/types';

export { LOCALES, DEFAULT_LOCALE };
export type { Locale };

/**
 * Locale gate. English is always on. Every other locale ships only when its
 * env flag is explicitly set to 'true' — the launch gate documented in
 * docs/strategy/2026-06-04-apexpredict-locale-gate.md. All flags default unset,
 * so launch is English-only.
 *
 * These are server-only env vars. In a client bundle they resolve to undefined,
 * which collapses ENABLED_LOCALES to ['en'] — a safe default. Server components
 * that render the language switcher pass the authoritative list down as a prop.
 */
const LOCALE_FLAGS: Record<Exclude<Locale, 'en'>, string> = {
  yo: 'LOCALE_YO_ENABLED',
  ha: 'LOCALE_HA_ENABLED',
  ig: 'LOCALE_IG_ENABLED',
};

export function isLocaleEnabled(locale: Locale): boolean {
  if (locale === DEFAULT_LOCALE) return true;
  return process.env[LOCALE_FLAGS[locale as Exclude<Locale, 'en'>]] === 'true';
}

/** Locales currently routable/visible, in canonical order. Always includes 'en'. */
export const ENABLED_LOCALES: Locale[] = LOCALES.filter(isLocaleEnabled);
