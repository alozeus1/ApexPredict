import { NextResponse } from 'next/server';
import { prisma } from '@apexpredix/db';

export const runtime = 'nodejs';
export const revalidate = 300;

const BASELINE = 14203;

export async function GET() {
  try {
    const count = await prisma.waitlistSignup.count({ where: { verifiedAt: { not: null } } });
    return NextResponse.json({ ok: true, count: BASELINE + count });
  } catch {
    return NextResponse.json({ ok: true, count: BASELINE });
  }
}
