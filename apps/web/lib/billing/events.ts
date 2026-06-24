/**
 * Idempotent billing event handlers. Paystack webhooks are the canonical source
 * for subscription lifecycle state; client checkout state is never trusted.
 */
import { prisma, type Prisma } from '@apexpredix/db';
import { logAudit } from '@/lib/audit';
import type { BillingEvent } from './provider';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function tierFromPlan(plan: unknown): 'WEEKLY' | 'MONTHLY' | 'YEARLY' {
  const text = JSON.stringify(plan ?? '').toLowerCase();
  if (text.includes('year')) return 'YEARLY';
  if (text.includes('week')) return 'WEEKLY';
  return 'MONTHLY';
}

export async function handleBillingEvent(event: BillingEvent, client: Prisma.TransactionClient = prisma) {
  const data = event.data;
  const userId = asString(data.userId) ?? asString((data.metadata as Record<string, unknown> | undefined)?.userId);
  const providerCustomer = asString(data.customer) ?? asString((data.customer as Record<string, unknown> | undefined)?.customer_code) ?? 'unknown';
  const providerSub = asString(data.subscription_code) ?? asString(data.subscription);
  const currentPeriodEnd = asDate(data.next_payment_date) ?? asDate(data.period_end);

  if (event.type === 'charge.success' || event.type === 'charge.failed') {
    await logAudit('system:billing', `billing.${event.type}`, `event:${event.id}`, { provider: event.provider }, client);
    return;
  }

  if (!userId) {
    await logAudit('system:billing', 'billing.event.unmatched', `event:${event.id}`, { type: event.type }, client);
    return;
  }

  if (event.type === 'subscription.create') {
    await client.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier: tierFromPlan(data.plan),
        status: 'ACTIVE',
        provider: 'PAYSTACK',
        providerCustomer,
        providerSub: providerSub ?? null,
        currentPeriodEnd: currentPeriodEnd ?? null,
      },
      update: {
        tier: tierFromPlan(data.plan),
        status: 'ACTIVE',
        provider: 'PAYSTACK',
        providerCustomer,
        providerSub: providerSub ?? null,
        currentPeriodEnd: currentPeriodEnd ?? null,
        cancelAt: null,
      },
    });
  }

  if (event.type === 'subscription.disable') {
    await client.subscription.updateMany({ where: { userId }, data: { status: 'CANCELLED' } });
  }

  if (event.type === 'invoice.create') {
    if (currentPeriodEnd) {
      await client.subscription.updateMany({ where: { userId }, data: { currentPeriodEnd } });
    }
  }

  if (event.type === 'invoice.payment_failed') {
    await client.subscription.updateMany({ where: { userId }, data: { status: 'PAST_DUE' } });
    await logAudit('system:billing', 'billing.dunning.enqueued', `user:${userId}`, { eventId: event.id }, client);
  }

  await logAudit('system:billing', `billing.${event.type}`, `user:${userId}`, { eventId: event.id }, client);
}
