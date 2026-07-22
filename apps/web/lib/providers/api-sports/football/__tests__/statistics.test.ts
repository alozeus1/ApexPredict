import { describe, expect, it } from 'vitest';
import {
  statNumber,
  parseTeamShots,
  parseFixtureStatistics,
  aggregateShotProfile,
  type ShotLinePair,
} from '../statistics';

describe('statNumber', () => {
  it('passes through finite numbers', () => {
    expect(statNumber(12)).toBe(12);
    expect(statNumber(0)).toBe(0);
  });
  it('parses numeric strings', () => {
    expect(statNumber('1.5')).toBe(1.5);
  });
  it('rejects null, percentages and junk', () => {
    expect(statNumber(null)).toBeUndefined();
    expect(statNumber('45%')).toBeUndefined();
    expect(statNumber('n/a')).toBeUndefined();
    expect(statNumber(undefined)).toBeUndefined();
  });
});

describe('parseTeamShots', () => {
  it('extracts shots, on-target and xG', () => {
    const line = parseTeamShots([
      { type: 'Total Shots', value: 14 },
      { type: 'Shots on Goal', value: 6 },
      { type: 'expected_goals', value: '1.8' },
    ]);
    expect(line).toEqual({ shots: 14, shotsOnTarget: 6, xg: 1.8 });
  });
  it('clamps on-target to total and omits missing xG', () => {
    const line = parseTeamShots([
      { type: 'Total Shots', value: 4 },
      { type: 'Shots on Goal', value: 9 }, // noisy: more on-target than total
    ]);
    expect(line).toEqual({ shots: 4, shotsOnTarget: 4 });
  });
  it('returns undefined without a total-shots line', () => {
    expect(parseTeamShots([{ type: 'Shots on Goal', value: 3 }])).toBeUndefined();
  });
});

describe('parseFixtureStatistics', () => {
  it('keys shot lines by team id', () => {
    const map = parseFixtureStatistics([
      { team: { id: 10, name: 'A' }, statistics: [{ type: 'Total Shots', value: 12 }, { type: 'Shots on Goal', value: 5 }] },
      { team: { id: 20, name: 'B' }, statistics: [{ type: 'Total Shots', value: 8 }, { type: 'Shots on Goal', value: 2 }] },
    ]);
    expect(map.get(10)).toEqual({ shots: 12, shotsOnTarget: 5 });
    expect(map.get(20)).toEqual({ shots: 8, shotsOnTarget: 2 });
  });
});

describe('aggregateShotProfile', () => {
  const lines: ShotLinePair[] = [
    { teamShots: 10, teamSot: 4, oppShots: 8, oppSot: 3 },
    { teamShots: 14, teamSot: 6, oppShots: 12, oppSot: 5 },
  ];

  it('averages for/against per game', () => {
    const p = aggregateShotProfile(lines);
    expect(p.shotsForPerGame).toBe(12);
    expect(p.shotsOnTargetForPerGame).toBe(5);
    expect(p.shotsAgainstPerGame).toBe(10);
    expect(p.shotsOnTargetAgainstPerGame).toBe(4);
    expect(p.sampleSize).toBe(2);
    expect(p.xgForPerGame).toBeUndefined();
  });

  it('includes xG only when every fixture has it for both sides', () => {
    const withXg: ShotLinePair[] = [
      { ...lines[0]!, teamXg: 1.2, oppXg: 0.9 },
      { ...lines[1]!, teamXg: 1.8, oppXg: 1.1 },
    ];
    const p = aggregateShotProfile(withXg);
    expect(p.xgForPerGame).toBeCloseTo(1.5, 9);
    expect(p.xgAgainstPerGame).toBeCloseTo(1.0, 9);

    const partial: ShotLinePair[] = [{ ...lines[0]!, teamXg: 1.2, oppXg: 0.9 }, lines[1]!];
    expect(aggregateShotProfile(partial).xgForPerGame).toBeUndefined();
  });

  it('is empty-safe', () => {
    expect(aggregateShotProfile([]).sampleSize).toBe(0);
  });
});
