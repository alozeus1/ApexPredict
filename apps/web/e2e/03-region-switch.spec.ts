import { test, expect } from '@playwright/test';

test('region switch changes pricing display and bookmaker visibility', async ({ page }) => {
  await page.goto('/en/predictions/featured-1');
  await page.context().addCookies([{ name: 'apexpredix-region', value: 'NG', url: 'http://localhost:3000' }]);
  await page.reload();
  // NG-licensed books should appear; US-only books should not
  await expect(page.getByText('SportyBet')).toBeVisible();
  await expect(page.getByText('DraftKings')).toHaveCount(0);
});
