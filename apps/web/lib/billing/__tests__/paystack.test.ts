import crypto from 'node:crypto';
import { describe, expect, it, afterEach } from 'vitest';
import { PaystackBillingProvider } from '../paystack';

const secret = 'test-paystack-secret';

function sign(rawBody: string) {
  return crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
}

describe('PaystackBillingProvider', () => {
  afterEach(() => {
    delete process.env.PAYSTACK_SECRET_KEY_TEST;
  });

  it('verifies valid webhook signatures and rejects invalid signatures', () => {
    process.env.PAYSTACK_SECRET_KEY_TEST = secret;
    const provider = new PaystackBillingProvider();
    const rawBody = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_1' } });

    expect(provider.verifyWebhookSignature(rawBody, sign(rawBody))).toBe(true);
    expect(provider.verifyWebhookSignature(rawBody, 'bad-signature')).toBe(false);
  });

  it.each([
    ['subscription.create', { id: 1, metadata: { userId: 'user_1' } }],
    ['subscription.disable', { id: 2, metadata: { userId: 'user_1' } }],
    ['invoice.create', { id: 3, metadata: { userId: 'user_1' } }],
    ['invoice.payment_failed', { id: 4, metadata: { userId: 'user_1' } }],
    ['charge.success', { reference: 'charge_ref_1' }],
    ['charge.failed', { reference: 'charge_ref_2' }],
  ])('parses %s events', (event, data) => {
    const provider = new PaystackBillingProvider();
    const parsed = provider.parseEvent(JSON.stringify({ event, data }));

    expect(parsed.provider).toBe('paystack');
    expect(parsed.type).toBe(event);
    expect(parsed.id).toBeTruthy();
    expect(parsed.data).toEqual(data);
  });

  it('returns a local stub checkout URL when test keys are unset', async () => {
    const provider = new PaystackBillingProvider();
    const result = await provider.getCheckoutUrl({ tier: 'monthly', userId: 'user_1', idempotencyKey: 'idem_1' });

    expect(result.isStub).toBe(true);
    expect(result.authorizationUrl).toContain('/dev/billing-stub');
    expect(result.reference).toContain('APX-MONTHLY');
  });
});
