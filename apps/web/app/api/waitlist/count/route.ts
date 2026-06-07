import { NextResponse } from 'next/server';
import { prisma } from '@apexpredix/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET() {
  // Always return the real verified-signup count — never a fabricated baseline.
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: true, count: 0 });

  try {
    const count = await prisma.waitlistSignup.count({ where: { verifiedAt: { not: null } } });
    return NextResponse.json({ ok: true, count });
  } catch {
    return NextResponse.json({ ok: true, count: 0 });
  }
}
