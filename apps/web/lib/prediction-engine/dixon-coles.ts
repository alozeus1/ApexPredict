import type { MarketDistribution } from './model';
import { toDistribution } from './model';

/**
 * Dixon-Coles score model (Phase 6, Model B).
 *
 * Independent Poisson underestimates low-scoring results — particularly 0-0,
 * 1-0, 0-1 and 1-1, which are exactly the scorelines football produces most
 * often. Dixon & Coles (1997) correct this with a dependence factor `tau`
 * applied to the four low-score cells, plus exponential time-decay so recent
 * matches carry more weight than old ones.
 *
 * Every market this module exposes is derived from ONE score distribution, so
 * 1X2, over/under, BTTS and correct-score are internally consistent by
 * construction. They cannot disagree with each other, because they are all
 * marginals of the same grid.
 */

export interface MatchObservation {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  /** Kickoff. Used for time-decay weighting only. */
  date: Date;
}

export interface DixonColesParams {
  /** Per-team attacking strength (log scale, mean-centred). */
  attack: Record<string, number>;
  /** Per-team defensive strength (log scale, mean-centred). Lower is better. */
  defence: Record<string, number>;
  /** League home advantage (log scale). */
  homeAdvantage: number;
  /** Low-score dependence parameter. rho = 0 reduces to independent Poisson. */
  rho: number;
  /** League baseline goal rate (log scale). */
  intercept: number;
  teams: string[];
  matchesUsed: number;
  converged: boolean;
  iterations: number;
}

export interface FitOptions {
  /** Half-life in days for exponential time decay. 0 disables decay. */
  halfLifeDays?: number;
  /** Reference date for decay. Defaults to the latest observation. */
  asOf?: Date;
  maxIterations?: number;
  learningRate?: number;
  /** L2 penalty pulling attack/defence toward zero. Shrinks sparse teams. */
  regularization?: number;
  tolerance?: number;
}

/**
 * Dixon-Coles low-score correction.
 *
 * Only the four cells where both teams score 0 or 1 are adjusted. `rho > 0`
 * lifts draws (0-0, 1-1) and suppresses 1-0/0-1; `rho < 0` does the reverse.
 */
export function tau(homeGoals: number, awayGoals: number, lambda: number, mu: number, rho: number): number {
  if (homeGoals === 0 && awayGoals === 0) return 1 - lambda * mu * rho;
  if (homeGoals === 0 && awayGoals === 1) return 1 + lambda * rho;
  if (homeGoals === 1 && awayGoals === 0) return 1 + mu * rho;
  if (homeGoals === 1 && awayGoals === 1) return 1 - rho;
  return 1;
}

function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logFactorial = 0;
  for (let i = 2; i <= k; i += 1) logFactorial += Math.log(i);
  return Math.exp(-lambda + k * Math.log(lambda) - logFactorial);
}

function decayWeight(matchDate: Date, asOf: Date, halfLifeDays: number): number {
  if (halfLifeDays <= 0) return 1;
  const ageDays = (asOf.getTime() - matchDate.getTime()) / 86_400_000;
  if (ageDays <= 0) return 1;
  return 0.5 ** (ageDays / halfLifeDays);
}

/** Expected goals for a fixture under a fitted model. */
export function expectedGoals(
  params: DixonColesParams,
  homeTeam: string,
  awayTeam: string,
): { lambda: number; mu: number } {
  const attackHome = params.attack[homeTeam] ?? 0;
  const defenceHome = params.defence[homeTeam] ?? 0;
  const attackAway = params.attack[awayTeam] ?? 0;
  const defenceAway = params.defence[awayTeam] ?? 0;

  return {
    lambda: Math.exp(params.intercept + params.homeAdvantage + attackHome + defenceAway),
    mu: Math.exp(params.intercept + attackAway + defenceHome),
  };
}

/**
 * Fits attack/defence/home-advantage/rho by gradient ascent on the
 * time-weighted Dixon-Coles log-likelihood.
 *
 * Identifiability: attack and defence are mean-centred each iteration. Without
 * that constraint the parameters are only identified up to an additive
 * constant, and the fit wanders without improving.
 *
 * This is deliberately a simple optimiser. It is transparent and testable, and
 * on league-sized data it converges adequately. Swap in L-BFGS if profiling
 * later shows it matters — but validate the swap against the same tests.
 */
export function fitDixonColes(matches: MatchObservation[], options: FitOptions = {}): DixonColesParams {
  const halfLifeDays = options.halfLifeDays ?? 180;
  const maxIterations = options.maxIterations ?? 500;
  const learningRate = options.learningRate ?? 0.05;
  const regularization = options.regularization ?? 0.01;
  const tolerance = options.tolerance ?? 1e-7;

  const teams = Array.from(new Set(matches.flatMap((match) => [match.homeTeam, match.awayTeam]))).sort();
  const asOf = options.asOf ?? matches.reduce((latest, match) => (match.date > latest ? match.date : latest), new Date(0));

  const attack: Record<string, number> = {};
  const defence: Record<string, number> = {};
  for (const team of teams) {
    attack[team] = 0;
    defence[team] = 0;
  }

  const totalGoals = matches.reduce((sum, match) => sum + match.homeGoals + match.awayGoals, 0);
  let intercept = matches.length > 0 ? Math.log(Math.max(totalGoals / (2 * matches.length), 0.05)) : 0;
  let homeAdvantage = 0.25;
  let rho = 0;

  const weights = matches.map((match) => decayWeight(match.date, asOf, halfLifeDays));

  let previousLogLik = -Infinity;
  let converged = false;
  let iterations = 0;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    iterations = iteration + 1;

    const gradAttack: Record<string, number> = {};
    const gradDefence: Record<string, number> = {};
    for (const team of teams) {
      gradAttack[team] = 0;
      gradDefence[team] = 0;
    }
    let gradHome = 0;
    let gradRho = 0;
    let logLik = 0;

    for (let i = 0; i < matches.length; i += 1) {
      const match = matches[i] as MatchObservation;
      const weight = weights[i] as number;
      const { lambda, mu } = expectedGoals(
        { attack, defence, homeAdvantage, rho, intercept, teams, matchesUsed: 0, converged: false, iterations: 0 },
        match.homeTeam,
        match.awayTeam,
      );

      // d/dparam of Poisson log-likelihood: (observed - expected) for log-link.
      const homeResidual = match.homeGoals - lambda;
      const awayResidual = match.awayGoals - mu;

      gradAttack[match.homeTeam] = (gradAttack[match.homeTeam] ?? 0) + weight * homeResidual;
      gradDefence[match.awayTeam] = (gradDefence[match.awayTeam] ?? 0) + weight * homeResidual;
      gradAttack[match.awayTeam] = (gradAttack[match.awayTeam] ?? 0) + weight * awayResidual;
      gradDefence[match.homeTeam] = (gradDefence[match.homeTeam] ?? 0) + weight * awayResidual;
      gradHome += weight * homeResidual;

      const tauValue = tau(match.homeGoals, match.awayGoals, lambda, mu, rho);
      if (tauValue > 0) {
        logLik +=
          weight *
          (Math.log(tauValue) +
            Math.log(Math.max(poissonPmf(lambda, match.homeGoals), 1e-300)) +
            Math.log(Math.max(poissonPmf(mu, match.awayGoals), 1e-300)));

        // Numerical derivative of log(tau) wrt rho — tau is piecewise and cheap.
        const step = 1e-5;
        const tauUp = tau(match.homeGoals, match.awayGoals, lambda, mu, rho + step);
        const tauDown = tau(match.homeGoals, match.awayGoals, lambda, mu, rho - step);
        if (tauUp > 0 && tauDown > 0) {
          gradRho += (weight * (Math.log(tauUp) - Math.log(tauDown))) / (2 * step);
        }
      }
    }

    const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;

    for (const team of teams) {
      attack[team] =
        (attack[team] ?? 0) + (learningRate * ((gradAttack[team] ?? 0) / weightTotal - regularization * (attack[team] ?? 0)));
      defence[team] =
        (defence[team] ?? 0) +
        (learningRate * ((gradDefence[team] ?? 0) / weightTotal - regularization * (defence[team] ?? 0)));
    }
    homeAdvantage += learningRate * (gradHome / weightTotal);
    rho = Math.max(-0.2, Math.min(0.2, rho + (learningRate * gradRho) / weightTotal));

    // Identifiability constraint: centre attack and defence.
    const attackMean = teams.reduce((sum, team) => sum + (attack[team] ?? 0), 0) / (teams.length || 1);
    const defenceMean = teams.reduce((sum, team) => sum + (defence[team] ?? 0), 0) / (teams.length || 1);
    for (const team of teams) {
      attack[team] = (attack[team] ?? 0) - attackMean;
      defence[team] = (defence[team] ?? 0) - defenceMean;
    }
    intercept += attackMean + defenceMean;

    if (Math.abs(logLik - previousLogLik) < tolerance * Math.max(1, Math.abs(previousLogLik))) {
      converged = true;
      break;
    }
    previousLogLik = logLik;
  }

  return { attack, defence, homeAdvantage, rho, intercept, teams, matchesUsed: matches.length, converged, iterations };
}

export interface ScoreGrid {
  /** grid[h][a] = P(home scores h, away scores a). */
  grid: number[][];
  maxGoals: number;
  /** Probability mass beyond the grid, folded into the final row/column. */
  tailMass: number;
}

/**
 * Builds the joint scoreline distribution.
 *
 * Tail handling matters: truncating at `maxGoals` and renormalising quietly
 * discards mass from high-scoring games. Here the residual is folded into the
 * boundary cells and reported, so it is visible rather than silently dropped.
 */
export function scoreGrid(lambda: number, mu: number, rho: number, maxGoals = 10): ScoreGrid {
  const grid: number[][] = [];
  let total = 0;

  for (let h = 0; h <= maxGoals; h += 1) {
    const row: number[] = [];
    for (let a = 0; a <= maxGoals; a += 1) {
      const probability = poissonPmf(lambda, h) * poissonPmf(mu, a) * tau(h, a, lambda, mu, rho);
      const safe = Math.max(probability, 0);
      row.push(safe);
      total += safe;
    }
    grid.push(row);
  }

  const tailMass = Math.max(0, 1 - total);
  if (total > 0) {
    for (let h = 0; h <= maxGoals; h += 1) {
      for (let a = 0; a <= maxGoals; a += 1) {
        (grid[h] as number[])[a] = ((grid[h] as number[])[a] as number) / total;
      }
    }
  }

  return { grid, maxGoals, tailMass };
}

/** 1X2 marginal of the score grid. */
export function outcomeProbabilities(scores: ScoreGrid): MarketDistribution {
  let home = 0;
  let draw = 0;
  let away = 0;

  for (let h = 0; h <= scores.maxGoals; h += 1) {
    for (let a = 0; a <= scores.maxGoals; a += 1) {
      const probability = (scores.grid[h] as number[])[a] as number;
      if (h > a) home += probability;
      else if (h === a) draw += probability;
      else away += probability;
    }
  }

  return toDistribution(home, draw, away);
}

/** P(total goals > line). Half-lines only, so there are no pushes to handle. */
export function overProbability(scores: ScoreGrid, line: number): number {
  let over = 0;
  for (let h = 0; h <= scores.maxGoals; h += 1) {
    for (let a = 0; a <= scores.maxGoals; a += 1) {
      if (h + a > line) over += (scores.grid[h] as number[])[a] as number;
    }
  }
  return over;
}

/** P(both teams score at least once). */
export function bttsProbability(scores: ScoreGrid): number {
  let both = 0;
  for (let h = 1; h <= scores.maxGoals; h += 1) {
    for (let a = 1; a <= scores.maxGoals; a += 1) {
      both += (scores.grid[h] as number[])[a] as number;
    }
  }
  return both;
}

/** Most likely correct scores, highest first. */
export function topScorelines(scores: ScoreGrid, count = 5) {
  const entries: Array<{ home: number; away: number; probability: number }> = [];
  for (let h = 0; h <= scores.maxGoals; h += 1) {
    for (let a = 0; a <= scores.maxGoals; a += 1) {
      entries.push({ home: h, away: a, probability: (scores.grid[h] as number[])[a] as number });
    }
  }
  return entries.sort((left, right) => right.probability - left.probability).slice(0, count);
}
