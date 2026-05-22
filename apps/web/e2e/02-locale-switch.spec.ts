import { test, expect } from '@playwright/test';

test('locale switch updates URL, persists across nav', async ({ page, context }) => {
  await page.goto('/en');
  await page.getByRole('button', { name: /English/ }).click();
  await page.getByRole('option', { name: /Español/ }).click();
  await expect(page).toHaveURL(/\/es\b/);
  await page.goto('/es/predictions');
  await expect(page).toHaveURL(/\/es\/predictions/);
  const cookie = (await context.cookies()).find((c) => c.name === 'apexpredix-language');
  expect(cookie?.value).toBe('es');
});
