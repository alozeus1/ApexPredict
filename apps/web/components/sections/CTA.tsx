import { WaitlistForm } from './WaitlistForm';

interface CTAProps { waitlistCount?: number | null; }

export function CTA({ waitlistCount }: CTAProps) {
  return (
    <section id="cta" className="relative overflow-hidden border-b border-white/5">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Join the Inner Circle</h2>
        {typeof waitlistCount === 'number' && (
          <p className="mt-3 text-mute-1">
            <span className="font-semibold text-white">{waitlistCount.toLocaleString()}</span> analysts and bettors are on the waitlist.
          </p>
        )}
        <div className="mt-8 rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10">
          <WaitlistForm />
          <p className="mt-3 text-xs text-mute-2">
            We never share your email. ApexPredix AI is an analytics service, not a gambling operator.
          </p>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.10),transparent_60%)]" />
    </section>
  );
}
