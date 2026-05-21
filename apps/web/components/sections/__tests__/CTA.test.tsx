import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CTA } from '../CTA';

describe('CTA', () => {
  it('renders email input and submit button with 18+ checkbox', () => {
    render(<CTA waitlistCount={14203} />);
    expect(screen.getByPlaceholderText(/you@example/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reserve my seat/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/18\+/)).toBeInTheDocument();
  });
});
