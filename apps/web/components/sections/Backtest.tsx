const TILES = [
  { label: 'Total Staked', value: '$100' },
  { label: 'Total Returned', value: '$108.50' },
  { label: 'Net Profit', value: '+$8.50' },
  { label: 'ROI', value: '+8.5%' },
  { label: 'Win Rate', value: '89.3%' },
  { label: 'Active Streak', value: '6W' },
] as const;

export function Backtest() {
  return (
    <section id="backtest" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Historical Backtesting</h2>
        <p className="mb-10 max-w-prose text-mute-1">
          Simulates $10 flat stake on each of 10 historical matches. Past performance ≠ future.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {TILES.map((t) => (
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
