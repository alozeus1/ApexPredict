import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/AuthForms';

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <div className="mt-6 rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10">
        <LoginForm />
      </div>
      <div className="mt-4 flex justify-between text-sm text-mute-1">
        <Link href="/forgot-password" className="text-edge-cyan">Forgot password?</Link>
        <Link href="/signup" className="text-edge-cyan">Create account</Link>
      </div>
    </main>
  );
}
