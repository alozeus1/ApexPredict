import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@apexpredix/db';
import { hashPassword } from '@/lib/password';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const Body = z.object({
  email: z.string().email().max(254),
  token: z.string().min(10),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: 'INVALID' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const identifier = `password-reset:${email}`;
  try {
    const tok = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token: parsed.data.token } },
    });
    if (!tok || tok.expires < new Date()) {
      return NextResponse.json({ ok: false, code: 'INVALID_OR_EXPIRED' }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.update({ where: { email }, data: { passwordHash } });

    // Single-use token; also invalidate all existing sessions for the user.
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier, token: parsed.data.token } },
    });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await logAudit(`user:${user.id}`, 'auth.password.reset', `user:${user.id}`).catch(() => {});

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.warn('[reset-password] error', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, code: 'ERROR' }, { status: 400 });
  }
}
