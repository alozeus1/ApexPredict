import Link from 'next/link';

export function PredictionsPreview() {
  return (
    <section id="predictions" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Live Predictions</h2>
            <p className="mt-2 text-mute-1">Model: Poisson-xG v3.2 • refreshed every 2h</p>
          </div>
          <Link href="/predictions" className="text-sm text-edge-cyan hover:underline">
            Open Full Predictions →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              data-testid="match-card-placeholder"
              className="aspect-[16/11] rounded-2xl bg-ink-1 ring-1 ring-white/10"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
