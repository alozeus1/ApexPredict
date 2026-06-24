/**
 * Billing provider contract shared by checkout routes, webhook handlers, and
 * replay tooling. Implementations must be testable without live vendor keys.
 */
import { PaystackBillingProvider } from './paystack';
import { FlutterwaveBillingProvider } from './flutterwave';

export type BillingTier = 'weekly' | 'monthly' | 'yearly';

export interface CheckoutInput {
  tier: BillingTier;
  userId: string;
  idempotencyKey: string;
}

export interface CheckoutResult {
  authorizationUrl: string;
  reference: string;
  isStub: boolean;
}

export interface BillingEvent {
  provider: 'paystack' | 'flutterwave';
  id: string;
  type:
    | 'subscription.create'
    | 'subscription.disable'
    | 'invoice.create'
    | 'invoice.payment_failed'
    | 'charge.success'
    | 'charge.failed';
  data: Record<string, unknown>;
}

export interface BillingProvider {
  name: 'paystack' | 'flutterwave';
  getCheckoutUrl(input: CheckoutInput): Promise<CheckoutResult>;
  verifyWebhookSignature(rawBody: string, header: string): boolean;
  parseEvent(rawBody: string): BillingEvent;
}

export function getActiveProvider(): BillingProvider {
  const provider = (process.env.BILLING_PROVIDER ?? 'paystack').toLowerCase();
  if (provider === 'flutterwave') return new FlutterwaveBillingProvider();
  return new PaystackBillingProvider();
}
