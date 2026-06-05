'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

const field = 'mt-1 w-full rounded-lg bg-ink-2 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-edge-cyan';
const primary = 'mt-4 w-full rounded-lg bg-edge-cyan px-4 py-2 text-sm font-medium text-ink-0 hover:bg-cyan-300 disabled:opacity-50';

/** Signup — anti-enumeration: always shows the same confirmation. */
export function SignupForm({ locale }: { locale: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: fd.get('email'), password: fd.get('password'), locale }),
    }).catch(() => {});
    setBusy(false);
    setDone(true);
  }
  if (done) return <p className="text-sm text-mute-1">If that email is available, we’ve sent a verification link. Check your inbox.</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm">Email
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className="block text-sm">Password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={field} />
      </label>
      <button type="submit" disabled={busy} className={primary}>{busy ? 'Creating…' : 'Create account'}</button>
    </form>
  );
}

/** Login — credentials + Google. */
export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await signIn('credentials', {
      email: fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    }).catch(() => ({ error: 'unknown' }) as { error?: string });
    setBusy(false);
    if (res?.error) setError('Invalid email or password.');
    else window.location.assign('/account');
  }
  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">Email
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
        <label className="block text-sm">Password
          <input name="password" type="password" required autoComplete="current-password" className={field} />
        </label>
        {error && <p role="alert" className="text-sm text-edge-amber">{error}</p>}
        <button type="submit" disabled={busy} className={primary}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <button onClick={() => signIn('google')} className="w-full rounded-lg px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-white/5">
        Continue with Google
      </button>
    </div>
  );
}

/** Forgot password — anti-enumeration. */
export function ForgotPasswordForm() {
  const [done, setDone] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: fd.get('email') }),
    }).catch(() => {});
    setDone(true);
  }
  if (done) return <p className="text-sm text-mute-1">If that email has an account, we’ve sent a reset link.</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm">Email
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <button type="submit" className={primary}>Send reset link</button>
    </form>
  );
}

/** Reset password — consumes a token from the URL. */
export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'error'>('idle');
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, email, password: fd.get('password') }),
    }).catch(() => null);
    setState(res && res.ok ? 'ok' : 'error');
  }
  if (state === 'ok') return <p className="text-sm text-edge-green">Password updated. You can now sign in.</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm">New password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={field} />
      </label>
      {state === 'error' && <p role="alert" className="text-sm text-edge-amber">That reset link is invalid or expired.</p>}
      <button type="submit" className={primary}>Set new password</button>
    </form>
  );
}
