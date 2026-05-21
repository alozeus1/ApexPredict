import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Backtest } from '../Backtest';

describe('Backtest', () => {
  it('renders ROI tile and disclaimer', () => {
    render(<Backtest />);
    expect(screen.getByText('ROI')).toBeInTheDocument();
    expect(screen.getByText(/Past performance/i)).toBeInTheDocument();
  });
});
