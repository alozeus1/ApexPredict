import { ImageResponse } from 'next/og';
import fixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const m = (fixtures as Match[]).find((x) => x.id === matchId);
  if (!m) return new Response('Not found', { status: 404 });
  const pct = Math.round(m.model.confidence * 100);
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0A0A0A', color: 'white', padding: 64, justifyContent: 'space-between' }}>
        <div style={{ color: '#A1A1AA', fontSize: 26 }}>{m.league}</div>
        <div>
          <div style={{ fontSize: 72, fontWeight: 600 }}>{m.home.name} <span style={{ color: '#A1A1AA' }}>vs</span> {m.away.name}</div>
          <div style={{ marginTop: 20, fontSize: 32, color: '#22D3EE' }}>{m.topPick}</div>
          <div style={{ marginTop: 24, fontSize: 28, color: '#A1A1AA' }}>Confidence {pct}%</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#A1A1AA', fontSize: 22 }}>
          <span><span style={{ color: '#22D3EE' }}>Apex</span>Predix AI</span>
          {m.valueBet && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', padding: '6px 12px', borderRadius: 999 }}>Value Bet</span>}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
