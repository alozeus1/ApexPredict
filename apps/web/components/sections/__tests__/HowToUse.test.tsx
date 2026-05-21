import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HowToUse } from '../HowToUse';

describe('HowToUse', () => {
  it('renders 4 numbered steps', () => {
    render(<HowToUse />);
    expect(screen.getAllByTestId('step-card')).toHaveLength(4);
  });
});
