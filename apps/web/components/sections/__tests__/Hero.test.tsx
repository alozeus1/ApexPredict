import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Hero } from '../Hero';

describe('Hero', () => {
  it('renders headline, decision-support CTAs, and compliance footer', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/the math behind your next bet/i);
    expect(screen.getByRole('link', { name: /see today.s picks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /how we measure ourselves/i })).toBeInTheDocument();
    expect(screen.getByText(/decision support, not a bookmaker/i)).toBeInTheDocument();
  });
  it('renders the live agents pill', () => {
    render(<Hero />);
    expect(screen.getByText(/14 agents active/i)).toBeInTheDocument();
  });
});
