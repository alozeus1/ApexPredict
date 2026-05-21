import Link from 'next/link';
import { Button } from '@apexpredix/ui';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="space-y-6 animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-2 px-3 py-1 text-xs text-mute-1 ring-1 ring-white/10">
            <span className="h-2 w-2 rounded-full bg-edge-green animate-pulse-dot" aria-hidden />
            14 agents active • 2.4M events/hr
          </span>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Built on Mathematical Edge
          </h1>
          <p className="max-w-prose text-mute-1 md:text-lg">
            AI Sports Intelligence — built on ELO + Poisson + xG ensemble. Not a gambling operator. 18+ only.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="#cta">Reserve Premium Seat</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="#predictions">See Live Predictions</Link>
            </Button>
          </div>
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="aspect-square w-full max-w-[520px] rounded-2xl bg-ink-1 ring-1 ring-white/10 shadow-glow"
          >
            <div className="grid h-full w-full place-items-center text-mute-2 text-sm">HeroReel (Phase 6)</div>
          </div>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_30%,rgba(34,211,238,0.10),transparent_60%)]" />
    </section>
  );
}
