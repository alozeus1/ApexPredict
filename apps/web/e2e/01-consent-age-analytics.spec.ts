import { test, expect } from '@playwright/test';

test('cookie banner gates analytics; age gate confirms; analytics mounts only after consent', async ({ page }) => {
  const network: string[] = [];
  page.on('request', (req) => { if (req.url().includes('vitals.vercel-insights.com')) network.push(req.url()); });

  await page.goto('/en');

  // Cookie banner is visible
  const banner = page.getByRole('dialog', { name: /we use cookies/i });
  await expect(banner).toBeVisible();
  expect(network).toHaveLength(0);

  // Accept all
  await page.getByRole('button', { name: 'Accept all' }).click();

  // Age gate appears next
  const age = page.getByRole('dialog', { name: /18/ });
  await expect(age).toBeVisible();
  await page.getByRole('button', { name: 'I am 18 or older' }).click();
  await expect(age).toBeHidden();

  // Analytics has had a chance to mount; navigate to trigger a beacon
  await page.goto('/en/predictions');
  await page.waitForTimeout(1500);
  expect(network.length).toBeGreaterThan(0);
});
