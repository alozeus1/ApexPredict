import { describe, it, expect, beforeEach } from 'vitest';
import { hashPII } from '../hash';

beforeEach(() => {
  process.env.HASH_SECRET_PRIMARY = 'a'.repeat(32);
  process.env.HASH_SECRET_SECONDARY = 'b'.repeat(32);
});

describe('hashPII', () => {
  it('produces a stable 64-char hex digest', async () => {
    const h = await hashPII('203.0.113.1');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    const again = await hashPII('203.0.113.1');
    expect(again).toBe(h);
  });
  it('returns different digests for different inputs', async () => {
    const a = await hashPII('1.1.1.1');
    const b = await hashPII('2.2.2.2');
    expect(a).not.toBe(b);
  });
  it('throws if primary secret missing', async () => {
    delete process.env.HASH_SECRET_PRIMARY;
    await expect(hashPII('x')).rejects.toThrow(/HASH_SECRET_PRIMARY/);
  });
});
