import { cn } from '@apexpredix/ui';

interface Props { value: number; }

export function ConfidenceBar({ value }: Props) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-mute-1">
        <span>Confidence</span>
        <span className="font-mono text-white">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div
          className={cn('h-full rounded-full', pct >= 75 ? 'bg-edge-green' : pct >= 50 ? 'bg-edge-cyan' : 'bg-edge-amber')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
