import { setRequestLocale } from 'next-intl/server';
import { Premium } from '@/components/sections/Premium';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { Footer } from '@/components/Footer';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: '/premium',
    title: 'Premium — ApexPredict AI',
    description: 'Premium features: 10 predictions/day, deep analysis, value-bet alerts, Kelly staking calculator, Telegram alerts, regional PPP pricing.',
  });
}

export default async function PremiumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Sidebar pathname="/premium" />
      <MobileNav pathname="/premium" />
      <main id="main" className="lg:pl-64">
        <Premium />
        <Footer />
      </main>
    </>
  );
}
