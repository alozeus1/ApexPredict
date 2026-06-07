import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { CTA } from '../CTA';

vi.mock('next/script', () => ({ default: () => null }));

const renderWithIntl = (node: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={{}}>
      {node}
    </NextIntlClientProvider>,
  );

describe('CTA', () => {
  it('renders email input and submit button with 18+ checkbox', () => {
    renderWithIntl(<CTA waitlistCount={5234} />);
    expect(screen.getByPlaceholderText(/you@example/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reserve my seat/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/18\+/)).toBeInTheDocument();
  });

  it('shows the waitlist counter only when a count is provided', () => {
    renderWithIntl(<CTA waitlistCount={5234} />);
    expect(screen.getByText(/on the waitlist/i)).toBeInTheDocument();
  });

  it('hides the counter when no count is available', () => {
    renderWithIntl(<CTA waitlistCount={null} />);
    expect(screen.queryByText(/on the waitlist/i)).not.toBeInTheDocument();
  });
});
