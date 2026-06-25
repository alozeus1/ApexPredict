import { describe, it, expect } from 'vitest';
import { safeDateTimeFormat, safeFormatDate } from '../date';

describe('safeDateTimeFormat', () => {
  it('returns an Intl.DateTimeFormat for a valid locale', () => {
    const fmt = safeDateTimeFormat('en', { dateStyle: 'short' });
    expect(fmt).toBeInstanceOf(Intl.DateTimeFormat);
  });

  it('falls back to en for empty string', () => {
    const fmt = safeDateTimeFormat('', { dateStyle: 'short' });
    const out = fmt.format(new Date('2026-06-25T12:00:00Z'));
    expect(out.length).toBeGreaterThan(0);
  });

  it('falls back to en for null/undefined', () => {
    expect(safeDateTimeFormat(null).format(new Date(0))).toBeDefined();
    expect(safeDateTimeFormat(undefined).format(new Date(0))).toBeDefined();
  });

  it('falls back to en for an unsupported / nonsense locale', () => {
    // a tag the Intl runtime cannot resolve; safeDateTimeFormat must not throw
    const fmt = safeDateTimeFormat('xx-NOTREAL-blob', { dateStyle: 'short' });
    expect(fmt).toBeInstanceOf(Intl.DateTimeFormat);
  });
});

describe('safeFormatDate', () => {
  it('formats a Date', () => {
    const out = safeFormatDate(new Date('2026-06-25T12:00:00Z'), 'en', { dateStyle: 'short' });
    expect(out.length).toBeGreaterThan(0);
  });

  it('formats an ISO string', () => {
    const out = safeFormatDate('2026-06-25T12:00:00Z', 'en', { dateStyle: 'short' });
    expect(out.length).toBeGreaterThan(0);
  });

  it('returns an empty string for nullish input', () => {
    expect(safeFormatDate(null, 'en')).toBe('');
    expect(safeFormatDate(undefined, 'en')).toBe('');
  });

  it('returns an empty string for unparseable input', () => {
    expect(safeFormatDate('not-a-date', 'en')).toBe('');
  });

  it('does not throw on a bad locale + good date', () => {
    expect(() => safeFormatDate(new Date(), '', { dateStyle: 'short' })).not.toThrow();
  });
});
