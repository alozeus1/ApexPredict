const STATS = [
  { value: '89.3%', label: 'Accuracy' },
  { value: '14 leagues', label: 'Coverage' },
  { value: '7 sports', label: 'Coverage' },
  { value: '2.4M events/hr', label: 'Throughput' },
  { value: '+8.5% ROI', label: 'Backtest' },
  { value: 'Last 200', label: 'Sample window' },
] as const;

export function Stats() {
  return (
    <section id="stats" className="border-b border-white/5 bg-ink-1/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-10 text-3xl font-semibold tracking-tight md:text-4xl">Numbers That Speak</h2>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {STATS.map((s) => (
            <div key={s.value} className="rounded-2xl bg-ink-2 p-5 ring-1 ring-white/10">
              <dt className="text-xs uppercase tracking-wide text-mute-2">{s.label}</dt>
              <dd className="mt-1 text-2xl font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
