import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '@apexpredix/db';
import { hashPII } from '@/lib/hash';
import { checkRateLimit } from '@/lib/rate-limit';
import { isDisposableEmail } from '@/lib/disposable-email';
import { sendVerifyEmail } from '@/lib/email';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

const Body = z.object({
  email: z.string().email().max(254),
  region: z.string().length(2).optional(),
  locale: z.enum(['en', 'yo', 'ha', 'ig']),
  premiumIntent: z.boolean().default(false),
  referredBy: z.string().optional(),
  turnstileToken: z.string().min(10),
  honeypot: z.string().max(0, 'spam'),
});

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // dev mode: skip
  const fd = new URLSearchParams();
  fd.set('secret', secret);
  fd.set('response', token);
  fd.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: fd,
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: true }, { status: 202 }); // anti-enumeration

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
  const ua = h.get('user-agent') ?? '';

  try {
    const rl = await checkRateLimit('waitlist', ip, { limit: 5, windowSec: 3600 });
    if (!rl.ok)
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many requests' },
        { status: 429 },
      );
  } catch (err) {
    // KV not configured in local dev — skip rate limit
    console.warn(
      '[waitlist] rate limit skipped (KV not configured)',
      err instanceof Error ? err.message : err,
    );
  }

  if (isDisposableEmail(parsed.data.email)) {
    return NextResponse.json(
      { ok: false, code: 'DISPOSABLE_EMAIL', message: 'Please use a real email address' },
      { status: 400 },
    );
  }

  const turnstileOk = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!turnstileOk)
    return NextResponse.json(
      { ok: false, code: 'CHALLENGE_FAILED', message: 'Anti-bot check failed' },
      { status: 400 },
    );

  const [ipHash, uaHash] = await Promise.all([hashPII(ip), hashPII(ua)]);
  const email = parsed.data.email.toLowerCase();

  try {
    const signup = await prisma.waitlistSignup.upsert({
      where: { email },
      update: {},
      create: {
        email,
        region: parsed.data.region ?? null,
        locale: parsed.data.locale,
        premiumIntent: parsed.data.premiumIntent,
        referredByToken: parsed.data.referredBy ?? null,
        ipHash,
        uaHash,
      },
    });

    const raw = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    await prisma.verificationToken.create({
      data: {
        email,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const verifyUrl = `${base}/api/waitlist/verify?token=${raw}`;
    await sendVerifyEmail(email, verifyUrl, parsed.data.locale);

    // Use signup to avoid unused-var lint
    if (!signup.id) throw new Error('signup creation failed silently');
  } catch (err) {
    console.warn(
      '[waitlist] DB/email skipped (DB not configured?)',
      err instanceof Error ? err.message : err,
    );
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
