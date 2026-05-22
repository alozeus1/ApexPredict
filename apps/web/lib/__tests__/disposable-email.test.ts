import { describe, it, expect } from 'vitest';
import { isDisposableEmail } from '../disposable-email';

describe('isDisposableEmail', () => {
  it('flags known disposable domains', () => {
    expect(isDisposableEmail('me@mailinator.com')).toBe(true);
    expect(isDisposableEmail('me@tempmail.com')).toBe(true);
  });
  it('passes real domains', () => {
    expect(isDisposableEmail('me@gmail.com')).toBe(false);
    expect(isDisposableEmail('me@apexpredix.ai')).toBe(false);
  });
  it('handles malformed input safely', () => {
    expect(isDisposableEmail('not-an-email')).toBe(false);
  });
});
