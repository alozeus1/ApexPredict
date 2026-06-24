import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

/**
 * Billing checkout entrypoint. Calls the checkout API from the server and
 * redirects only when a real provider authorization URL is available.
 */
export const dynamic = 'force-dynamic';

type CheckoutResult = {
  authorizationUrl: string;
  reference: string;
  isStub: boolean;
  error?: string;
};

function normalizeTier(value: string | string[] | undefined) {
  const tier = Array.isArray(value) ? value[0] : value;
  return tier === 'weekly' || tier === 'yearly' ? tier : 'monthly';
}

async function startCheckout(tier: string): Promise<CheckoutResult> {
  const h = await headers();
  const host = h.get('host') ?? new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').host;
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const response = await fetch(`${proto}://${host}/api/billing/checkout`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: h.get('cookie') ?? '',
      'idempotency-key': `checkout-page:${tier}:${randomUUID()}`,
    },
    body: JSON.stringify({ tier }),
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => ({}))) as CheckoutResult;
  if (!response.ok) return { authorizationUrl: '', reference: '', isStub: true, error: json.error ?? 'Checkout unavailable' };
  return json;
}

export default async function BillingCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tier?: string | string[] }>;
}) {
  const { locale } = await params;
  const { tier: tierParam } = await searchParams;
  setRequestLocale(locale);

  const tier = normalizeTier(tierParam);
  const result = await startCheckout(tier);
  if (!result.isStub && result.authorizationUrl) redirect(result.authorizationUrl as Route);

  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm uppercase tracking-[0.16em] text-edge-cyan">Billing checkout</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Subscription checkout</h1>
      <div className="mt-8 rounded-2xl border border-edge-amber/30 bg-edge-amber/10 p-5 text-sm text-edge-amber">
        Paystack keys not configured; would redirect in prod.
      </div>
      {result.error ? <p className="mt-4 text-sm text-red-300">{result.error}</p> : null}
      <dl className="mt-6 grid grid-cols-[8rem_1fr] gap-3 text-sm">
        <dt className="text-mute-2">Tier</dt>
        <dd className="uppercase">{tier}</dd>
        <dt className="text-mute-2">Reference</dt>
        <dd className="break-all">{result.reference || 'Not created'}</dd>
      </dl>
      {result.authorizationUrl ? (
        <a
          href={result.authorizationUrl}
          className="mt-8 inline-flex rounded-lg bg-edge-cyan px-4 py-2 text-sm font-semibold text-ink-0 hover:opacity-90"
        >
          Continue to stub
        </a>
      ) : null}
    </main>
  );
}
