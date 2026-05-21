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

export default function Home() {
  return (
    <>
      <Sidebar pathname="/" />
      <MobileNav pathname="/" />
      <main id="main" className="lg:pl-64">
        <Hero />
        <PredictionsPreview />
        <Methodology />
        <Backtest />
        <Stats />
        <Network />
        <Premium />
        <HowToUse />
        <CTA waitlistCount={14203} />
        <Footer />
      </main>
    </>
  );
}
