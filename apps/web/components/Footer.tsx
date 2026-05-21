import Link from 'next/link';

const COLUMNS = [
  { title: 'Product', links: [
    { label: 'Predictions', href: '/predictions' },
    { label: 'Premium', href: '/premium' },
    { label: 'How to Use', href: '/how-it-works' },
  ]},
  { title: 'Methodology', links: [
    { label: 'ELO + Poisson + xG', href: '/methodology' },
    { label: 'Backtest', href: '/#backtest' },
    { label: 'Network', href: '/#network' },
  ]},
  { title: 'Legal', links: [
    { label: 'Privacy', href: '/legal/privacy' },
    { label: 'Terms', href: '/legal/terms' },
    { label: 'Cookies', href: '/legal/cookies' },
    { label: 'Disclaimer', href: '/legal/disclaimer' },
  ]},
  { title: 'Company', links: [
    { label: 'About Us', href: '/legal/disclaimer' },
    { label: 'Contact', href: 'mailto:help@apexpredix.ai' },
  ]},
];

const RGS_LINKS = [
  { label: 'BeGambleAware', href: 'https://www.begambleaware.org/' },
  { label: 'GamCare', href: 'https://www.gamcare.org.uk/' },
  { label: 'ConnexOntario', href: 'https://www.connexontario.ca/' },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-ink-1/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-4">
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <h3 className="mb-3 text-sm font-semibold text-white">{c.title}</h3>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-mute-1 hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-mute-2">
          <span>Powered by Maralito Labs</span>
          <span className="rounded-md bg-ink-2 px-2 py-1 text-white">18+</span>
          <ul className="flex flex-wrap gap-3">
            {RGS_LINKS.map((l) => (
              <li key={l.label}><a href={l.href} className="hover:text-white" rel="noopener noreferrer" target="_blank">{l.label}</a></li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
