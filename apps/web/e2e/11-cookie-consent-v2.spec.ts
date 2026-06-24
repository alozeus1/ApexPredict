import { test, expect } from '@playwright/test';

test('cookie consent v2 re-shows the banner for v1 cookies', async ({ page, baseURL }) => {
  const oldConsent = Buffer.from(JSON.stringify({
    v: 1,
    c: { essential: true, analytics: true, prefs: true, marketing: false },
  })).toString('base64url');
  const url = new URL(baseURL ?? 'http://localhost:3000');

  await page.context().addCookies([
    { name: 'apexpredix-age-confirmed', value: '1', url: url.origin },
    { name: 'cookie-consent', value: oldConsent, url: url.origin },
  ]);
  await page.goto('/en');

  await expect(page.getByRole('dialog', { name: /we use cookies/i })).toBeVisible();
});
