import type { ModelOutput } from '@apexpredix/types';

interface Props { model: ModelOutput; }

export function ModelBreakdown({ model }: Props) {
  const rows = [
    { label: 'ELO', value: model.elo },
    { label: 'Poisson', value: model.poisson },
    { label: 'xG', value: model.xg },
    { label: 'Ensemble', value: model.ensemble },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = Math.round(r.value * 100);
        return (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-xs text-mute-1">
              <span>{r.label}</span>
              <span className="font-mono text-white">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-2">
              <div className="h-full rounded-full bg-edge-cyan" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
