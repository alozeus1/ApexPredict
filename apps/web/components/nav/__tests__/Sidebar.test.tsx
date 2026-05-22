import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/en.json';

// Mock next/navigation so client nav components don't throw in jsdom
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en',
}));

// Mock next/headers so the async Sidebar can read cookies in jsdom
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('renders nav landmark with all primary items', async () => {
    const ui = await Sidebar({ pathname: '/' });
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>,
    );
    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Predictions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Premium' })).toBeInTheDocument();
  });
  it('marks the Dashboard item as locked', async () => {
    const ui = await Sidebar({ pathname: '/' });
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('aria-disabled', 'true');
  });
});
