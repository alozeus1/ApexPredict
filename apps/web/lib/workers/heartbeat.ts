import { prisma } from '@apexpredix/db';

export type HeartbeatStatus = 'live' | 'error' | 'idle' | 'stale';

/** Persist a heartbeat for a named agent/worker. */
export async function writeHeartbeat(
  agentId: string,
  status: HeartbeatStatus | string,
  message: string,
  durationMs?: number,
): Promise<void> {
  await prisma.agentHeartbeat.create({
    data: { agentId, status, message, durationMs: durationMs ?? null },
  });
}

export interface HeartbeatRow {
  agentId: string;
  status: string;
  message: string | null;
  durationMs: number | null;
  createdAt: Date;
}

export interface HeartbeatView {
  agentId: string;
  status: string;
  message: string | null;
  durationMs: number | null;
  ageMs: number;
  healthy: boolean;
}

/**
 * Reduce raw heartbeat rows to the latest-per-agent view for a status page.
 * `now` is injected (not read from the clock) so the helper is pure + testable.
 * An agent is healthy when its latest status is 'live' and not older than maxAgeMs.
 */
export function renderHeartbeats(
  rows: HeartbeatRow[],
  now: number,
  maxAgeMs = 25 * 60 * 60 * 1000,
): HeartbeatView[] {
  const latest = new Map<string, HeartbeatRow>();
  for (const row of rows) {
    const prev = latest.get(row.agentId);
    if (!prev || row.createdAt.getTime() > prev.createdAt.getTime()) latest.set(row.agentId, row);
  }
  return [...latest.values()]
    .map((r) => {
      const ageMs = now - r.createdAt.getTime();
      return {
        agentId: r.agentId,
        status: r.status,
        message: r.message,
        durationMs: r.durationMs,
        ageMs,
        healthy: r.status === 'live' && ageMs <= maxAgeMs,
      };
    })
    .sort((a, b) => a.agentId.localeCompare(b.agentId));
}
