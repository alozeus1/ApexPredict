import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Network } from '../Network';

describe('Network', () => {
  it('renders the agent network tiles', async () => {
    render(await Network());
    expect(screen.getAllByTestId('agent-tile')).toHaveLength(18);
  });
});
