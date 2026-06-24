import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { MatchDetail } from '@/components/match/MatchDetail';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { Footer } from '@/components/Footer';
import fixtures from '@/data/fixtures.json';
import { getMatch } from '@/lib/data/get-match';
import type { Match, RegionCode } from '@apexpredix/types';
import { JsonLd, sportsEventLD, breadcrumbLD } from '@/components/seo/JsonLd';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; matchId: string }> }) {
  const { locale, matchId } = await params;
  const match = await getMatch(matchId);
  if (!match) return {};
  return pageMetadata({
    locale,
    path: `/predictions/${match.id}`,
    title: `${match.home.name} vs ${match.away.name} — ApexPredict AI`,
    description: `${match.topPick} • Confidence ${Math.round(match.model.confidence * 100)}% • ${match.league}`,
    ogImage: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/og/match/${match.id}`,
  });
}

export function generateStaticParams() {
  return (fixtures as Match[]).map((m) => ({ matchId: m.id }));
}

export default async function MatchPage({ params }: { params: Promise<{ locale: string; matchId: string }> }) {
  const { locale, matchId } = await params;
  setRequestLocale(locale);
  const match = await getMatch(matchId);
  if (!match) notFound();
  const cookieStore = await cookies();
  const region = ((cookieStore.get('apexpredix-region')?.value ?? 'US') as RegionCode);

  return (
    <>
      <JsonLd data={sportsEventLD(match)} />
      <JsonLd data={breadcrumbLD([
        { name: 'Predictions', href: `/${locale}/predictions` },
        { name: `${match.home.name} vs ${match.away.name}`, href: `/${locale}/predictions/${match.id}` },
      ])} />
      <Sidebar pathname={`/predictions/${matchId}`} />
      <MobileNav pathname={`/predictions/${matchId}`} />
      <main id="main" className="lg:pl-64">
        <MatchDetail match={match} locale={locale} region={region} />
        <Footer />
      </main>
    </>
  );
}
