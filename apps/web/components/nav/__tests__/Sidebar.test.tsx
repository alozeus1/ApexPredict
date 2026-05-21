import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('renders nav landmark with all primary items', () => {
    render(<Sidebar pathname="/" />);
    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Predictions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Premium' })).toBeInTheDocument();
  });
  it('marks the Dashboard item as locked', () => {
    render(<Sidebar pathname="/" />);
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('aria-disabled', 'true');
  });
});
