import { prisma } from '@apexpredix/db';
import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import { getCurrentBillingUser } from '@/lib/billing/auth';

/**
 * Schedules subscription cancellation at the current billing period end.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getCurrentBillingUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (!subscription) return NextResponse.json({ error: 'No active subscription' }, { status: 404 });

  const cancelAt = subscription.currentPeriodEnd ?? new Date();
  const updated = await prisma.subscription.update({
    where: { userId: user.id },
    data: { cancelAt },
  });
  await logAudit(`user:${user.id}`, 'subscription.cancel.scheduled', `subscription:${updated.id}`, { cancelAt });

  return NextResponse.json({ ok: true, cancelAt: cancelAt.toISOString() });
}
