import { setRequestLocale } from 'next-intl/server';
import { HowToUse } from '@/components/sections/HowToUse';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { Footer } from '@/components/Footer';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: '/how-it-works',
    title: 'How to Use — ApexPredix AI',
    description: 'Four steps: pick your region, browse predictions, see value bets, stake responsibly.',
  });
}

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Sidebar pathname="/how-it-works" />
      <MobileNav pathname="/how-it-works" />
      <main id="main" className="lg:pl-64">
        <HowToUse />
        <Footer />
      </main>
    </>
  );
}
