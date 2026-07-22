import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@apexpredix/db';
import { buildDataStateReport, MIN_BASELINE_SAMPLE } from '../data-state';

vi.mock('@/lib/providers/registry/rights', () => ({
  rightsGateReport: vi.fn(() => ({ passes: false, blocking: [{ providerId: 'api-sports' }], nonBlocking: [] })),
}));

import { rightsGateReport } from '@/lib/providers/registry/rights';

interface StubOptions {
  evaluations?: number;
  heartbeatAt?: Date | null;
  failing?: string[];
}

function stubPrisma(options: StubOptions = {}): PrismaClient {
  const failing = new Set(options.failing ?? []);
  const counter = (name: string, value: number) => ({
    count: vi.fn(async () => {
      if (failing.has(name)) throw new Error(`${name} exploded`);
      return value;
    }),
    findFirst: vi.fn(async () => null),
  });

  return {
    fixture: { ...counter('fixtures', 10), findFirst: vi.fn(async () => ({ kickoff: new Date('2026-07-01') })) },
    fixtureResult: counter('results', 5),
    predictionSnapshot: counter('predictions', 40),
    predictionEvaluation: counter('evaluations', options.evaluations ?? 0),
    team: counter('teams', 20),
    teamSeason: counter('teamSeasons', 20),
    teamAlias: counter('teamAliases', 30),
    providerEntityMap: {
      count: vi.fn(async (args?: { where?: unknown }) => (args?.where ? 3 : 12)),
      findFirst: vi.fn(async () => null),
    },
    agentHeartbeat: {
      count: vi.fn(async () => 0),
      findFirst: vi.fn(async () =>
        options.heartbeatAt === undefined
          ? { createdAt: new Date() }
          : options.heartbeatAt === null
            ? null
            : { createdAt: options.heartbeatAt },
      ),
    },
  } as unknown as PrismaClient;
}

beforeEach(() => {
  vi.mocked(rightsGateReport).mockReturnValue({ passes: false, blocking: [{ providerId: 'api-sports' }], nonBlocking: [] } as never);
});

describe('buildDataStateReport', () => {
  it('reports a failed count as null and records the error, never as zero', async () => {
    const report = await buildDataStateReport(stubPrisma({ failing: ['fixtures'] }));

    expect(report.counts.fixtures).toBeNull();
    expect(report.errors.fixtures).toContain('exploded');
    // The distinction that matters: a working count of 0 stays 0.
    expect(report.counts.evaluations).toBe(0);
  });

  it('treats an unreadable sample as unknown rather than assuming it is small', async () => {
    const report = await buildDataStateReport(stubPrisma({ failing: ['evaluations'] }));

    expect(report.baseline.settledSample).toBeNull();
    expect(report.baseline.shortfall).toBeNull();
    expect(report.baseline.blockedBy.some((reason) => reason.includes('not zero'))).toBe(true);
  });

  it('is not ready on a large sample while the rights gate fails', async () => {
    const report = await buildDataStateReport(stubPrisma({ evaluations: MIN_BASELINE_SAMPLE * 5 }));

    expect(report.baseline.settledSample).toBe(MIN_BASELINE_SAMPLE * 5);
    expect(report.baseline.shortfall).toBe(0);
    expect(report.baseline.ready).toBe(false);
    expect(report.baseline.blockedBy.some((reason) => reason.includes('rights gate'))).toBe(true);
  });

  it('is not ready on cleared rights while the sample is thin', async () => {
    vi.mocked(rightsGateReport).mockReturnValue({ passes: true, blocking: [], nonBlocking: [] } as never);

    const report = await buildDataStateReport(stubPrisma({ evaluations: 3 }));

    expect(report.baseline.rightsGatePasses).toBe(true);
    expect(report.baseline.ready).toBe(false);
    expect(report.baseline.shortfall).toBe(MIN_BASELINE_SAMPLE - 3);
  });

  it('becomes ready only when every gate clears at once', async () => {
    vi.mocked(rightsGateReport).mockReturnValue({ passes: true, blocking: [], nonBlocking: [] } as never);

    const report = await buildDataStateReport(stubPrisma({ evaluations: MIN_BASELINE_SAMPLE }));

    expect(report.baseline.blockedBy).toEqual([]);
    expect(report.baseline.ready).toBe(true);
  });

  it('flags a missing cron heartbeat as ingestion possibly never having run', async () => {
    vi.mocked(rightsGateReport).mockReturnValue({ passes: true, blocking: [], nonBlocking: [] } as never);

    const report = await buildDataStateReport(
      stubPrisma({ evaluations: MIN_BASELINE_SAMPLE, heartbeatAt: null }),
    );

    expect(report.freshness.lastCronHeartbeatAt).toBeNull();
    expect(report.freshness.cronStale).toBeNull();
    expect(report.baseline.blockedBy.some((reason) => reason.includes('never have run'))).toBe(true);
    expect(report.baseline.ready).toBe(false);
  });

  it('flags a stale cron heartbeat distinctly from a missing one', async () => {
    vi.mocked(rightsGateReport).mockReturnValue({ passes: true, blocking: [], nonBlocking: [] } as never);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const report = await buildDataStateReport(
      stubPrisma({ evaluations: MIN_BASELINE_SAMPLE, heartbeatAt: threeDaysAgo }),
    );

    expect(report.freshness.cronStale).toBe(true);
    expect(report.baseline.blockedBy.some((reason) => reason.includes('stale'))).toBe(true);
  });

  it('separates usable verified mappings from unusable unverified ones', async () => {
    const report = await buildDataStateReport(stubPrisma());

    expect(report.mapping.total).toBe(12);
    expect(report.mapping.verified).toBe(3);
    expect(report.mapping.unverified).toBe(9);
  });
});
