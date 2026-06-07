/** A single bookmaker price for a market on a fixture. */
export interface MarketOdd {
  bookCode: string;
  market: string;
  price: number;
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

/** The Odds API — reserved. Wired in S2. */
export class TheOddsApiProvider implements OddsProvider {
  readonly name = 'the-odds-api';
  readonly priority = 100;

  fetchOdds(): Promise<MarketOdd[]> {
    throw new Error('TheOddsApiProvider not implemented — wired in S2');
  }
}
