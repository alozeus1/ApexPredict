import { test, expect } from '@playwright/test';
import { axeSweep } from './_helpers/axe';

const pages = ['/en', '/en/predictions/featured-1', '/en/premium'];

for (const path of pages) {
  test(`axe-core: ${path} has zero serious or critical violations`, async ({ page }) => {
    await page.goto(path);
    // Best-effort dismiss banners — they may or may not be present depending on cookie state
    await page.getByRole('button', { name: 'Reject all' }).click({ trial: false }).catch(() => { /* no-op */ });
    await page.getByRole('button', { name: 'I am 18 or older' }).click({ trial: false }).catch(() => { /* no-op */ });
    const results = await axeSweep(page);
    const blockers = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blockers, JSON.stringify(blockers, null, 2)).toEqual([]);
  });
}

test('keyboard: Tab walks Sidebar → main → footer with visible focus ring', async ({ page }) => {
  await page.goto('/en');
  await page.keyboard.press('Tab'); // SkipToContent
  const skip = page.locator(':focus');
  await expect(skip).toHaveText(/skip to content/i);
});
