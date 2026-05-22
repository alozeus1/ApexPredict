import { setRequestLocale } from 'next-intl/server';
import { Methodology } from '@/components/sections/Methodology';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { Footer } from '@/components/Footer';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: '/methodology',
    title: 'Methodology — ApexPredix AI',
    description: 'Our approach: ELO + Poisson + xG ensemble, with ¼ Kelly criterion staking for bankroll safety.',
  });
}

export default async function MethodologyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Sidebar pathname="/methodology" />
      <MobileNav pathname="/methodology" />
      <main id="main" className="lg:pl-64">
        <Methodology />
        <Footer />
      </main>
    </>
  );
}
