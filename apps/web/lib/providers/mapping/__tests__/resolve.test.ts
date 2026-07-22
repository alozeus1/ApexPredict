import { describe, expect, it } from 'vitest';
import { nameSimilarity, normalizeEntityName, proposeMappings } from '../resolve';

describe('normalizeEntityName', () => {
  it('strips club suffixes, punctuation and accents', () => {
    expect(normalizeEntityName('Enyimba F.C.')).toBe('enyimba');
    expect(normalizeEntityName('AS Monaco FC')).toBe('as monaco');
    expect(normalizeEntityName('Atlético Madrid')).toBe('atletico madrid');
  });
});

describe('nameSimilarity', () => {
  it('scores exact and near matches highly', () => {
    expect(nameSimilarity('Kano Pillars FC', 'Kano Pillars')).toBe(1);
    expect(nameSimilarity('Enyimba FC', 'Enyimba International')).toBeGreaterThan(0.4);
  });

  it('does not confuse distinct clubs that share a city token', () => {
    // The exact failure mode that makes runtime fuzzy matching unsafe: two real
    // Nigerian clubs sharing a token must not score as a confident match.
    expect(nameSimilarity('Rangers International', 'Enugu Rangers')).toBeLessThan(0.6);
    expect(nameSimilarity('Lobi Stars', 'Plateau United')).toBe(0);
  });
});

describe('proposeMappings', () => {
  const internal = [
    { id: 'team_1', name: 'Enyimba FC', aliases: ['Enyimba International'] },
    { id: 'team_2', name: 'Kano Pillars' },
    { id: 'team_3', name: 'Plateau United' },
  ];

  it('proposes the best candidate above the confidence floor', () => {
    const candidates = proposeMappings(internal, [
      { id: '9001', name: 'Enyimba International' },
      { id: '9002', name: 'Kano Pillars FC' },
    ]);

    expect(candidates).toHaveLength(2);
    expect(candidates.find((candidate) => candidate.providerId === '9001')?.internalId).toBe('team_1');
    expect(candidates.find((candidate) => candidate.providerId === '9002')?.internalId).toBe('team_2');
  });

  it('proposes nothing rather than a weak guess', () => {
    expect(proposeMappings(internal, [{ id: '9003', name: 'Sunshine Stars' }])).toEqual([]);
  });

  it('sorts by confidence so reviewers see the safest matches first', () => {
    const candidates = proposeMappings(internal, [
      { id: '9002', name: 'Kano Pillars FC' },
      { id: '9001', name: 'Enyimba International' },
    ]);

    const confidences = candidates.map((candidate) => candidate.confidence);
    expect(confidences).toEqual([...confidences].sort((a, b) => b - a));
  });
});
