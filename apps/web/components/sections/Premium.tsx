import Link from 'next/link';
import { Button } from '@apexpredix/ui';

const FEATURES: ReadonlyArray<{ label: string; free: string; premium: string }> = [
  { label: 'Daily predictions', free: '4 predictions/day', premium: '10 predictions/day' },
  { label: 'Analysis depth', free: 'Basic', premium: 'Deep narrative + line movement' },
  { label: 'Value bet alerts', free: '—', premium: 'Real-time' },
  { label: 'Kelly staking calculator', free: '—', premium: 'Included' },
  { label: 'Telegram / email alerts', free: '—', premium: 'Included' },
  { label: 'Regional pricing', free: 'USD', premium: 'PPP-adjusted' },
];

export function Premium() {
  return (
    <section id="premium" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-10 text-3xl font-semibold tracking-tight md:text-4xl">Premium Features</h2>
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
