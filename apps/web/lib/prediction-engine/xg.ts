import { poissonDistribution } from './signals';
import { clamp, toDistribution, DEFAULT_MARKET_TYPE, type MarketDistribution, type OutcomeMarketType } from './model';
import { hasDraw } from './model';

/**
 * Expected-goals (xG) model (gap #4).
 *
 * The previous xG "agent" was a stub: it reused the Poisson branch's season goal
 * rate, carried no independent information, and rode at weight 0. This is a real
 * model built on SHOT data, which is a genuinely different signal from goals
 * scored — a side that out-shoots opponents but converts poorly is flagged as
 * stronger than its results, and vice versa.
 *
 * Two data richnesses sit behind ONE interface, so a positional feed drops in
 * without touching callers:
 *
 *   - `shots-based` (available today from API-Sports aggregate stats): expected
 *     goals from expected shot volume × accuracy × league conversion priors.
 *   - `positional-xg` (StatsBomb / Opta / Understat, when licensed): real
 *     per-shot xG averaged per game, used directly. Preferred when present.
 *
 * The expected-shot model is multiplicative attack × opponent-defence over the
 * league mean — the same well-worn structure as Dixon-Coles for goals, applied
 * to shots. All maths here is pure and unit-tested.
 */

/** A team's shot-creation and shot-concession profile over a recent window. */
export interface TeamShotProfile {
  shotsForPerGame: number;
  shotsOnTargetForPerGame: number;
  shotsAgainstPerGame: number;
  shotsOnTargetAgainstPerGame: number;
  /** Real per-game xG created, when a positional feed exists. Enables the preferred path. */
  xgForPerGame?: number;
  /** Real per-game xG conceded, when a positional feed exists. */
  xgAgainstPerGame?: number;
  /** Games behind these averages. Below `minSampleGames` the signal is withheld. */
  sampleSize: number;
}

export interface LeagueShotPriors {
  leagueAvgShots: number;
  leagueAvgShotsOnTarget: number;
  leagueAvgXg: number;
  /** P(goal | shot on target). League conversion of SOT. */
  sotConversion: number;
  /** P(goal | shot off target). Deflections/rebounds; small but non-zero. */
  offTargetConversion: number;
  homeShotBoost: number;
  awayShotBoost: number;
  minSampleGames: number;
}

/**
 * League priors for European football. Documented, not magic: ~12 shots and
 * ~4.3 on target per team per game, SOT converting near 0.30, off-target near
 * 0.02, home sides creating a little more. Tune per competition once enough
 * data exists rather than treating these as universal constants.
 */
export const DEFAULT_SHOT_PRIORS: LeagueShotPriors = {
  leagueAvgShots: 12,
  leagueAvgShotsOnTarget: 4.3,
  leagueAvgXg: 1.35,
  sotConversion: 0.3,
  offTargetConversion: 0.02,
  homeShotBoost: 1.08,
  awayShotBoost: 0.94,
  minSampleGames: 5,
};

export type XgMethod = 'positional-xg' | 'shots-based' | 'unavailable';

export interface ExpectedGoalsFromShots {
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  method: XgMethod;
  available: boolean;
  sampleSize: number;
  reason?: string;
}

/** Multiplicative attack × opponent-defence expectation over a league mean, with a home/away factor. */
function combineRate(teamFor: number, oppAgainst: number, leagueMean: number, boost: number): number {
  if (leagueMean <= 0) return teamFor;
  return (teamFor * oppAgainst / leagueMean) * boost;
}

function finite(...values: Array<number | undefined>): boolean {
  return values.every((v) => v !== undefined && Number.isFinite(v) && v >= 0);
}

/**
 * Estimates a fixture's expected goals for each side from shot profiles.
 *
 * Prefers the positional path when BOTH teams carry real per-game xG; otherwise
 * uses the shots-based path. Returns `available: false` (never a guessed number)
 * when either team is below the sample floor or inputs are missing — the honest
 * fallback that keeps a thin signal out of the ensemble instead of inventing one.
 */
export function estimateExpectedGoalsFromShots(
  home: TeamShotProfile,
  away: TeamShotProfile,
  priors: LeagueShotPriors = DEFAULT_SHOT_PRIORS,
): ExpectedGoalsFromShots {
  const sampleSize = Math.min(home.sampleSize, away.sampleSize);
  if (sampleSize < priors.minSampleGames) {
    return {
      expectedHomeGoals: 0,
      expectedAwayGoals: 0,
      method: 'unavailable',
      available: false,
      sampleSize,
      reason: `shot sample ${sampleSize} < ${priors.minSampleGames} games`,
    };
  }

  // ── Preferred: real positional xG ──────────────────────────────────────────
  if (finite(home.xgForPerGame, home.xgAgainstPerGame, away.xgForPerGame, away.xgAgainstPerGame)) {
    const expHome = combineRate(home.xgForPerGame!, away.xgAgainstPerGame!, priors.leagueAvgXg, priors.homeShotBoost);
    const expAway = combineRate(away.xgForPerGame!, home.xgAgainstPerGame!, priors.leagueAvgXg, priors.awayShotBoost);
    return {
      expectedHomeGoals: Number(clamp(expHome, 0.2, 4).toFixed(3)),
      expectedAwayGoals: Number(clamp(expAway, 0.15, 3.6).toFixed(3)),
      method: 'positional-xg',
      available: true,
      sampleSize,
    };
  }

  // ── Shots-based path ────────────────────────────────────────────────────────
  if (
    !finite(
      home.shotsForPerGame,
      home.shotsOnTargetForPerGame,
      home.shotsAgainstPerGame,
      home.shotsOnTargetAgainstPerGame,
      away.shotsForPerGame,
      away.shotsOnTargetForPerGame,
      away.shotsAgainstPerGame,
      away.shotsOnTargetAgainstPerGame,
    )
  ) {
    return {
      expectedHomeGoals: 0,
      expectedAwayGoals: 0,
      method: 'unavailable',
      available: false,
      sampleSize,
      reason: 'incomplete shot statistics',
    };
  }

  const expShotsHome = combineRate(home.shotsForPerGame, away.shotsAgainstPerGame, priors.leagueAvgShots, priors.homeShotBoost);
  const expSotHome = combineRate(home.shotsOnTargetForPerGame, away.shotsOnTargetAgainstPerGame, priors.leagueAvgShotsOnTarget, priors.homeShotBoost);
  const expShotsAway = combineRate(away.shotsForPerGame, home.shotsAgainstPerGame, priors.leagueAvgShots, priors.awayShotBoost);
  const expSotAway = combineRate(away.shotsOnTargetForPerGame, home.shotsOnTargetAgainstPerGame, priors.leagueAvgShotsOnTarget, priors.awayShotBoost);

  // Expected goals = on-target chances at SOT conversion + the residual
  // off-target shots at their small conversion. SOT is capped at total shots so
  // a noisy sample can never imply more on-target than total shots.
  const xgFrom = (shots: number, sot: number) => {
    const boundedSot = Math.min(sot, shots);
    return boundedSot * priors.sotConversion + Math.max(0, shots - boundedSot) * priors.offTargetConversion;
  };

  return {
    expectedHomeGoals: Number(clamp(xgFrom(expShotsHome, expSotHome), 0.2, 4).toFixed(3)),
    expectedAwayGoals: Number(clamp(xgFrom(expShotsAway, expSotAway), 0.15, 3.6).toFixed(3)),
    method: 'shots-based',
    available: true,
    sampleSize,
  };
}

/**
 * The xG signal's 1X2 distribution: the shot-derived expected goals run through
 * the same scoreline convolution the Poisson branch uses. Independence comes
 * from the INPUTS (shots, not season goals), not from a different shape.
 */
export function xgDistribution(
  estimate: ExpectedGoalsFromShots,
  marketType: OutcomeMarketType = DEFAULT_MARKET_TYPE,
): MarketDistribution | undefined {
  if (!estimate.available) return undefined;
  // The goal model is football-specific; a two-way sport has no goal grid.
  if (!hasDraw(marketType)) return undefined;
  const dist = poissonDistribution(estimate.expectedHomeGoals, estimate.expectedAwayGoals);
  return toDistribution(dist['1'], dist.X, dist['2'], marketType);
}

/**
 * Builds the `PredictionEnrichment.shots` block from two team profiles. The
 * ingestion layer calls this once it has assembled each side's recent shot rates
 * (from API-Sports fixture statistics, or a positional feed); the orchestrator's
 * xg-agent then reads the block. Returns an `available: false` block, never a
 * guess, when the estimate could not be formed.
 */
export function shotsEnrichment(
  home: TeamShotProfile | undefined,
  away: TeamShotProfile | undefined,
  priors: LeagueShotPriors = DEFAULT_SHOT_PRIORS,
): {
  available: boolean;
  source: string;
  method?: 'positional-xg' | 'shots-based';
  expectedHomeGoals?: number;
  expectedAwayGoals?: number;
  sampleSize?: number;
  reason?: string;
} {
  if (!home || !away) {
    return { available: false, source: 'shots-xg', reason: 'shot profile missing for one or both teams' };
  }
  const estimate = estimateExpectedGoalsFromShots(home, away, priors);
  if (!estimate.available) {
    return { available: false, source: 'shots-xg', ...(estimate.reason ? { reason: estimate.reason } : {}) };
  }
  return {
    available: true,
    source: 'shots-xg',
    ...(estimate.method !== 'unavailable' ? { method: estimate.method } : {}),
    expectedHomeGoals: estimate.expectedHomeGoals,
    expectedAwayGoals: estimate.expectedAwayGoals,
    sampleSize: estimate.sampleSize,
  };
}

// ── Positional feed drop-in ───────────────────────────────────────────────────

/** One shot event, from a positional provider. `xg` is the provider's per-shot value when present. */
export interface ShotEvent {
  teamIsHome: boolean;
  onTarget: boolean;
  xg?: number;
  minute?: number;
}

/**
 * Interface a positional shot feed implements. Supplying one of these lets the
 * store populate `TeamShotProfile.xgForPerGame` / `xgAgainstPerGame`, which flips
 * `estimateExpectedGoalsFromShots` onto the preferred positional path with no
 * change to the model or the orchestrator.
 */
export interface ShotEventSource {
  readonly provider: string;
  /** Recent shots for and against a team, most recent first. */
  recentShots(teamExternalId: number, options: { games: number; asOf: Date }): Promise<ShotEvent[]>;
}
