import { describe, it, expect } from 'vitest';
import { LOCALES, DEFAULT_LOCALE, isLocale, CONSENT_VERSION } from '../index';

describe('types', () => {
  it('LOCALES is the gated set (en, yo, ha, ig)', () => {
    expect(LOCALES).toEqual(['en', 'yo', 'ha', 'ig']);
  });
  it('DEFAULT_LOCALE is en', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });
  it('isLocale narrows correctly', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('xx')).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
  it('CONSENT_VERSION is 2', () => {
    expect(CONSENT_VERSION).toBe(2);
  });
});
