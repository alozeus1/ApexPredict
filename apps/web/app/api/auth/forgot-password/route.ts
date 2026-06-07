import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '@apexpredix/db';
import { logAudit } from '@/lib/audit';
import { sendAuthResetEmail } from '@/lib/email';

export const runtime = 'nodejs';

const Body = z.object({ email: z.string().email().max(254), locale: z.enum(['en', 'yo', 'ha', 'ig']).default('en') });

export async function POST(req: Request) {
  // Anti-enumeration: always 202, regardless of whether the account exists.
  const ACCEPTED = NextResponse.json({ ok: true }, { status: 202 });
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return ACCEPTED;

  const email = parsed.data.email.toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = crypto.randomBytes(32).toString('base64url');
      await prisma.verificationToken.create({
        data: { identifier: `password-reset:${email}`, token, expires: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
      const resetUrl = `${base}/${parsed.data.locale}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      await sendAuthResetEmail(email, resetUrl, parsed.data.locale).catch(() => {});
      await logAudit(`user:${user.id}`, 'auth.password.reset.request', `user:${user.id}`).catch(() => {});
    }
  } catch (err) {
    console.warn('[forgot-password] error', err instanceof Error ? err.message : err);
  }
  return ACCEPTED;
}
