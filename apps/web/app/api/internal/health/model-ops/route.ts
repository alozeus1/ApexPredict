import { NextResponse } from 'next/server';
import { prisma } from '@apexpredix/db';
import { requireServiceAuth } from '@/lib/internal-auth';
import { buildModelOpsReport } from '@/lib/health/model-ops';

export const runtime = 'nodejs';

/**
 * Model-ops observability readout.
 *
 *   GET /api/internal/health/model-ops?windowHours=36
 *
 * Read-only and service-authed (`reports:read`). Answers "did the last refresh
 * actually do its job": prediction attribution, feature-vector coverage, how
 * many fixtures got live xG, whether adaptive weights have started moving, shadow
 * settlements, drift breaches, and the latest backtest risk numbers.
 */
export async function GET(request: Request) {
  const auth = requireServiceAuth(request, 'reports:read');
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const rawWindow = Number(url.searchParams.get('windowHours'));
  const windowHours = Number.isFinite(rawWindow) && rawWindow > 0 && rawWindow <= 720 ? rawWindow : 36;

  const report = await buildModelOpsReport(prisma, { asOf: new Date(), windowHours });
  return NextResponse.json({ ok: true, report });
}
