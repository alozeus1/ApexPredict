import type { MarketDistribution, PredictionMarket } from './model';
import { toDistribution } from './model';

/**
 * Market model (Phase 6 Model D) and margin removal.
 *
 * A bookmaker's implied probabilities sum to more than 1. The excess is the
 * margin ("vig" / "overround"). Comparing a model probability against a raw
 * `1/price` therefore compares against a number that is inflated by the
 * bookmaker's profit, which SYSTEMATICALLY OVERSTATES edge on every selection.
 *
 * Example: prices 2.10 / 3.40 / 3.90 imply 0.476 + 0.294 + 0.256 = 1.026.
 * A model saying 50% looks like +2.4pts of edge against the raw 47.6%, but only
 * +3.6pts... no — against the de-vigged 46.4% it is +3.6pts. The direction and
 * size of the error both matter, and it is never conservative.
 */

export type DevigMethod = 'multiplicative' | 'power' | 'shin';

export interface BookPrices {
  bookCode: string;
  /** Decimal prices per outcome. Must cover the whole market to be de-viggable. */
  prices: Partial<Record<PredictionMarket, number>>;
}

export interface DevigResult {
  probabilities: MarketDistribution;
  /** Overround as a fraction: 0.05 means the book's implied probabilities summed to 1.05. */
  margin: number;
  method: DevigMethod;
  complete: boolean;
}

function impliedRaw(prices: Partial<Record<PredictionMarket, number>>, markets: readonly PredictionMarket[]) {
  return markets.map((market) => {
    const price = prices[market];
    return price && price > 1 ? 1 / price : 0;
  });
}

/**
 * Multiplicative (proportional) de-vig. Divides every implied probability by the
 * booksum. Simple, standard, and slightly biased against longshots — documented
 * here so the choice is explicit rather than accidental.
 */
function devigMultiplicative(raw: number[]): number[] {
  const total = raw.reduce((sum, value) => sum + value, 0);
  return total > 0 ? raw.map((value) => value / total) : raw;
}

/**
 * Power de-vig. Solves for k such that sum(p_i^k) = 1. Handles favourite-longshot
 * bias better than proportional scaling at the cost of an iterative solve.
 */
function devigPower(raw: number[]): number[] {
  const positive = raw.filter((value) => value > 0);
  if (positive.length === 0) return raw;

  let low = 0.5;
  let high = 2.5;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    const total = raw.reduce((sum, value) => sum + (value > 0 ? value ** mid : 0), 0);
    if (total > 1) low = mid;
    else high = mid;
  }

  const k = (low + high) / 2;
  const powered = raw.map((value) => (value > 0 ? value ** k : 0));
  const total = powered.reduce((sum, value) => sum + value, 0);
  return total > 0 ? powered.map((value) => value / total) : powered;
}

/**
 * Shin de-vig. Models the margin as arising from insider trading, which tends to
 * price longshots more realistically than proportional scaling.
 */
function devigShin(raw: number[]): number[] {
  const booksum = raw.reduce((sum, value) => sum + value, 0);
  if (booksum <= 1) return devigMultiplicative(raw);

  let z = 0;
  for (let i = 0; i < 100; i += 1) {
    const next =
      raw.reduce((sum, value) => {
        const inner = z * z + 4 * (1 - z) * ((value * value) / booksum);
        return sum + Math.sqrt(Math.max(inner, 0));
      }, 0) - 2;
    const denominator = raw.length - 2;
    if (denominator === 0) break;
    const candidate = next / denominator;
    if (!Number.isFinite(candidate)) break;
    if (Math.abs(candidate - z) < 1e-12) {
      z = candidate;
      break;
    }
    z = Math.min(Math.max(candidate, 0), 0.5);
  }

  const adjusted = raw.map((value) => {
    const inner = z * z + 4 * (1 - z) * ((value * value) / booksum);
    return (Math.sqrt(Math.max(inner, 0)) - z) / (2 * (1 - z));
  });

  const total = adjusted.reduce((sum, value) => sum + value, 0);
  return total > 0 ? adjusted.map((value) => value / total) : devigMultiplicative(raw);
}

/**
 * Removes bookmaker margin from one book's prices.
 *
 * Returns `complete: false` when the book does not price every outcome — a
 * partial market cannot be de-vigged, and pretending otherwise invents a
 * probability. Callers must not treat an incomplete result as a fair price.
 */
export function devig(
  prices: Partial<Record<PredictionMarket, number>>,
  markets: readonly PredictionMarket[],
  method: DevigMethod = 'multiplicative',
): DevigResult {
  const raw = impliedRaw(prices, markets);
  const complete = raw.every((value) => value > 0);
  const booksum = raw.reduce((sum, value) => sum + value, 0);

  if (!complete) {
    return {
      probabilities: toDistribution(0, 0, 0),
      margin: booksum > 0 ? booksum - 1 : 0,
      method,
      complete: false,
    };
  }

  const fair =
    method === 'shin' ? devigShin(raw) : method === 'power' ? devigPower(raw) : devigMultiplicative(raw);

  const byMarket: Record<string, number> = {};
  markets.forEach((market, index) => {
    byMarket[market] = fair[index] ?? 0;
  });

  return {
    probabilities: toDistribution(byMarket['1'] ?? 0, byMarket.X ?? 0, byMarket['2'] ?? 0),
    margin: booksum - 1,
    method,
    complete: true,
  };
}

export interface ConsensusResult {
  probabilities: MarketDistribution;
  /** Books that priced the full market and contributed. */
  contributingBooks: string[];
  /** Mean overround across contributing books. */
  averageMargin: number;
  /** Max-minus-min de-vigged probability for the most disputed outcome. */
  dispersion: number;
  complete: boolean;
}

/**
 * Consensus fair probability across books.
 *
 * Each book is de-vigged INDEPENDENTLY before averaging. Averaging raw prices
 * first and de-vigging the average would blend different margins together and
 * produce a number that is no book's actual price.
 */
export function marketConsensus(
  books: BookPrices[],
  markets: readonly PredictionMarket[],
  method: DevigMethod = 'multiplicative',
): ConsensusResult {
  const devigged = books
    .map((book) => ({ bookCode: book.bookCode, result: devig(book.prices, markets, method) }))
    .filter((entry) => entry.result.complete);

  if (devigged.length === 0) {
    return {
      probabilities: toDistribution(0, 0, 0),
      contributingBooks: [],
      averageMargin: 0,
      dispersion: 0,
      complete: false,
    };
  }

  const mean = (market: PredictionMarket) =>
    devigged.reduce((sum, entry) => sum + entry.result.probabilities[market], 0) / devigged.length;

  const dispersion = Math.max(
    ...markets.map((market) => {
      const values = devigged.map((entry) => entry.result.probabilities[market]);
      return Math.max(...values) - Math.min(...values);
    }),
  );

  return {
    probabilities: toDistribution(mean('1'), markets.includes('X') ? mean('X') : 0, mean('2')),
    contributingBooks: devigged.map((entry) => entry.bookCode),
    averageMargin: devigged.reduce((sum, entry) => sum + entry.result.margin, 0) / devigged.length,
    dispersion,
    complete: true,
  };
}

/**
 * Expected value per unit staked, at a given decimal price.
 * EV = p * (price - 1) - (1 - p). Positive means the price is longer than fair.
 */
export function expectedValue(probability: number, decimalPrice: number): number {
  if (!(decimalPrice > 1) || !Number.isFinite(probability)) return 0;
  return probability * (decimalPrice - 1) - (1 - probability);
}

/**
 * Edge against the FAIR (de-vigged) market probability.
 *
 * This is the number that belongs in product copy and in policy gates — not the
 * difference against a raw `1/price`, which credits the bookmaker's margin to
 * the model.
 */
export function edgeVsFair(modelProbability: number, fairProbability: number): number {
  return modelProbability - fairProbability;
}
