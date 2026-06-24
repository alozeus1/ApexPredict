import { test, expect } from '@playwright/test';

/**
 * 00-smoke.spec.ts — CI liveness smoke test.
 *
 * Intentionally dependency-light: no database, no third-party network calls.
 * Guards the three contract points the pipeline must never ship broken:
 *   1. the localized landing page renders and carries the brand,
 *   2. the waitlist endpoint stays anti-enumeration safe (empty body → 202),
 *   3. the health probe is green.
 *
 * Wired into CI via the `e2e:smoke` script (chromium-only). The canonical brand
 * string is "ApexPredict" — sourced from the document <title> in
 * apps/web/app/[locale]/layout.tsx, which renders into the /en HTML.
 */
test.describe('smoke', () => {
  test('GET /en returns 200 and carries the brand string', async ({ request }) => {
    const res = await request.get('/en');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('ApexPredict');
  });

  test('POST /api/waitlist with empty body returns 202 (anti-enumeration)', async ({ request }) => {
    const res = await request.post('/api/waitlist', { data: {} });
    expect(res.status()).toBe(202);
  });

  test('GET /api/health returns 200 with { ok: true }', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  });
});
