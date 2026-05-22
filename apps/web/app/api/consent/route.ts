import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@apexpredix/db';
import { hashPII } from '@/lib/hash';
import { encodeChoices, decodeChoices, COOKIE_NAME } from '@/lib/compliance/consent';
import { cookies, headers } from 'next/headers';
import { CONSENT_VERSION } from '@apexpredix/types';

export const runtime = 'nodejs';

const Body = z.object({
  anonDeviceId: z.string().uuid(),
  choices: z.object({
    essential: z.literal(true),
    analytics: z.boolean(),
    prefs: z.boolean(),
    marketing: z.boolean(),
  }),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_BODY', message: parsed.error.message },
      { status: 400 },
    );
  }

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
  const ipHash = await hashPII(ip);

  // Wrap DB call in try/catch — DATABASE_URL may not be set in local dev
  try {
    await prisma.cookieConsent.upsert({
      where: { anonDeviceId: parsed.data.anonDeviceId },
      update: {
        choices: parsed.data.choices,
        version: CONSENT_VERSION,
        ipHash,
        expiresAt: new Date(Date.now() + 13 * 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        anonDeviceId: parsed.data.anonDeviceId,
        choices: parsed.data.choices,
        version: CONSENT_VERSION,
        ipHash,
        expiresAt: new Date(Date.now() + 13 * 30 * 24 * 60 * 60 * 1000),
      },
    });
  } catch (err) {
    console.warn(
      '[consent] DB write skipped (DATABASE_URL not set?)',
      err instanceof Error ? err.message : err,
    );
  }

  const c = await cookies();
  c.set(COOKIE_NAME, encodeChoices(parsed.data.choices), {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 13 * 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  });

  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  const c = await cookies();
  const choices = decodeChoices(c.get(COOKIE_NAME)?.value);
  return NextResponse.json({ ok: true, choices });
}
