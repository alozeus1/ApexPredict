import { describe, it, expect } from 'vitest';
import { renderHeartbeats, type HeartbeatRow } from '../heartbeat';

const at = (iso: string): Date => new Date(iso);
const NOW = at('2026-06-05T12:00:00.000Z').getTime();

const rows: HeartbeatRow[] = [
  { agentId: 'fixture-sync', status: 'live', message: 'old', durationMs: 10, createdAt: at('2026-06-05T11:00:00.000Z') },
  { agentId: 'fixture-sync', status: 'live', message: 'new', durationMs: 20, createdAt: at('2026-06-05T11:59:00.000Z') },
  { agentId: 'backtest', status: 'error', message: 'boom', durationMs: 5, createdAt: at('2026-06-05T11:58:00.000Z') },
  { agentId: 'settlement', status: 'live', message: 'stale', durationMs: 1, createdAt: at('2026-06-03T00:00:00.000Z') },
];

describe('renderHeartbeats', () => {
  it('keeps only the latest row per agent', () => {
    const views = renderHeartbeats(rows, NOW);
    const fixture = views.find((v) => v.agentId === 'fixture-sync');
    expect(fixture?.message).toBe('new');
    expect(views).toHaveLength(3);
  });

  it('marks live + recent agents healthy', () => {
    const views = renderHeartbeats(rows, NOW);
    expect(views.find((v) => v.agentId === 'fixture-sync')?.healthy).toBe(true);
  });

  it('marks error agents unhealthy', () => {
    const views = renderHeartbeats(rows, NOW);
    expect(views.find((v) => v.agentId === 'backtest')?.healthy).toBe(false);
  });

  it('marks live-but-stale agents unhealthy (older than maxAgeMs)', () => {
    const views = renderHeartbeats(rows, NOW);
    expect(views.find((v) => v.agentId === 'settlement')?.healthy).toBe(false);
  });

  it('sorts by agentId', () => {
    const views = renderHeartbeats(rows, NOW);
    expect(views.map((v) => v.agentId)).toEqual(['backtest', 'fixture-sync', 'settlement']);
  });
});
