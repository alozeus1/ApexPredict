import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Hero } from '../Hero';

describe('Hero', () => {
  it('renders headline and primary CTA', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/built on mathematical edge/i);
    expect(screen.getByRole('link', { name: /reserve premium seat/i })).toBeInTheDocument();
  });
  it('renders the live agents pill', () => {
    render(<Hero />);
    expect(screen.getByText(/14 agents active/i)).toBeInTheDocument();
  });
});
