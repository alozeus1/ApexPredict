import { getBacktestMetrics } from '@/lib/data/get-backtest-metrics';

export async function Backtest() {
  const metrics = await getBacktestMetrics();

  return (
    <section id="backtest" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Historical Backtesting</h2>
        <p className="mb-10 max-w-prose text-mute-1">
          {metrics.summary}
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {metrics.tiles.map((t) => (
            <div key={t.label} className="rounded-2xl bg-ink-1 p-4 ring-1 ring-white/10">
              <div className="text-xs uppercase tracking-wide text-mute-2">{t.label}</div>
              <div className="mt-1 text-xl font-semibold">{t.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
