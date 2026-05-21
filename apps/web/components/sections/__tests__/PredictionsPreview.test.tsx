import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PredictionsPreview } from '../PredictionsPreview';

describe('PredictionsPreview', () => {
  it('renders heading and 6 featured MatchCards', () => {
    render(<PredictionsPreview locale="en" />);
    expect(screen.getByRole('heading', { name: /live predictions/i })).toBeInTheDocument();
    // Each MatchCard renders as a Link with href /predictions/<id>
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/predictions/featured-'));
    expect(links.length).toBeGreaterThanOrEqual(6);
  });
});
