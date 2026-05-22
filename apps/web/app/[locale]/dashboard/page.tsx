import type { Route } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { Footer } from '@/components/Footer';
import { ConfidenceBar } from '@/components/match/ConfidenceBar';
import { ValueBetChip } from '@/components/match/ValueBetChip';
import { pageMetadata } from '@/lib/seo';
import fixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: '/dashboard',
    title: 'Dashboard — ApexPredix AI',
    description: 'Your performance dashboard: tracked predictions, ROI, win rate, streaks. Demo access during open beta.',
  });
}

// Demo numbers for open-beta dashboard. Real per-user tracking lands in sub-project 5.
const KPIS = [
  { label: 'Win Rate', value: '89.3%', tone: 'green' as const },
  { label: 'Total Staked', value: '$1,250', tone: 'mute' as const },
  { label: 'Total Returned', value: '$1,356', tone: 'mute' as const },
  { label: 'Net Profit', value: '+$106', tone: 'green' as const },
  { label: 'ROI', value: '+8.5%', tone: 'green' as const },
  { label: 'Active Streak', value: '6W', tone: 'cyan' as const },
];

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tracked = (fixtures as Match[])
    .slice()
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
    .slice(0, 8);

  return (
    <>
      <Sidebar pathname="/dashboard" />
      <MobileNav pathname="/dashboard" />
      <main id="main" className="lg:pl-64">
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-edge-cyan/15 px-3 py-1 text-xs text-edge-cyan ring-1 ring-edge-cyan/30">
                <span className="h-1.5 w-1.5 rounded-full bg-edge-cyan animate-pulse-dot" aria-hidden /> Open Beta · all features unlocked
              </span>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Your Performance</h1>
              <p className="mt-2 text-mute-1">
                Demo data while we onboard real users. Per-user tracking + real settlement land with the auth + ledger release.
              </p>
            </div>
            <Link href="/predictions" className="rounded-xl bg-edge-cyan px-4 py-2 text-sm font-medium text-ink-0 hover:bg-cyan-300">
              Browse Predictions →
            </Link>
          </div>

          {/* KPI tiles */}
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {KPIS.map((k) => (
              <div key={k.label} className="rounded-2xl bg-ink-1 p-5 ring-1 ring-white/10">
                <dt className="text-xs uppercase tracking-wide text-mute-2">{k.label}</dt>
                <dd
                  className={
                    'mt-1 text-2xl font-semibold ' +
                    (k.tone === 'green' ? 'text-edge-green' : k.tone === 'cyan' ? 'text-edge-cyan' : 'text-white')
                  }
                >
                  {k.value}
                </dd>
              </div>
            ))}
          </dl>

          {/* Tracked picks */}
          <h2 className="mb-4 mt-12 text-xl font-semibold">Tracked picks</h2>
          {tracked.length === 0 ? (
            <p className="text-mute-1">No predictions tracked yet. Save picks from the Predictions feed and they appear here.</p>
          ) : (
            <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-ink-1 ring-1 ring-white/10">
              {tracked.map((m) => (
                <li key={m.id} className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-mute-2">{m.league}</div>
                    <Link href={`/predictions/${m.id}` as Route<string>} className="font-medium text-white hover:text-edge-cyan">
                      {m.home.name} <span className="text-mute-1">vs</span> {m.away.name}
                    </Link>
                    <div className="mt-1 text-xs text-mute-1">{m.topPick}</div>
                  </div>
                  <div className="w-full md:w-40">
                    <ConfidenceBar value={m.model.confidence} />
                  </div>
                  <div className="text-xs text-mute-2">
                    {new Intl.DateTimeFormat(locale, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(m.kickoff))}
                  </div>
                  <div>{m.valueBet ? <ValueBetChip /> : <span className="text-xs text-mute-2">—</span>}</div>
                </li>
              ))}
            </ul>
          )}

          {/* Premium features panel — unlocked for all during beta */}
          <h2 className="mb-4 mt-12 text-xl font-semibold">Premium features</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Deep analysis', body: 'Per-match narrative breaking down the ensemble verdict.', open: true },
              { title: 'Value bet alerts', body: 'Real-time flag when market disagrees with the model.', open: true },
              { title: 'Kelly calculator', body: '¼ Kelly stake size given your bankroll and confidence.', open: true },
              { title: 'Telegram / email alerts', body: 'Push notifications for new value bets.', open: true },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl bg-ink-1 p-5 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{f.title}</h3>
                  <span className="rounded-full bg-edge-green/15 px-2 py-0.5 text-[10px] uppercase text-edge-green ring-1 ring-edge-green/30">
                    Unlocked
                  </span>
                </div>
                <p className="mt-2 text-sm text-mute-1">{f.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-12 text-xs text-mute-2">
            ApexPredix AI is an analytics service, not a gambling operator. 18+ only. Past performance ≠ future results.
          </p>
        </section>
        <Footer />
      </main>
    </>
  );
}
