import { setRequestLocale } from 'next-intl/server';
import { MatchCard } from '@/components/match/MatchCard';
import { getFixtures } from '@/lib/data/get-fixtures';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { Footer } from '@/components/Footer';

export const revalidate = 60;

export default async function PredictionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sorted = await getFixtures();
  return (
    <>
      <Sidebar pathname="/predictions" />
      <MobileNav pathname="/predictions" />
      <main id="main" className="lg:pl-64">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Live Predictions</h1>
          <p className="mt-2 text-mute-1">Model: standings-strength ensemble • refreshed daily</p>
          {sorted.length === 0 ? (
            // Live data unavailable. Show nothing rather than demo fixtures —
            // an empty state is honest, invented predictions are not.
            <div
              role="status"
              className="mt-10 rounded-lg border border-white/10 bg-white/5 px-6 py-10 text-center"
            >
              <p className="text-lg font-medium">No predictions available right now</p>
              <p className="mt-2 text-sm text-mute-1">
                We publish predictions only when the underlying data is complete and current. Please check
                back shortly.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sorted.map((m) => <MatchCard key={m.id} match={m} locale={locale} />)}
            </div>
          )}
        </section>
        <Footer />
      </main>
    </>
  );
}
