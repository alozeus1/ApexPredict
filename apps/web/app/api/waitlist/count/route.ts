import { NextResponse } from 'next/server';
import { prisma } from '@apexpredix/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300;

const BASELINE = 14203;

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: true, count: BASELINE });

  try {
    const count = await prisma.waitlistSignup.count({ where: { verifiedAt: { not: null } } });
    return NextResponse.json({ ok: true, count: BASELINE + count });
  } catch {
    return NextResponse.json({ ok: true, count: BASELINE });
  }
}
