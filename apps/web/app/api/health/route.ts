import { NextResponse } from 'next/server';

export const runtime = 'edge';

export function GET() {
  return NextResponse.json({
    ok: true,
    build: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    time: new Date().toISOString(),
  });
}
