import type { Match } from '@apexpredix/types';
import { safeFormatDate } from '@/lib/format/date';
import { ConfidenceBar } from './ConfidenceBar';
import { ValueBetChip } from './ValueBetChip';
import { OddsCompare } from './OddsCompare';
import { ModelBreakdown } from './ModelBreakdown';

interface Props { match: Match; locale: string; region: string; }

export function MatchDetail({ match, locale, region }: Props) {
  const kickoff = safeFormatDate(match.kickoff, locale, { dateStyle: 'full', timeStyle: 'short' });
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 space-y-10">
      <header>
        <div className="text-xs uppercase tracking-wide text-mute-2">{match.league}</div>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{match.home.name} <span className="text-mute-1">vs</span> {match.away.name}</h1>
        <div className="mt-2 text-sm text-mute-1">{kickoff}</div>
      </header>

      <section aria-labelledby="verdict" className="rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10">
        <h2 id="verdict" className="text-sm uppercase tracking-wide text-mute-1">Ensemble verdict</h2>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xl font-semibold">{match.topPick}</div>
          {match.valueBet && <ValueBetChip />}
        </div>
        <div className="mt-4"><ConfidenceBar value={match.model.confidence} /></div>
      </section>

      <section aria-labelledby="odds">
        <h2 id="odds" className="mb-4 text-sm uppercase tracking-wide text-mute-1">Odds comparison · region {region}</h2>
        <OddsCompare odds={match.odds} region={region} />
      </section>

      <section aria-labelledby="breakdown">
        <h2 id="breakdown" className="mb-4 text-sm uppercase tracking-wide text-mute-1">Model breakdown</h2>
        <ModelBreakdown model={match.model} />
      </section>

      <section aria-labelledby="narrative">
        <h2 id="narrative" className="mb-4 text-sm uppercase tracking-wide text-mute-1">Why this hits</h2>
        <p className="text-mute-1 leading-relaxed">{match.narrative}</p>
      </section>

      <p className="text-xs text-mute-2">
        ApexPredict AI is an analytics service, not a gambling operator. 18+ only. Past performance ≠ future results.
      </p>
    </article>
  );
}
