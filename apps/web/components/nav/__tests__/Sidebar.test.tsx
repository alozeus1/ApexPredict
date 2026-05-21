import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/en.json';

// Mock next/navigation so client nav components don't throw in jsdom
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en',
}));

import { Sidebar } from '../Sidebar';

function SidebarWithIntl({ pathname }: { pathname: string }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <Sidebar pathname={pathname} />
    </NextIntlClientProvider>
  );
}

describe('Sidebar', () => {
  it('renders nav landmark with all primary items', () => {
    render(<SidebarWithIntl pathname="/" />);
    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Predictions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Premium' })).toBeInTheDocument();
  });
  it('marks the Dashboard item as locked', () => {
    render(<SidebarWithIntl pathname="/" />);
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('aria-disabled', 'true');
  });
});
