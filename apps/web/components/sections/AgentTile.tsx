'use client';
import { useEffect, useState } from 'react';
import type { AgentJSON } from '@/data/agents.schema';

interface Props { agent: AgentJSON; }

export function AgentTile({ agent }: Props) {
  const [seconds, setSeconds] = useState(() => Math.floor(Math.random() * 5) + 1);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s + 1) % Math.max(10, agent.heartbeatJitterSec)), 1000);
    return () => clearInterval(id);
  }, [agent.heartbeatJitterSec]);
  const max = Math.max(...agent.sparkline);
  return (
    <li data-testid="agent-tile" className="rounded-2xl bg-ink-1 p-4 ring-1 ring-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{agent.name}</span>
        <span className="inline-flex items-center gap-1.5 text-xs" aria-live="polite" role="status">
          <span className={`h-1.5 w-1.5 rounded-full ${agent.status === 'live' ? 'bg-edge-green animate-pulse-dot' : 'bg-mute-2'}`} aria-hidden />
          <span className={agent.status === 'live' ? 'text-edge-green' : 'text-mute-2'}>
            {agent.status === 'live' ? 'Live' : 'Idle'}
          </span>
        </span>
      </div>
      <p className="mt-1 text-xs text-mute-1">{agent.capability}</p>
      <svg viewBox="0 0 100 24" className="mt-3 h-6 w-full" aria-hidden>
        <polyline
          points={agent.sparkline.map((v, i) => `${(i / (agent.sparkline.length - 1)) * 100},${24 - (v / max) * 22}`).join(' ')}
          fill="none"
          stroke="currentColor"
          className="text-edge-cyan"
          strokeWidth="1.5"
        />
      </svg>
      <div className="mt-2 text-[10px] text-mute-2">Heartbeat {seconds}s ago</div>
    </li>
  );
}
