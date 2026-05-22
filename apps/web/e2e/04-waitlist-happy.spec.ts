import { test, expect } from '@playwright/test';

test('waitlist happy path: submit → 202 → counter responds', async ({ page, request }) => {
  await page.goto('/en');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await page.getByRole('button', { name: 'I am 18 or older' }).click();
  await page.locator('input[type=email]').fill(`e2e+${Date.now()}@example.com`);
  await page.getByLabel(/18\+/).check();
  await page.locator('button:has-text("Reserve my seat")').click();
  await expect(page.getByText(/check your inbox/i)).toBeVisible({ timeout: 7_000 });
  const countRes = await request.get('/api/waitlist/count');
  expect(countRes.ok()).toBe(true);
  const body = await countRes.json();
  expect(typeof body.count).toBe('number');
});
