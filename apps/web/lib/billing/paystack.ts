/**
 * Paystack billing adapter. Checkout stays in local stub mode unless
 * PAYSTACK_SECRET_KEY_TEST is configured; webhook HMAC verification is real.
 */
import crypto from 'node:crypto';
import type { BillingEvent, BillingProvider, CheckoutInput, CheckoutResult } from './provider';

const AMOUNTS_KOBO: Record<string, number> = {
  weekly: 250_000,
  monthly: 800_000,
  yearly: 7_000_000,
};

function eventId(payload: { id?: unknown; event?: unknown; data?: Record<string, unknown> }): string {
  const data = payload.data ?? {};
  return String(
    payload.id ??
      data.id ??
      data.reference ??
      data.subscription_code ??
      `${payload.event ?? 'paystack.event'}:${crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')}`,
  );
}

export class PaystackBillingProvider implements BillingProvider {
  readonly name = 'paystack' as const;

  async getCheckoutUrl(input: CheckoutInput): Promise<CheckoutResult> {
    const secret = process.env.PAYSTACK_SECRET_KEY_TEST;
    const reference = `APX-${input.tier.toUpperCase()}-${input.userId}-${input.idempotencyKey}`.slice(0, 100);
    if (!secret) {
      console.warn('[billing] PAYSTACK_SECRET_KEY_TEST not configured; returning stub checkout URL');
      return {
        authorizationUrl: `/dev/billing-stub?reference=${encodeURIComponent(reference)}&tier=${input.tier}`,
        reference,
        isStub: true,
      };
    }

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        amount: AMOUNTS_KOBO[input.tier],
        currency: 'NGN',
        reference,
        metadata: { userId: input.userId, tier: input.tier },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/en/billing/thanks?reference=${reference}`,
      }),
    });
    if (!res.ok) throw new Error(`Paystack initialize failed: ${res.status}`);
    const json = (await res.json()) as { data?: { authorization_url?: string; reference?: string } };
    const authorizationUrl = json.data?.authorization_url;
    if (!authorizationUrl) throw new Error('Paystack initialize response missing authorization_url');
    return { authorizationUrl, reference: json.data?.reference ?? reference, isStub: false };
  }

  verifyWebhookSignature(rawBody: string, header: string): boolean {
    const secret = process.env.PAYSTACK_SECRET_KEY_TEST;
    if (!secret || !header) return false;
    const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const headerBuffer = Buffer.from(header);
    return expectedBuffer.length === headerBuffer.length && crypto.timingSafeEqual(expectedBuffer, headerBuffer);
  }

  parseEvent(rawBody: string): BillingEvent {
    const payload = JSON.parse(rawBody) as { id?: unknown; event?: unknown; data?: Record<string, unknown> };
    const type = String(payload.event) as BillingEvent['type'];
    const allowed = new Set([
      'subscription.create',
      'subscription.disable',
      'invoice.create',
      'invoice.payment_failed',
      'charge.success',
      'charge.failed',
    ]);
    if (!allowed.has(type)) throw new Error(`Unsupported Paystack event: ${type}`);
    return { provider: 'paystack', id: eventId(payload), type, data: payload.data ?? {} };
  }
}
