import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Footer } from '../Footer';

describe('Footer', () => {
  it('renders Maralito Labs attribution and 18+ badge', () => {
    render(<Footer />);
    expect(screen.getByText(/Maralito Labs/i)).toBeInTheDocument();
    expect(screen.getByText('18+')).toBeInTheDocument();
  });
});
