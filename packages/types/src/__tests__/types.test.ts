import { describe, it, expect } from 'vitest';
import { LOCALES, DEFAULT_LOCALE, isLocale, CONSENT_VERSION } from '../index';

describe('types', () => {
  it('LOCALES has 5 entries', () => {
    expect(LOCALES).toHaveLength(5);
  });
  it('DEFAULT_LOCALE is en', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });
  it('isLocale narrows correctly', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('xx')).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
  it('CONSENT_VERSION is 1', () => {
    expect(CONSENT_VERSION).toBe(1);
  });
});
