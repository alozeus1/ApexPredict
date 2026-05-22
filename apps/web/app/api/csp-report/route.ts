import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'edge';

export async function POST(req: Request) {
  const report = await req.text();
  try {
    Sentry.captureMessage('csp_report', { level: 'warning', extra: { report } });
  } catch {
    console.warn('[csp-report] received', report);
  }
  return new NextResponse(null, { status: 204 });
}
