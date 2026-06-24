import { setRequestLocale } from 'next-intl/server';
import { BillingThanksPoller } from './BillingThanksPoller';

/**
 * Billing return page shown after checkout redirects back from the provider.
 */
export const dynamic = 'force-dynamic';

export default async function BillingThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reference?: string | string[] }>;
}) {
  const { locale } = await params;
  const { reference } = await searchParams;
  setRequestLocale(locale);
  const value = (Array.isArray(reference) ? reference[0] : reference) ?? '';

  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm uppercase tracking-[0.16em] text-edge-cyan">Billing</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Thanks for subscribing</h1>
      <p className="mt-3 text-sm text-mute-1">We are confirming your entitlement state.</p>
      <BillingThanksPoller reference={value} />
    </main>
  );
}
