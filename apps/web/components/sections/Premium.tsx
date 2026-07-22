import Link from 'next/link';
import { Button } from '@apexpredix/ui';
import { entitlementsFor, entitlementsForTier } from '@/lib/entitlements';

// Tier-aware comparison sourced from the entitlements matrix. Free = no
// authenticated user; Premium column shown from a representative paid tier.
const free = entitlementsFor(null);
const premium = entitlementsForTier('MONTHLY');

const FEATURES: ReadonlyArray<{ label: string; free: string; premium: string }> = [
  { label: 'Daily predictions', free: `${free.picksPerDay} predictions/day`, premium: `${premium.picksPerDay} predictions/day` },
  { label: 'Confidence + probability', free: 'Included', premium: 'Included with model breakdown' },
  { label: 'Value-bet reasoning', free: 'Basic', premium: 'Edge, fair price, and alert context' },
  { label: 'Odds comparison', free: 'Regional books', premium: 'Best price + movement history' },
  { label: 'Injury / lineup / weather context', free: 'Provider status', premium: 'Connected feeds as available' },
  { label: 'Historical performance', free: 'Public sample threshold', premium: 'ROI, Brier, log loss, calibration' },
  { label: 'Value bet alerts', free: free.valueBets ? 'Included' : '—', premium: premium.valueBets ? 'Real-time' : '—' },
  { label: 'Kelly staking calculator', free: free.kelly ? 'Included' : '—', premium: premium.kelly ? 'Included' : '—' },
  { label: 'Telegram / email alerts', free: free.telegram ? 'Included' : '—', premium: premium.telegram ? 'Included' : '—' },
  { label: 'Regional pricing', free: 'USD', premium: 'PPP-adjusted' },
];

export function Premium() {
  return (
    <section id="premium" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Edge subscriptions — for punters who care about EV.</h2>
        <p className="mb-10 max-w-prose text-mute-1">Decision support, priced by what you need. Every tier is about expected value — we don&rsquo;t promise wins.</p>
        <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-2 text-mute-1">
              <tr>
                <th className="px-4 py-3">Feature</th>
                <th className="px-4 py-3">Free</th>
                <th className="px-4 py-3 text-edge-cyan">Premium</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.label} className="border-t border-white/5">
                  <td className="px-4 py-3 font-medium">{f.label}</td>
                  <td className="px-4 py-3 text-mute-1">{f.free}</td>
                  <td className="px-4 py-3">{f.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild variant="primary" size="lg"><Link href="#cta">Reserve Premium Seat</Link></Button>
          <Button asChild variant="secondary" size="lg"><Link href="#cta">Start Free</Link></Button>
          <span className="text-xs text-mute-2">Special African pricing applied via PPP adjustment.</span>
        </div>
      </div>
    </section>
  );
}
