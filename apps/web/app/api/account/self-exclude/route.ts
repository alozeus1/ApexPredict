import { prisma, type Prisma } from '@apexpredix/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { logAudit } from '@/lib/audit';

/**
 * Starts an irreversible self-exclusion window for the authenticated user.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ window: z.enum(['24h', '7d', '30d', 'permanent']) });

function exclusionUntil(window: z.infer<typeof bodySchema>['window']) {
  const now = Date.now();
  if (window === '24h') return new Date(now + 24 * 60 * 60 * 1000);
  if (window === '7d') return new Date(now + 7 * 24 * 60 * 60 * 1000);
  if (window === '30d') return new Date(now + 30 * 24 * 60 * 60 * 1000);
  return new Date('9999-12-31T23:59:59.999Z');
}

function rgObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? { ...value } : {};
}

function activeSelfExcludedUntil(value: unknown) {
  const flags = rgObject(value);
  const until = typeof flags.selfExcludedUntil === 'string' ? new Date(flags.selfExcludedUntil) : null;
  return until && until.getTime() > Date.now() ? until : null;
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid self-exclusion window' }, { status: 400 });

  const session = await auth().catch(() => null);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, rgFlags: true } });
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const activeUntil = activeSelfExcludedUntil(user.rgFlags);
  if (activeUntil) {
    return NextResponse.json({ error: 'Self-exclusion is already active', selfExcludedUntil: activeUntil.toISOString() }, { status: 409 });
  }

  const selfExcludedUntil = exclusionUntil(parsed.data.window);
  const rgFlags = {
    ...rgObject(user.rgFlags),
    selfExcludedUntil: selfExcludedUntil.toISOString(),
  };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { rgFlags: rgFlags as Prisma.InputJsonValue },
    });
    await logAudit(`user:${user.id}`, 'rg.selfExclude.start', `user:${user.id}`, {
      window: parsed.data.window,
      selfExcludedUntil: selfExcludedUntil.toISOString(),
    }, tx);
  });

  return NextResponse.json({ ok: true, selfExcludedUntil: selfExcludedUntil.toISOString() });
}
