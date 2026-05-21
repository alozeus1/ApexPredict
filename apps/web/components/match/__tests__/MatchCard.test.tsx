import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MatchCard } from '../MatchCard';
import type { Match } from '@apexpredix/types';

const fx: Match = {
  id: 'featured-1', sport: 'soccer', league: 'EPL',
  home: { name: 'Arsenal', code: 'ARS' }, away: { name: 'Chelsea', code: 'CHE' },
  kickoff: '2026-05-24T15:00:00.000Z',
  odds: [{ bookCode: 'PN', price: 1.85, market: '1' }],
  model: { elo: 0.58, poisson: 0.55, xg: 0.61, ensemble: 0.58, confidence: 0.893 },
  topPick: 'ARS to Win + Over 2.5', valueBet: true,
  narrative: 'Arsenal home xG advantage holds.',
  featured: true,
};

describe('MatchCard', () => {
  it('shows teams, top pick, confidence percent, and value-bet chip', () => {
    render(<MatchCard match={fx} locale="en" />);
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText('Chelsea')).toBeInTheDocument();
    expect(screen.getByText('ARS to Win + Over 2.5')).toBeInTheDocument();
    expect(screen.getByText('89%')).toBeInTheDocument();
    expect(screen.getByText(/value bet/i)).toBeInTheDocument();
  });
});
