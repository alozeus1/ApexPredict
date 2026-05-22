import { test, expect } from '@playwright/test';

test('x-vercel-ip-country: CN triggers 451 + /blocked body', async ({ request }) => {
  const res = await request.get('/en', { headers: { 'x-vercel-ip-country': 'CN' } });
  expect(res.status()).toBe(451);
  expect(await res.text()).toContain('Unavailable in your region');
});
