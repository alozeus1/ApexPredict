import { test, expect } from '@playwright/test';

/**
 * Auth scaffold contract. The DB-independent guarantees are asserted here:
 * pages render, and the signup/forgot endpoints are anti-enumeration safe
 * (identical 202 regardless of input). The full credential round-trip
 * (signup → verify → login → lockout → reset → re-login) requires a seeded
 * Postgres + KV and runs in CI against a provisioned test database; it is not
 * exercised here because the local/preview env has no DB.
 */
test.describe('auth scaffold', () => {
  for (const path of ['/en/signup', '/en/login', '/en/forgot-password', '/en/reset-password']) {
    test(`GET ${path} renders`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
    });
  }

  test('verify-email without a token shows the "check your email" state', async ({ request }) => {
    const res = await request.get('/en/verify-email');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('Check your email');
  });

  test('POST /api/auth/signup is anti-enumeration (202 for empty, invalid, and valid)', async ({ request }) => {
    const empty = await request.post('/api/auth/signup', { data: {} });
    expect(empty.status()).toBe(202);

    const invalid = await request.post('/api/auth/signup', { data: { email: 'not-an-email', password: 'x' } });
    expect(invalid.status()).toBe(202);

    const valid = await request.post('/api/auth/signup', {
      data: { email: `e2e+${Date.now()}@example.com`, password: 'correct-horse-battery', locale: 'en' },
    });
    expect(valid.status()).toBe(202);
  });

  test('POST /api/auth/forgot-password returns 202 regardless of account existence', async ({ request }) => {
    const res = await request.post('/api/auth/forgot-password', { data: { email: 'nobody@example.com' } });
    expect(res.status()).toBe(202);
  });

  test('POST /api/auth/reset-password with an invalid token is rejected', async ({ request }) => {
    const res = await request.post('/api/auth/reset-password', {
      data: { email: 'nobody@example.com', token: 'invalid-token-value', password: 'new-password-123' },
    });
    expect(res.status()).toBe(400);
  });
});
