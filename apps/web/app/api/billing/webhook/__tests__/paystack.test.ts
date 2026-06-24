import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  class KnownRequestError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }

  return {
    KnownRequestError,
    transaction: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    handleBillingEvent: vi.fn(),
  };
});

vi.mock('@apexpredix/db', () => ({
  Prisma: { PrismaClientKnownRequestError: db.KnownRequestError },
  prisma: { $transaction: db.transaction },
}));

vi.mock('@/lib/billing/events', () => ({ handleBillingEvent: db.handleBillingEvent }));

const secret = 'test-paystack-secret';

function signedRequest(rawBody: string) {
  const signature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return new NextRequest('http://localhost/api/billing/webhook/paystack', {
    method: 'POST',
    headers: { 'x-paystack-signature': signature },
    body: rawBody,
  });
}

describe('POST /api/billing/webhook/paystack', () => {
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY_TEST = secret;
    vi.clearAllMocks();
    db.transaction.mockImplementation(async (callback) =>
      callback({
        webhookDelivery: {
          create: db.create.mockResolvedValue({ id: 'delivery_1' }),
          update: db.update.mockResolvedValue({}),
        },
      }),
    );
  });

  it('processes a signed event once', async () => {
    const { POST } = await import('../paystack/route');
    const body = JSON.stringify({
      event: 'subscription.create',
      data: { id: 'evt_1', metadata: { userId: 'user_1' }, customer: 'CUS_1' },
    });

    const response = await POST(signedRequest(body));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, duplicate: false });
    expect(db.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventId: 'evt_1' }) }));
    expect(db.handleBillingEvent).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ processedAt: expect.any(Date) }) }));
  });

  it('returns ok for duplicate event ids without reprocessing', async () => {
    const { POST } = await import('../paystack/route');
    db.transaction.mockRejectedValueOnce(new db.KnownRequestError('P2002'));
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'duplicate_ref' } });

    const response = await POST(signedRequest(body));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, duplicate: true });
    expect(db.handleBillingEvent).not.toHaveBeenCalled();
  });

  it('rejects invalid signatures', async () => {
    const { POST } = await import('../paystack/route');
    const response = await POST(
      new NextRequest('http://localhost/api/billing/webhook/paystack', {
        method: 'POST',
        headers: { 'x-paystack-signature': 'invalid' },
        body: JSON.stringify({ event: 'charge.success', data: { reference: 'ref' } }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
