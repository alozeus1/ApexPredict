/**
 * Safe Intl.DateTimeFormat wrapper.
 *
 * Why this exists:
 * In production we observed `RangeError: Incorrect locale information provided`
 * thrown from `new Intl.DateTimeFormat(locale, ...)` at render time on the
 * predictions page. The Node runtime on Vercel can reject locale strings that
 * are technically valid BCP-47 tags but lack runtime data, and it always throws
 * `RangeError` for empty / undefined / non-string locale args.
 *
 * Rather than chase every call-site to validate the locale beforehand, we
 * centralise the safety net: try the requested locale; on RangeError, fall
 * back to English.
 *
 * Behaviour:
 *   - A valid locale (e.g. `'en'`) returns the requested formatter.
 *   - An invalid / empty / unsupported locale silently degrades to `'en'`.
 *   - The fallback is deliberately not configurable — until the locale gate
 *     in docs/strategy/2026-06-04-apexpredict-locale-gate.md is passed, every
 *     non-English render path collapses to English on purpose.
 */
export function safeDateTimeFormat(
  locale: string | undefined | null,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const candidate = typeof locale === 'string' && locale.length > 0 ? locale : 'en';
  try {
    return new Intl.DateTimeFormat(candidate, options);
  } catch {
    return new Intl.DateTimeFormat('en', options);
  }
}

/**
 * Convenience: format a Date with the same safety guarantees as above.
 *
 * Accepts a Date, ISO string, or epoch ms. Returns an empty string for
 * unparseable input rather than throwing — render paths should never
 * crash because a single fixture has malformed kickoff data.
 */
export function safeFormatDate(
  date: Date | string | number | undefined | null,
  locale: string | undefined | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (date == null) return '';
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return safeDateTimeFormat(locale, options).format(value);
}
