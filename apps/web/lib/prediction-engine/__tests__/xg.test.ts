import { describe, expect, it } from 'vitest';
import { estimateExpectedGoalsFromShots, xgDistribution, shotsEnrichment, DEFAULT_SHOT_PRIORS, type TeamShotProfile } from '../xg';

const avg: TeamShotProfile = {
  shotsForPerGame: 12,
  shotsOnTargetForPerGame: 4.3,
  shotsAgainstPerGame: 12,
  shotsOnTargetAgainstPerGame: 4.3,
  sampleSize: 10,
};

describe('shots-based xG', () => {
  it('withholds below the sample floor', () => {
    const e = estimateExpectedGoalsFromShots({ ...avg, sampleSize: 2 }, { ...avg, sampleSize: 2 });
    expect(e.available).toBe(false);
    expect(e.method).toBe('unavailable');
  });

  it('produces plausible, home-boosted expected goals for two average teams', () => {
    const e = estimateExpectedGoalsFromShots(avg, avg);
    expect(e.available).toBe(true);
    expect(e.method).toBe('shots-based');
    expect(e.expectedHomeGoals).toBeGreaterThan(1);
    expect(e.expectedHomeGoals).toBeLessThan(1.9);
    expect(e.expectedHomeGoals).toBeGreaterThan(e.expectedAwayGoals);
  });

  it('rewards a stronger attack facing a leakier defence', () => {
    const base = estimateExpectedGoalsFromShots(avg, avg);
    const strong = estimateExpectedGoalsFromShots(
      { ...avg, shotsForPerGame: 18, shotsOnTargetForPerGame: 7 },
      { ...avg, shotsAgainstPerGame: 16, shotsOnTargetAgainstPerGame: 6 },
    );
    expect(strong.expectedHomeGoals).toBeGreaterThan(base.expectedHomeGoals);
  });

  it('prefers the positional path when real per-shot xG is present', () => {
    const e = estimateExpectedGoalsFromShots(
      { ...avg, xgForPerGame: 2.1, xgAgainstPerGame: 0.9 },
      { ...avg, xgForPerGame: 1.0, xgAgainstPerGame: 1.6 },
    );
    expect(e.method).toBe('positional-xg');
    expect(e.expectedHomeGoals).toBeGreaterThan(e.expectedAwayGoals);
  });

  it('is independent of the season-goal branch (driven by shots, not goals)', () => {
    // Two teams with IDENTICAL goal records but very different shot volumes must
    // yield different xG — proof the signal carries its own information.
    const highVolume = estimateExpectedGoalsFromShots({ ...avg, shotsForPerGame: 20, shotsOnTargetForPerGame: 8 }, avg);
    const lowVolume = estimateExpectedGoalsFromShots({ ...avg, shotsForPerGame: 6, shotsOnTargetForPerGame: 1.8 }, avg);
    expect(highVolume.expectedHomeGoals).not.toBeCloseTo(lowVolume.expectedHomeGoals, 1);
  });
});

describe('xgDistribution', () => {
  it('sums to 1 and favours the higher-xG side', () => {
    const e = estimateExpectedGoalsFromShots({ ...avg, shotsForPerGame: 18, shotsOnTargetForPerGame: 7 }, avg);
    const d = xgDistribution(e)!;
    expect(d['1'] + d.X + d['2']).toBeCloseTo(1, 9);
    expect(d['1']).toBeGreaterThan(d['2']);
  });

  it('withholds for a two-way (no-draw) market', () => {
    const e = estimateExpectedGoalsFromShots(avg, avg);
    expect(xgDistribution(e, 'MONEYLINE_2WAY')).toBeUndefined();
  });
});

describe('shotsEnrichment', () => {
  it('returns an unavailable block when a profile is missing', () => {
    expect(shotsEnrichment(avg, undefined).available).toBe(false);
  });
  it('returns expected goals when both profiles are present', () => {
    const block = shotsEnrichment(avg, avg, DEFAULT_SHOT_PRIORS);
    expect(block.available).toBe(true);
    expect(block.expectedHomeGoals).toBeGreaterThan(0);
    expect(block.method).toBe('shots-based');
  });
});
