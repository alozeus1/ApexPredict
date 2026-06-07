import { Hero } from '@/components/sections/Hero';
import { PredictionsPreview } from '@/components/sections/PredictionsPreview';
import { Methodology } from '@/components/sections/Methodology';
import { Backtest } from '@/components/sections/Backtest';
import { Stats } from '@/components/sections/Stats';
import { Network } from '@/components/sections/Network';
import { Premium } from '@/components/sections/Premium';
import { HowToUse } from '@/components/sections/HowToUse';
import { CTA } from '@/components/sections/CTA';
import { Footer } from '@/components/Footer';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { prisma } from '@apexpredix/db';

// Only surface a waitlist count once it is large enough to be meaningful.
// Below this threshold (or when the DB is unavailable) we show no number at all
// rather than a fabricated one.
const WAITLIST_DISPLAY_THRESHOLD = 5000;

async function getCount(): Promise<number | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const count = await prisma.waitlistSignup.count({ where: { verifiedAt: { not: null } } });
    return count >= WAITLIST_DISPLAY_THRESHOLD ? count : null;
  } catch {
    return null;
  }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const count = await getCount();
  return (
    <>
      <Sidebar pathname="/" />
      <MobileNav pathname="/" />
      <main id="main" className="lg:pl-64">
        <Hero />
        <PredictionsPreview locale={locale} />
        <Methodology />
        <Backtest />
        <Stats />
        <Network />
        <Premium />
        <HowToUse />
        <CTA waitlistCount={count} />
        <Footer />
      </main>
    </>
  );
}
