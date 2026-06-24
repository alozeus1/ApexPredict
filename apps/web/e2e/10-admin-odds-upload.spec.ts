import { test, expect } from '@playwright/test';

test('admin odds upload returns 403 for non-admin users', async ({ request }) => {
  const response = await request.post('/api/admin/odds/upload', {
    multipart: {
      file: {
        name: 'npfl-odds.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('fixture_external_id,bookmaker,market,price,captured_at\n9001,Bet9ja,1,2.05,2026-06-24T09:00:00.000Z\n'),
      },
    },
  });

  expect(response.status()).toBe(403);
});
