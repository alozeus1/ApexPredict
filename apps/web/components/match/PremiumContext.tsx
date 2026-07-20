import type { MatchPremiumContext } from '@apexpredix/types';
import { safeFormatDate } from '@/lib/format/date';

interface Props {
  context?: MatchPremiumContext;
  locale: string;
}

function statusClass(available: boolean) {
  return available ? 'text-edge-cyan' : 'text-mute-2';
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function PremiumContext({ context, locale }: Props) {
  if (!context) return null;

  const signals = [
    { label: 'Weather', value: context.weather },
    { label: 'Injuries', value: context.injuries },
    { label: 'Lineups', value: context.lineups },
    { label: 'Referee', value: context.referee },
  ];

  return (
    <section aria-labelledby="premium-context" className="space-y-6">
      <div>
        <h2 id="premium-context" className="mb-4 text-sm uppercase tracking-wide text-mute-1">Premium context</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {signals.map((signal) => (
            <div key={signal.label} className="rounded-xl bg-ink-1 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{signal.label}</div>
                <div className={`text-xs uppercase ${statusClass(signal.value.available)}`}>
                  {signal.value.available ? 'Live' : 'Ready'}
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-mute-1">{signal.value.summary}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm uppercase tracking-wide text-mute-1">Odds movement</h2>
        {context.oddsMovement.length === 0 ? (
          <div className="rounded-xl bg-ink-1 p-4 text-sm text-mute-1 ring-1 ring-white/10">
            No bookmaker movement captured yet. This activates as soon as live odds are connected.
          </div>
        ) : (
          <ul className="grid gap-2">
            {context.oddsMovement.map((movement) => (
              <li key={`${movement.bookCode}-${movement.market}-${movement.capturedAt}`} className="flex items-center justify-between rounded-xl bg-ink-1 px-4 py-3 ring-1 ring-white/10">
                <div>
                  <div className="text-sm font-medium">{movement.bookCode} · {movement.market}</div>
                  <div className="text-xs text-mute-2">{safeFormatDate(movement.capturedAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">{movement.previousPrice.toFixed(2)} → {movement.currentPrice.toFixed(2)}</div>
                  <div className="text-xs text-edge-amber">{pct(movement.movementPct)} move</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {context.performance && (
        <div>
          <h2 className="mb-4 text-sm uppercase tracking-wide text-mute-1">Model performance</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-ink-1 p-4 ring-1 ring-white/10">
              <div className="text-xs uppercase text-mute-2">Sample</div>
              <div className="mt-1 font-semibold">{context.performance.sampleSize}</div>
            </div>
            <div className="rounded-xl bg-ink-1 p-4 ring-1 ring-white/10">
              <div className="text-xs uppercase text-mute-2">ROI</div>
              <div className="mt-1 font-semibold">{pct(context.performance.roi)}</div>
            </div>
            <div className="rounded-xl bg-ink-1 p-4 ring-1 ring-white/10">
              <div className="text-xs uppercase text-mute-2">Brier</div>
              <div className="mt-1 font-semibold">{context.performance.brierScore.toFixed(3)}</div>
            </div>
            <div className="rounded-xl bg-ink-1 p-4 ring-1 ring-white/10">
              <div className="text-xs uppercase text-mute-2">Calibration</div>
              <div className="mt-1 font-semibold">{pct(context.performance.calibrationError)}</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
