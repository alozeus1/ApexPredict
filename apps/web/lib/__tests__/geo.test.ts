import { describe, it, expect } from 'vitest';
import { regionFromCountry } from '../geo';

describe('regionFromCountry', () => {
  it('maps Nigeria to NG', () => { expect(regionFromCountry('NG')).toBe('NG'); });
  it('maps United States to US', () => { expect(regionFromCountry('US')).toBe('US'); });
  it('maps unknown to US', () => { expect(regionFromCountry('XX')).toBe('US'); });
  it('maps EU countries to EU', () => {
    expect(regionFromCountry('DE')).toBe('EU');
    expect(regionFromCountry('FR')).toBe('EU');
  });
});
