import { test, expect } from '@playwright/test';

/**
 * Locale gate (docs/strategy/2026-06-04-apexpredict-locale-gate.md).
 * Launch is English-only: yo/ha/ig are gated OFF by default and `es`/`zu` were
 * removed entirely. The routing layer is the enforcement point — only enabled
 * locales resolve to a page; everything else must 404 (after the default-locale
 * redirect). The switcher renders ENABLED_LOCALES, so it shows English only.
 */
test('English-only at launch: enabled locale resolves, gated/removed locales 404', async ({ page }) => {
  const en = await page.goto('/en');
  expect(en?.status()).toBe(200);

  // Removed locale.
  const es = await page.goto('/es');
  expect(es?.status()).toBe(404);

  // Gated-off locale (flag default false).
  const yo = await page.goto('/yo');
  expect(yo?.status()).toBe(404);
});
