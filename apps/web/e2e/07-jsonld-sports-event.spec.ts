import { test, expect } from '@playwright/test';

test('match detail emits SportsEvent JSON-LD', async ({ page }) => {
  await page.goto('/en/predictions/featured-1');
  // Find the SportsEvent script — there can be multiple JsonLd scripts; search for the SportsEvent one
  const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
  const sportsEventBlob = scripts.find((s) => s.includes('"SportsEvent"'));
  expect(sportsEventBlob).toBeDefined();
  const data = JSON.parse(sportsEventBlob!);
  expect(data['@type']).toBe('SportsEvent');
  expect(data.homeTeam.name).toBe('Arsenal');
  expect(data.awayTeam.name).toBe('Chelsea');
});
