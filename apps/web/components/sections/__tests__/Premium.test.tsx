import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Premium } from '../Premium';

describe('Premium', () => {
  it('renders Free vs Premium comparison rows', () => {
    render(<Premium />);
    expect(screen.getByText(/4 predictions\/day/i)).toBeInTheDocument();
    expect(screen.getByText(/10 predictions\/day/i)).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /reserve premium seat/i });
    expect(links.length).toBeGreaterThan(0);
  });
});
