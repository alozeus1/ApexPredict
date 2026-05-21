import Link from 'next/link';
import { MatchCard } from '@/components/match/MatchCard';
import fixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';

interface Props { locale: string; }

export function PredictionsPreview({ locale }: Props) {
  const featured = (fixtures as Match[]).filter((m) => m.featured).slice(0, 6);
  return (
    <section id="predictions" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Live Predictions</h2>
            <p className="mt-2 text-mute-1">Model: Poisson-xG v3.2 • refreshed every 2h</p>
          </div>
          <Link href="/predictions" className="text-sm text-edge-cyan hover:underline">
            Open Full Predictions →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((m) => <MatchCard key={m.id} match={m} locale={locale} />)}
        </div>
      </div>
    </section>
  );
}
