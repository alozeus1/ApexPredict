import type { FootballDataMatch } from '@/lib/live-data/football-data';

/** A single bookmaker price for a market on a fixture. */
export interface MarketOdd {
  bookCode: string;
  market: string;
  price: number;
  source?: string;
}

/**
 * A source of bookmaker odds. The runtime prediction engine works the same as
 * today (synthetic fair price when no real odds); this interface is in place for
 * the S2 cutover to live odds.
 */
export interface OddsProvider {
  readonly name: string;
  readonly priority: number;
  fetchOdds(fixtureExternalId: number): Promise<MarketOdd[]>;
}

export interface BatchOddsProvider extends OddsProvider {
  fetchCompetitionOdds(code: string, matches: FootballDataMatch[]): Promise<Map<number, MarketOdd[]>>;
}
