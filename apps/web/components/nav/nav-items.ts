export interface NavItem {
  id: string;
  label: string;
  href: string;
  locked?: boolean;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { id: 'predictions', label: 'Predictions', href: '/predictions' },
  { id: 'methodology', label: 'Methodology', href: '/methodology' },
  { id: 'backtest', label: 'Backtest', href: '/#backtest' },
  { id: 'network', label: 'Network', href: '/#network' },
  { id: 'dashboard', label: 'Dashboard', href: '/predictions', locked: true },
  { id: 'premium', label: 'Premium', href: '/premium' },
  { id: 'how-to-use', label: 'How to Use', href: '/how-it-works' },
];
