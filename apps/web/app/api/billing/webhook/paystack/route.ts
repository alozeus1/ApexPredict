import { prisma, type Prisma } from '@apexpredix/db';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleBillingEvent } from '@/lib/billing/events';
import { PaystackBillingProvider } from '@/lib/billing/paystack';

/**
 * Paystack webhook endpoint. Signature verification is mandatory and delivery
 * records make each provider event idempotent.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature') ?? '';
  const provider = new PaystackBillingProvider();

  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = provider.parseEvent(rawBody);

  try {
    await prisma.$transaction(async (tx) => {
      const delivery = await tx.webhookDelivery.create({
        data: {
          provider: event.provider,
          eventId: event.id,
          eventType: event.type,
          payload: event.data as Prisma.InputJsonValue,
        },
      });

      await handleBillingEvent(event, tx);
      await tx.webhookDelivery.update({
        where: { id: delivery.id },
        data: { processedAt: new Date() },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw error;
  }

  return NextResponse.json({ ok: true, duplicate: false });
}
