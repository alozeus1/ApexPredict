// Known locales that ship message catalogs. English is the launch locale;
// yo/ha/ig exist but are gated OFF by default at the i18n routing layer
// (see apps/web/i18n/locales.ts and docs/strategy/...-locale-gate.md).
// `es` and `zu` were removed — they never passed the locale gate.
export const LOCALES = ['en', 'yo', 'ha', 'ig'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const isLocale = (v: unknown): v is Locale =>
  typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
