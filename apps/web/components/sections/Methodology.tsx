const PILLARS = [
  { title: 'ELO Model', body: 'Recursive team strength updated post-match with home/away and league weights.' },
  { title: 'Poisson Model', body: 'Score-line probabilities derived from attack/defense intensities.' },
  { title: 'Expected Goals (xG)', body: 'Shot-quality model trained on chance creation, not just outcomes.' },
] as const;

export function Methodology() {
  return (
    <section id="methodology" className="border-b border-white/5 bg-ink-1/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Our Approach</h2>
        <p className="mb-12 max-w-prose text-mute-1">
          Three independent models. One ensemble verdict. ¼ Kelly for bankroll safety.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {PILLARS.map((p) => (
            <article key={p.title} className="rounded-2xl bg-ink-2 p-6 ring-1 ring-white/10">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-mute-1">{p.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 grid place-items-center">
          <span className="rounded-full bg-edge-cyan/15 px-4 py-2 text-edge-cyan ring-1 ring-edge-cyan/30">
            ▾ Ensemble verdict
          </span>
        </div>
        <article className="mt-12 rounded-2xl bg-ink-2 p-6 ring-1 ring-white/10">
          <h3 className="text-lg font-semibold">Kelly Criterion Staking</h3>
          <p className="mt-2 font-mono text-sm text-mute-1">b = odds − 1, p = probability, q = 1 − p — we use ¼ Kelly for safety.</p>
        </article>
      </div>
    </section>
  );
}
