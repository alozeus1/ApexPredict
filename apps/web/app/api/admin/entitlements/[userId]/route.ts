import { prisma } from '@apexpredix/db';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { requireAdminBillingUser } from '@/lib/billing/auth';

/**
 * Manual entitlement override for support/admin operations. Every change is
 * audited and only ADMIN users may call it.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  tier: z.enum(['FREE', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  status: z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED']).default('ACTIVE'),
  currentPeriodEnd: z.string().datetime().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdminBillingUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid entitlement override' }, { status: 400 });

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      tier: parsed.data.tier,
      status: parsed.data.status,
      provider: 'PAYSTACK',
      providerCustomer: `manual:${userId}`,
      currentPeriodEnd: parsed.data.currentPeriodEnd ? new Date(parsed.data.currentPeriodEnd) : null,
    },
    update: {
      tier: parsed.data.tier,
      status: parsed.data.status,
      currentPeriodEnd: parsed.data.currentPeriodEnd ? new Date(parsed.data.currentPeriodEnd) : null,
    },
  });

  await logAudit(`user:${admin.id}`, 'admin.entitlement.override', `user:${userId}`, {
    subscriptionId: subscription.id,
    tier: parsed.data.tier,
    status: parsed.data.status,
  });

  return NextResponse.json({ ok: true, subscription });
}
