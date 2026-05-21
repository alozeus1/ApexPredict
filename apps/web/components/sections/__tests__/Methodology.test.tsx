import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Methodology } from '../Methodology';

describe('Methodology', () => {
  it('renders ELO, Poisson, xG cards and Ensemble badge', () => {
    render(<Methodology />);
    expect(screen.getByText('ELO Model')).toBeInTheDocument();
    expect(screen.getByText('Poisson Model')).toBeInTheDocument();
    expect(screen.getByText('Expected Goals (xG)')).toBeInTheDocument();
    expect(screen.getAllByText(/ensemble/i).length).toBeGreaterThan(0);
  });
  it('renders the Kelly formula', () => {
    render(<Methodology />);
    expect(screen.getAllByText(/¼ Kelly/).length).toBeGreaterThan(0);
  });
});
