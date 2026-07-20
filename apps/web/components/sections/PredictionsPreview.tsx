import Link from 'next/link';
import { MatchCard } from '@/components/match/MatchCard';
import { getFixtures } from '@/lib/data/get-fixtures';

interface Props { locale: string; }

export async function PredictionsPreview({ locale }: Props) {
  const featured = (await getFixtures()).filter((m) => m.featured).slice(0, 6);
  return (
    <section id="predictions" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Live Predictions</h2>
            <p className="mt-2 text-mute-1">Model: standings-strength ensemble • refreshed daily</p>
          </div>
          <Link href="/predictions" className="text-sm text-edge-cyan hover:underline">
            Open Full Predictions →
          </Link>
        </div>
        {featured.length === 0 ? (
          // Live data unavailable. Render an empty state rather than demo
          // fixtures — see lib/data/demo-mode.ts.
          <div role="status" className="rounded-lg border border-white/10 bg-white/5 px-6 py-10 text-center">
            <p className="text-lg font-medium">No predictions available right now</p>
            <p className="mt-2 text-sm text-mute-1">
              We publish predictions only when the underlying data is complete and current.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((m) => <MatchCard key={m.id} match={m} locale={locale} />)}
          </div>
        )}
      </div>
    </section>
  );
}
