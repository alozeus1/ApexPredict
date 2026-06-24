import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { kv } from '@vercel/kv';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentBillingUser } from '@/lib/billing/auth';
import { getActiveProvider } from '@/lib/billing/provider';

/**
 * Creates a billing checkout session. In local/test without Paystack keys this
 * returns the development billing stub instead of calling a paid vendor.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ tier: z.enum(['weekly', 'monthly', 'yearly']) });

async function readCachedResult(key: string) {
  try {
    return await kv.get<string>(key);
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'billing.checkout.idempotency' } });
    return null;
  }
}

async function writeCachedResult(key: string, value: unknown) {
  try {
    await kv.set(key, JSON.stringify(value), { ex: 600 });
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'billing.checkout.idempotency' } });
  }
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid billing tier' }, { status: 400 });
  }

  const hasLiveTestKey = Boolean(process.env.PAYSTACK_SECRET_KEY_TEST);
  const user = hasLiveTestKey ? await getCurrentBillingUser() : null;
  const canUseDevUser = !process.env.PAYSTACK_SECRET_KEY_TEST || process.env.NODE_ENV !== 'production';
  if (!user && !canUseDevUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const userId = user?.id ?? 'dev-user';
  const idempotencyKey = request.headers.get('idempotency-key') ?? randomUUID();
  const cacheKey = `billing:checkout:${userId}:${parsed.data.tier}:${idempotencyKey}`;
  const cached = await readCachedResult(cacheKey);
  if (cached) return NextResponse.json(JSON.parse(cached));

  const result = await getActiveProvider().getCheckoutUrl({
    tier: parsed.data.tier,
    userId,
    idempotencyKey,
  });
  await writeCachedResult(cacheKey, result);

  return NextResponse.json(result);
}
