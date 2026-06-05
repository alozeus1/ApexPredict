import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/AuthForms';

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-sm text-mute-1">We&rsquo;ll email you a link to choose a new one.</p>
      <div className="mt-6 rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10">
        <ForgotPasswordForm />
      </div>
      <p className="mt-4 text-sm text-mute-1">
        Remembered it? <Link href="/login" className="text-edge-cyan">Sign in</Link>
      </p>
    </main>
  );
}
