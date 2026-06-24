// The decision workflow — value-bet signal service, not an oracle.
const STEPS = [
  { n: 1, title: 'We compute the probability', body: 'Our model produces a calibrated probability for each match outcome.' },
  { n: 2, title: 'We compare to live odds', body: 'Against SportyBet, Bet9ja, 1xBet, BetKing, and MSport.' },
  { n: 3, title: 'We flag value bets', body: 'If the market disagrees by ≥ 3 percentage points in our favour, the chip lights up.' },
  { n: 4, title: 'You decide', body: 'You choose whether to take it. Use the Kelly tool for a stake suggestion.' },
  { n: 5, title: 'We track the outcome', body: 'Every pick is settled and fed back into our public scoreboard.' },
];

export function HowToUse() {
  return (
    <section id="how-to-use" className="border-b border-white/5 bg-ink-1/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-10 text-3xl font-semibold tracking-tight md:text-4xl">How to use ApexPredict</h2>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <li key={s.n} data-testid="step-card" className="rounded-2xl bg-ink-2 p-6 ring-1 ring-white/10">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-edge-cyan/15 font-mono text-edge-cyan">{s.n}</div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-mute-1">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
