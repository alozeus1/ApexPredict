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
    renderWithIntl(<CTA waitlistCount={14203} />);
    expect(screen.getByPlaceholderText(/you@example/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reserve my seat/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/18\+/)).toBeInTheDocument();
  });
});
