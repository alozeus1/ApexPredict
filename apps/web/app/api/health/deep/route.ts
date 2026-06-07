import { NextResponse } from 'next/server';
import { prisma } from '@apexpredix/db';
import { kv } from '@vercel/kv';

/**
 * Deep health probe. Exercises each critical dependency and reports per-check
 * status + latency. Returns 200 when all checks pass, 503 otherwise (same
 * payload shape either way). Intended for uptime monitors and the status page.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FOOTBALL_DATA_ROOT = process.env.FOOTBALL_DATA_BASE_URL ?? 'https://api.football-data.org/v4';

interface Check {
  ok: boolean;
  latencyMs: number;
}

async function timed(fn: () => Promise<void>): Promise<Check> {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

async function checkProvider(): Promise<Check> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  const start = Date.now();
  try {
    // HEAD only — no token, no quota-consuming payload. Reachability check.
    await fetch(FOOTBALL_DATA_ROOT, { method: 'HEAD', signal: controller.signal });
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const [db, kvCheck, footballData] = await Promise.all([
    timed(async () => {
      await prisma.$queryRaw`SELECT 1`;
    }),
    timed(async () => {
      await kv.set('health', '1', { ex: 5 });
    }),
    checkProvider(),
  ]);

  const ok = db.ok && kvCheck.ok && footballData.ok;
  return NextResponse.json(
    { ok, db, kv: kvCheck, providers: { footballData } },
    { status: ok ? 200 : 503 },
  );
}
