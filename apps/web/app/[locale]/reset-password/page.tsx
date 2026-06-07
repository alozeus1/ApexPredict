import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/AuthForms';

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token, email } = await searchParams;

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <div className="mt-6 rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10">
        {token && email ? (
          <ResetPasswordForm token={token} email={email} />
        ) : (
          <p className="text-sm text-mute-1">
            This reset link is incomplete. Request a new one from the{' '}
            <Link href="/forgot-password" className="text-edge-cyan">forgot-password</Link> page.
          </p>
        )}
      </div>
    </main>
  );
}
