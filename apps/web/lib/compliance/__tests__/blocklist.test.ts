import { describe, it, expect } from 'vitest';
import { isBlocked } from '../blocklist';

describe('isBlocked', () => {
  it('blocks listed countries', () => {
    expect(isBlocked('CN', undefined)).toBe(true);
    expect(isBlocked('FR', undefined)).toBe(true);
  });
  it('blocks listed US states', () => {
    expect(isBlocked('US', 'WA')).toBe(true);
    expect(isBlocked('US', 'CA')).toBe(false);
  });
  it('passes unlisted countries', () => {
    expect(isBlocked('GB', undefined)).toBe(false);
    expect(isBlocked('NG', undefined)).toBe(false);
  });
});
