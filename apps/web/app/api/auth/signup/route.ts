import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { prisma } from '@apexpredix/db';
import { hashPII } from '@/lib/hash';
import { hashPassword } from '@/lib/password';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { sendAuthVerifyEmail } from '@/lib/email';

export const runtime = 'nodejs';

const Body = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  locale: z.enum(['en', 'yo', 'ha', 'ig']).default('en'),
});

export async function POST(req: Request) {
  // Anti-enumeration: the response is identical (202) whether the email is new,
  // already registered, invalid, or locked out. Never reveal which.
  const ACCEPTED = NextResponse.json({ ok: true }, { status: 202 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return ACCEPTED;

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
  const email = parsed.data.email.toLowerCase();
  const [emailHash, ipHash] = await Promise.all([hashPII(email), hashPII(ip)]);

  // Lockout: 5 attempts per (emailHash, ipHash) in a 15-minute sliding window.
  // KV key: auth:lockout:<emailHash>:<ipHash> (via the rate-limit helper).
  try {
    const lock = await checkRateLimit('auth:lockout', `${emailHash}:${ipHash}`, {
      limit: 5,
      windowSec: 900,
    });
    if (!lock.ok) {
      await logAudit(`ip:${ipHash}`, 'auth.lockout', `email:${emailHash}`).catch(() => {});
      return ACCEPTED;
    }
  } catch {
    // KV not configured locally — skip lockout in dev.
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return ACCEPTED; // same shape, no disclosure

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: { email, passwordHash, locale: parsed.data.locale },
    });

    const token = crypto.randomBytes(32).toString('base64url');
    await prisma.verificationToken.create({
      data: { identifier: `email-verify:${email}`, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const verifyUrl = `${base}/${parsed.data.locale}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    await sendAuthVerifyEmail(email, verifyUrl, parsed.data.locale).catch(() => {});
    await logAudit(`user:${user.id}`, 'auth.signup', `user:${user.id}`, { emailHash }).catch(() => {});
  } catch (err) {
    // Never leak internal detail; the response stays 202 regardless.
    console.warn('[signup] error', err instanceof Error ? err.message : err);
  }

  return ACCEPTED;
}
