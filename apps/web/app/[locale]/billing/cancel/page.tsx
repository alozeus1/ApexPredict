import { setRequestLocale } from 'next-intl/server';
import { CancelButton } from './CancelButton';

/**
 * Subscription cancellation confirmation page.
 */
export const dynamic = 'force-dynamic';

export default async function BillingCancelPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm uppercase tracking-[0.16em] text-edge-amber">Billing</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Cancel subscription</h1>
      <p className="mt-3 text-sm text-mute-1">
        Cancellation keeps access active until the current paid period ends.
      </p>
      <CancelButton />
    </main>
  );
}
