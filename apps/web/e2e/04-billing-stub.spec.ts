import { test, expect } from '@playwright/test';

test.describe('billing stub checkout', () => {
  test('shows the no-key Paystack stub banner and redirects to the local stub', async ({ page }) => {
    await page.goto('/en');
    const ageConfirm = page.getByRole('button', { name: 'I am 18 or older' });
    if (await ageConfirm.isVisible().catch(() => false)) await ageConfirm.click();
    const acceptAll = page.getByRole('button', { name: 'Accept all' });
    if (await acceptAll.isVisible().catch(() => false)) await acceptAll.click();

    await page.goto('/en/billing/checkout?tier=monthly');

    await expect(page.getByText('Paystack keys not configured; would redirect in prod.')).toBeVisible();
    await expect(page.getByText('Billing checkout')).toBeVisible();
    await page.getByRole('link', { name: 'Continue to stub' }).click();
    await expect(page.getByText('Development billing stub')).toBeVisible();
  });
});
