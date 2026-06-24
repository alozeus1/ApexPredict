#!/usr/bin/env tsx
/**
 * Replays a Paystack webhook fixture against a local/staging webhook endpoint
 * with a valid test-key HMAC signature.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [, , fixturePath, target = process.env.BILLING_REPLAY_URL ?? 'http://localhost:3000'] = process.argv;
const secret = process.env.PAYSTACK_SECRET_KEY_TEST;

if (!fixturePath || !secret) {
  console.error('Usage: PAYSTACK_SECRET_KEY_TEST=... tsx scripts/billing-replay.ts fixture.json [baseUrl]');
  process.exit(1);
}

const rawBody = fs.readFileSync(path.resolve(fixturePath), 'utf8');
const signature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
const url = `${target.replace(/\/$/, '')}/api/billing/webhook/paystack`;

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-paystack-signature': signature,
  },
  body: rawBody,
});

console.log(JSON.stringify({ status: response.status, body: await response.json().catch(() => null) }, null, 2));
if (!response.ok) process.exit(1);
