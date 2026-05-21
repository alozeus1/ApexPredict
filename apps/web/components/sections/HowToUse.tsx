const STEPS = [
  { n: 1, title: 'Pick your region', body: 'We tailor pricing and bookmaker recommendations to where you are.' },
  { n: 2, title: 'Browse predictions', body: 'Live forecasts updated every two hours by autonomous agents.' },
  { n: 3, title: 'See value bets', body: 'When the market disagrees with the model, the chip lights up.' },
  { n: 4, title: 'Stake responsibly', body: 'We use ¼ Kelly. Set deposit limits. Take breaks. 18+.' },
];

export function HowToUse() {
  return (
    <section id="how-to-use" className="border-b border-white/5 bg-ink-1/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-10 text-3xl font-semibold tracking-tight md:text-4xl">How to Use ApexPredix</h2>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
