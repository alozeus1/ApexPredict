export function Network() {
  return (
    <section id="network" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Live Intelligence Grid</h2>
        <p className="mb-10 max-w-prose text-mute-1">
          14 autonomous agents. 2.4M events/hr. Self-update every 2 hours. No human intervention needed.
        </p>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 14 }, (_, i) => (
            <li
              key={i}
              data-testid="agent-tile"
              className="rounded-2xl bg-ink-1 p-4 ring-1 ring-white/10"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Agent #{i + 1}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-edge-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-edge-green animate-pulse-dot" aria-hidden /> Live
                </span>
              </div>
              <div className="mt-3 h-8 w-full rounded bg-ink-2" aria-hidden />
              <div className="mt-2 text-xs text-mute-2">Heartbeat 2s ago</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
