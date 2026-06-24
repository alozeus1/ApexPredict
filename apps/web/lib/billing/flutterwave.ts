/**
 * Flutterwave billing adapter placeholder. It implements the shared contract so
 * BILLING_PROVIDER can be switched later, but checkout is intentionally stubbed.
 */
import type { BillingEvent, BillingProvider, CheckoutInput, CheckoutResult } from './provider';

export class FlutterwaveBillingProvider implements BillingProvider {
  readonly name = 'flutterwave' as const;

  async getCheckoutUrl(input: CheckoutInput): Promise<CheckoutResult> {
    const reference = `FW-STUB-${input.tier.toUpperCase()}-${input.userId}-${input.idempotencyKey}`;
    return {
      authorizationUrl: `/dev/billing-stub?reference=${encodeURIComponent(reference)}&tier=${input.tier}`,
      reference,
      isStub: true,
    };
  }

  verifyWebhookSignature(): boolean {
    throw new Error('Flutterwave webhook verification not implemented');
  }

  parseEvent(): BillingEvent {
    throw new Error('Flutterwave event parsing not implemented');
  }
}
