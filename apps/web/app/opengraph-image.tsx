import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'ApexPredict AI — Sports Prediction Intelligence';

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0A0A0A', color: 'white', padding: 64, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#A1A1AA', fontSize: 22 }}>
          <span style={{ width: 10, height: 10, background: '#22C55E', borderRadius: 999 }} />
          14 agents active • 2.4M events/hr
        </div>
        <div>
          <div style={{ fontSize: 84, fontWeight: 600, letterSpacing: -1.5 }}>Built on Mathematical Edge</div>
          <div style={{ marginTop: 16, fontSize: 28, color: '#A1A1AA' }}>ELO + Poisson + xG ensemble engine.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#A1A1AA', fontSize: 22 }}>
          <span><span style={{ color: '#22D3EE' }}>Apex</span>Predix AI</span>
          <span>by Maralito Labs</span>
        </div>
      </div>
    ),
    size,
  );
}
