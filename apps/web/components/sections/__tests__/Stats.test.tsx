import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Stats } from '../Stats';

describe('Stats', () => {
  it('renders the 6 stat tiles', () => {
    render(<Stats />);
    expect(screen.getByText(/89.3%/)).toBeInTheDocument();
    expect(screen.getByText(/14 leagues/i)).toBeInTheDocument();
    expect(screen.getByText(/7 sports/i)).toBeInTheDocument();
  });
});
