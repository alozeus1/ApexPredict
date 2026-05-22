import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@apexpredix/db';
import { sendWelcomeEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('token');
  if (!raw) return NextResponse.redirect(new URL('/en/thank-you?status=invalid', req.url));
  try {
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const tok = await prisma.verificationToken.findUnique({ where: { tokenHash } });
    if (!tok || tok.usedAt || tok.expiresAt < new Date()) {
      return NextResponse.redirect(new URL('/en/thank-you?status=invalid', req.url));
    }
    const signup = await prisma.waitlistSignup.update({
      where: { email: tok.email },
      data: { verifiedAt: new Date() },
    });
    await prisma.verificationToken.update({ where: { tokenHash }, data: { usedAt: new Date() } });
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const referralUrl = `${base}/?r=${signup.referralToken}`;
    await sendWelcomeEmail(signup.email, referralUrl, signup.locale);
    return NextResponse.redirect(
      new URL(`/${signup.locale}/thank-you?status=ok&r=${signup.referralToken}`, req.url),
    );
  } catch (err) {
    console.warn('[verify] DB unavailable', err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL('/en/thank-you?status=invalid', req.url));
  }
}
