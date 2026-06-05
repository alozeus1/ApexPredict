import { describe, it, expect, beforeEach } from 'vitest';
import { hashPII, verifyHashedPII } from '../hash';

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

const NON_MATCH = 'deadbeef'.repeat(8); // 64 hex chars, same length as a SHA-256 digest

describe('verifyHashedPII (primary -> secondary fallback)', () => {
  it('primary-only: hashed value verifies; a different value does not', async () => {
    delete process.env.HASH_SECRET_SECONDARY;
    const stored = await hashPII('user@example.com');
    expect(await verifyHashedPII('user@example.com', stored)).toBe(true);
    expect(await verifyHashedPII('other@example.com', stored)).toBe(false);
  });

  it('primary+secondary: a value hashed under the old key still verifies after rotation', async () => {
    // At write time the live key was 'b'*32 (the value beforeEach assigns to secondary).
    process.env.HASH_SECRET_PRIMARY = 'b'.repeat(32);
    const storedUnderOldKey = await hashPII('user@example.com');

    // Rotate: new key 'a'*32 becomes primary, old key 'b'*32 retained as secondary.
    process.env.HASH_SECRET_PRIMARY = 'a'.repeat(32);
    process.env.HASH_SECRET_SECONDARY = 'b'.repeat(32);

    expect(await verifyHashedPII('user@example.com', storedUnderOldKey)).toBe(true);
    const fresh = await hashPII('user@example.com');
    expect(fresh).not.toEqual(storedUnderOldKey);
    expect(await verifyHashedPII('user@example.com', fresh)).toBe(true);
  });

  it('mismatch: returns false when neither primary nor secondary matches', async () => {
    expect(await verifyHashedPII('user@example.com', NON_MATCH)).toBe(false);
  });

  it('throws when primary is missing even if secondary is set', async () => {
    delete process.env.HASH_SECRET_PRIMARY;
    process.env.HASH_SECRET_SECONDARY = 'b'.repeat(32);
    await expect(verifyHashedPII('x', NON_MATCH)).rejects.toThrow(/HASH_SECRET_PRIMARY/);
  });
});
