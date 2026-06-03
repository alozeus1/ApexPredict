import Link from 'next/link';
import type { Route } from 'next';
import type { Match } from '@apexpredix/types';
import { ConfidenceBar } from './ConfidenceBar';
import { ValueBetChip } from './ValueBetChip';

interface Props { match: Match; locale: string; }

export function MatchCard({ match, locale }: Props) {
  const kickoff = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(match.kickoff));
  return (
    <Link
      href={`/predictions/${match.id}` as Route<string>}
      className="group block rounded-2xl bg-ink-1 p-5 ring-1 ring-white/10 transition hover:ring-edge-cyan/40"
    >
      <div className="flex items-center justify-between text-xs text-mute-2">
        <span>{match.league}</span>
        <span>{kickoff}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 items-center gap-3">
        <div className="text-center">
          <div className="text-sm font-semibold">{match.home.name}</div>
          <div className="text-[10px] text-mute-2">{match.home.code}</div>
        </div>
        <div className="text-center text-xs text-mute-1">vs</div>
        <div className="text-center">
          <div className="text-sm font-semibold">{match.away.name}</div>
          <div className="text-[10px] text-mute-2">{match.away.code}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-medium text-white">{match.topPick}</span>
        {match.valueBet && <ValueBetChip />}
      </div>
      <div className="mt-4">
        <ConfidenceBar value={match.model.confidence} />
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-wide text-mute-2">Model: calibrated ensemble</div>
    </Link>
  );
}
