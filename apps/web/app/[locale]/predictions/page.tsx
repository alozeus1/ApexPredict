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
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map((m) => <MatchCard key={m.id} match={m} locale={locale} />)}
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}
