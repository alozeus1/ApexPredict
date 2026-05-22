import { test, expect } from '@playwright/test';

test('reduced-motion shows poster + play button, no autoplay', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/en');
  await page.getByRole('button', { name: 'Reject all' }).click();
  await page.getByRole('button', { name: 'I am 18 or older' }).click();
  await expect(page.getByRole('button', { name: /play apexpredix/i })).toBeVisible();
  await expect(page.locator('video[autoplay]')).toHaveCount(0);
});
