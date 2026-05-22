import { test, expect } from '@playwright/test';

test('6th waitlist submission within the window is rate-limited', async ({ request }) => {
  const body = (email: string) => ({ email, locale: 'en', premiumIntent: false, turnstileToken: 'x'.repeat(20), honeypot: '' });
  for (let i = 0; i < 5; i++) {
    const res = await request.post('/api/waitlist', { data: body(`e2e+rl${i}@example.com`) });
    expect([202, 400]).toContain(res.status());
  }
  const blocked = await request.post('/api/waitlist', { data: body('e2e+rl-final@example.com') });
  expect(blocked.status()).toBe(429);
});
