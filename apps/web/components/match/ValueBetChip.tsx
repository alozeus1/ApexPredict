import { Zap } from 'lucide-react';

export function ValueBetChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-edge-amber/15 px-2 py-0.5 text-xs font-medium text-edge-amber ring-1 ring-edge-amber/30">
      <Zap size={12} aria-hidden /> Value Bet
    </span>
  );
}
