import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HowToUse } from '../HowToUse';

describe('HowToUse', () => {
  it('renders the 5-step decision workflow', () => {
    render(<HowToUse />);
    expect(screen.getAllByTestId('step-card')).toHaveLength(5);
    expect(screen.getByText(/We flag value bets/i)).toBeInTheDocument();
  });
});
