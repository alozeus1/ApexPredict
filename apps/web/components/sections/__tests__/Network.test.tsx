import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Network } from '../Network';

describe('Network', () => {
  it('renders 14 agent tiles', () => {
    render(<Network />);
    expect(screen.getAllByTestId('agent-tile')).toHaveLength(14);
  });
});
