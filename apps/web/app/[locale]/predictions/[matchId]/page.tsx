import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { MatchDetail } from '@/components/match/MatchDetail';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { Footer } from '@/components/Footer';
import fixtures from '@/data/fixtures.json';
import type { Match, RegionCode } from '@apexpredix/types';

export const revalidate = 60;

export function generateStaticParams() {
  return (fixtures as Match[]).map((m) => ({ matchId: m.id }));
}

export default async function MatchPage({ params }: { params: Promise<{ locale: string; matchId: string }> }) {
  const { locale, matchId } = await params;
  setRequestLocale(locale);
  const match = (fixtures as Match[]).find((m) => m.id === matchId);
  if (!match) notFound();
  const cookieStore = await cookies();
  const region = ((cookieStore.get('apexpredix-region')?.value ?? 'US') as RegionCode);

  return (
    <>
      <Sidebar pathname={`/predictions/${matchId}`} />
      <MobileNav pathname={`/predictions/${matchId}`} />
      <main id="main" className="lg:pl-64">
        <MatchDetail match={match} locale={locale} region={region} />
        <Footer />
      </main>
    </>
  );
}
