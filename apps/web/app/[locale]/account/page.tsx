import type { Route } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { prisma } from '@apexpredix/db';
import { auth, signOut } from '@/auth';
import { assertNotSuspended, type SuspendableUser } from '@/lib/auth-guards';
import { SelfExcludeModal } from '@/components/compliance/SelfExcludeModal';

export const dynamic = 'force-dynamic';

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect(`/${locale}/login` as Route);

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { sessions: { orderBy: { expires: 'desc' } }, subscription: true },
  });
  if (!user) redirect(`/${locale}/login` as Route);

  const rgFlags = (user.rgFlags ?? {}) as { selfExcludedUntil?: string | null; depositCap?: number | null };
  const suspendedBanner = assertNotSuspended(user as unknown as SuspendableUser);

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      {suspendedBanner && <div className="mt-4">{suspendedBanner}</div>}

      {/* Profile */}
      <section className="mt-8 rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-semibold">Profile</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-mute-2">Email</dt><dd>{user.email}</dd>
          <dt className="text-mute-2">Email verified</dt><dd>{user.emailVerified ? 'Yes' : 'No'}</dd>
          <dt className="text-mute-2">Locale</dt><dd>{user.locale}</dd>
          <dt className="text-mute-2">Region</dt><dd>{user.region ?? '—'}</dd>
          <dt className="text-mute-2">KYC status</dt><dd>{user.kycStatus}</dd>
          <dt className="text-mute-2">Plan</dt><dd>{user.subscription?.tier ?? 'FREE'}</dd>
        </dl>
      </section>

      {/* Sessions */}
      <section className="mt-6 rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-semibold">Active sessions</h2>
        <ul className="mt-3 space-y-2 text-sm text-mute-1">
          {user.sessions.length === 0 && <li>No persisted sessions.</li>}
          {user.sessions.map((s) => (
            <li key={s.id} className="flex justify-between">
              <span>Session …{s.sessionToken.slice(-6)}</span>
              <span className="text-mute-2">expires {s.expires.toISOString().slice(0, 10)}</span>
            </li>
          ))}
        </ul>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: `/${locale}` });
          }}
        >
          <button type="submit" className="mt-4 rounded-lg px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-white/5">
            Log out of all sessions
          </button>
        </form>
      </section>

      {/* Responsible-gaming settings */}
      <section className="mt-6 rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-semibold">Responsible gaming</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-mute-2">Self-exclusion until</dt>
          <dd>{rgFlags.selfExcludedUntil ?? 'Not set'}</dd>
          <dt className="text-mute-2">Advisory deposit cap</dt>
          <dd>{rgFlags.depositCap ?? 'Not set'}</dd>
        </dl>
        <p className="mt-3 text-xs text-mute-2">
          Self-exclude or set a cool-off from our{' '}
          <a className="underline" href="/legal/responsible-gaming">responsible-gaming page</a>. 18+ only.
        </p>
        <SelfExcludeModal />
      </section>
    </main>
  );
}
