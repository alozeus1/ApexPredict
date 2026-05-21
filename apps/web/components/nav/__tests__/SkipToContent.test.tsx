import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SkipToContent } from '../SkipToContent';

describe('SkipToContent', () => {
  it('renders a link to #main', () => {
    render(<SkipToContent />);
    const link = screen.getByRole('link', { name: /skip to content/i });
    expect(link).toHaveAttribute('href', '#main');
  });
});
