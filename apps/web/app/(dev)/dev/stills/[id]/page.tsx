import { notFound } from 'next/navigation';
import { Hero } from '@/components/sections/Hero';
import { Network } from '@/components/sections/Network';
import { Methodology } from '@/components/sections/Methodology';
import { Backtest } from '@/components/sections/Backtest';
import { MatchCard } from '@/components/match/MatchCard';
import { MatchDetail } from '@/components/match/MatchDetail';
import { StillFrame } from '@/components/reel/StillFrame';
import { WordmarkFrame } from '@/components/reel/WordmarkFrame';
import fixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';

export const dynamic = 'force-dynamic';

const FRAMES: Record<string, () => React.ReactNode> = {
  '01': () => <Hero />,
  '02': () => <Network />,
  '03': () => {
    const m = (fixtures as Match[]).find((f) => f.id === 'featured-1')!;
    return <div className="w-[640px]"><MatchCard match={m} locale="en" /></div>;
  },
  '04': () => <Methodology />,
  '05': () => {
    const m = (fixtures as Match[]).find((f) => f.id === 'featured-1')!;
    return <MatchDetail match={m} locale="en" region="US" />;
  },
  '06': () => <Backtest />,
  '07': () => <div className="w-[390px]"><Hero /></div>,
  '08': () => <WordmarkFrame />,
};

export default async function Still({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { id } = await params;
  const render = FRAMES[id];
  if (!render) notFound();
  return <StillFrame id={id}>{render()}</StillFrame>;
}
