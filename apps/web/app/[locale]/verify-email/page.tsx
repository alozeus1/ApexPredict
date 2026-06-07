import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { prisma } from '@apexpredix/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

async function consumeToken(email?: string, token?: string): Promise<'ok' | 'invalid'> {
  if (!email || !token) return 'invalid';
  const lower = email.toLowerCase();
  const identifier = `email-verify:${lower}`;
  try {
    const tok = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token } },
    });
    if (!tok || tok.expires < new Date()) return 'invalid';
    const user = await prisma.user.update({ where: { email: lower }, data: { emailVerified: new Date() } });
    await prisma.verificationToken.delete({ where: { identifier_token: { identifier, token } } });
    await logAudit(`user:${user.id}`, 'auth.email.verified', `user:${user.id}`).catch(() => {});
    return 'ok';
  } catch {
    return 'invalid';
  }
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token, email } = await searchParams;

  // No token → this is Auth.js's "check your email" landing (verifyRequest page).
  const result = token ? await consumeToken(email, token) : 'pending';

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16 text-center">
      {result === 'pending' && (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-2 text-sm text-mute-1">We sent you a link to verify your address. It expires in 24 hours.</p>
        </>
      )}
      {result === 'ok' && (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Email verified</h1>
          <p className="mt-2 text-sm text-mute-1">You&rsquo;re all set.</p>
          <Link href="/login" className="mt-6 text-edge-cyan">Sign in</Link>
        </>
      )}
      {result === 'invalid' && (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Link invalid or expired</h1>
          <p className="mt-2 text-sm text-mute-1">Request a new verification email by signing up again.</p>
          <Link href="/signup" className="mt-6 text-edge-cyan">Back to sign up</Link>
        </>
      )}
    </main>
  );
}
