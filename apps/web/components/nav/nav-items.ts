import type { Route } from 'next';

export interface NavItem {
  id: string;
  label: string;
  href: Route<string>;
  locked?: boolean;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { id: 'predictions', label: 'Predictions', href: '/predictions' as Route<string> },
  { id: 'methodology', label: 'Methodology', href: '/methodology' as Route<string> },
  { id: 'backtest', label: 'Backtest', href: '/#backtest' as Route<string> },
  { id: 'network', label: 'Network', href: '/#network' as Route<string> },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' as Route<string> },
  { id: 'premium', label: 'Premium', href: '/premium' as Route<string> },
  { id: 'how-to-use', label: 'How to Use', href: '/how-it-works' as Route<string> },
];
