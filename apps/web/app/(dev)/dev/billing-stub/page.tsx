/**
 * Local billing stub target used when Paystack test keys are not configured.
 */
export default async function BillingStubPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string | string[]; tier?: string | string[] }>;
}) {
  const params = await searchParams;
  const reference = (Array.isArray(params.reference) ? params.reference[0] : params.reference) ?? '';
  const tier = (Array.isArray(params.tier) ? params.tier[0] : params.tier) ?? 'monthly';

  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm uppercase tracking-[0.16em] text-edge-cyan">Development billing stub</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Checkout redirect placeholder</h1>
      <dl className="mt-6 grid grid-cols-[8rem_1fr] gap-3 text-sm">
        <dt className="text-mute-2">Tier</dt>
        <dd className="uppercase">{tier}</dd>
        <dt className="text-mute-2">Reference</dt>
        <dd className="break-all">{reference || 'not provided'}</dd>
      </dl>
      <a
        href={`/en/billing/thanks?reference=${encodeURIComponent(reference)}`}
        className="mt-8 inline-flex rounded-lg bg-edge-cyan px-4 py-2 text-sm font-semibold text-ink-0 hover:opacity-90"
      >
        Return to thanks
      </a>
    </main>
  );
}
