import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PredictionsPreview } from '../PredictionsPreview';

describe('PredictionsPreview', () => {
  it('renders heading and 6 placeholder cards', () => {
    render(<PredictionsPreview />);
    expect(screen.getByRole('heading', { name: /live predictions/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('match-card-placeholder')).toHaveLength(6);
  });
});
