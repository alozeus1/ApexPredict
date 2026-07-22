import type { FootballDataMatch } from '@/lib/live-data/football-data';
import type { BatchOddsProvider, MarketOdd } from './types';

const SPORT_KEYS: Record<string, string> = {
  PL: 'soccer_epl',
  PD: 'soccer_spain_la_liga',
  BL1: 'soccer_germany_bundesliga',
  SA: 'soccer_italy_serie_a',
  FL1: 'soccer_france_ligue_one',
  CL: 'soccer_uefa_champs_league',
  BSA: 'soccer_brazil_campeonato',
  WC: 'soccer_fifa_world_cup',
};

interface OddsApiOutcome {
  name: string;
  price: number;
}

interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}

interface OddsApiBookmaker {
  key: string;
  title: string;
  markets: OddsApiMarket[];
}

interface OddsApiEvent {
  home_team: string;
  away_team: string;
  bookmakers?: OddsApiBookmaker[];
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(fc|cf|sc|afc|the)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function teamNames(match: FootballDataMatch) {
  return {
    home: [match.homeTeam.name, match.homeTeam.shortName, match.homeTeam.tla].filter(Boolean).map((v) => normalizeName(String(v))),
    away: [match.awayTeam.name, match.awayTeam.shortName, match.awayTeam.tla].filter(Boolean).map((v) => normalizeName(String(v))),
  };
}

function sameTeam(source: string, candidates: string[]) {
  const normalized = normalizeName(source);
  return candidates.some((candidate) => candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate));
}

function matchEvent(event: OddsApiEvent, matches: FootballDataMatch[]) {
  return matches.find((match) => {
    const names = teamNames(match);
    return sameTeam(event.home_team, names.home) && sameTeam(event.away_team, names.away);
  });
}

function marketForOutcome(outcome: OddsApiOutcome, event: OddsApiEvent): string | undefined {
  if (outcome.name === 'Draw') return 'X';
  if (normalizeName(outcome.name) === normalizeName(event.home_team)) return '1';
  if (normalizeName(outcome.name) === normalizeName(event.away_team)) return '2';
  return undefined;
}

function bookCode(bookmaker: OddsApiBookmaker) {
  return bookmaker.key.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 24);
}

function oddsEndpoint(apiKey: string, sportKey: string) {
  const regions = process.env.THE_ODDS_API_REGIONS ?? 'us,uk,eu';
  const markets = process.env.THE_ODDS_API_MARKETS ?? 'h2h';
  const oddsFormat = process.env.THE_ODDS_API_FORMAT ?? 'decimal';
  const params = new URLSearchParams({ apiKey, regions, markets, oddsFormat });
  return `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?${params.toString()}`;
}

/** The Odds API provider. Disabled until THE_ODDS_API_KEY is configured. */
export class TheOddsApiProvider implements BatchOddsProvider {
  readonly name = 'the-odds-api';
  readonly priority = 100;

  constructor(private readonly apiKey = process.env.THE_ODDS_API_KEY) {}

  configured() {
    return Boolean(this.apiKey);
  }

  async fetchOdds(): Promise<MarketOdd[]> {
    return [];
  }

  async fetchCompetitionOdds(code: string, matches: FootballDataMatch[]): Promise<Map<number, MarketOdd[]>> {
    const output = new Map<number, MarketOdd[]>();
    if (!this.apiKey || matches.length === 0) return output;

    const sportKey = SPORT_KEYS[code];
    if (!sportKey) return output;

    const response = await fetch(oddsEndpoint(this.apiKey, sportKey), { cache: 'no-store' });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`The Odds API ${response.status} for ${code}: ${text.slice(0, 240)}`);
    }

    const events = (await response.json()) as OddsApiEvent[];
    for (const event of events) {
      const match = matchEvent(event, matches);
      if (!match) continue;
      const odds: MarketOdd[] = [];
      for (const bookmaker of event.bookmakers ?? []) {
        const h2h = bookmaker.markets.find((market) => market.key === 'h2h');
        for (const outcome of h2h?.outcomes ?? []) {
          const market = marketForOutcome(outcome, event);
          if (!market || outcome.price <= 1) continue;
          odds.push({ bookCode: bookCode(bookmaker), market, price: outcome.price, source: this.name });
        }
      }
      if (odds.length > 0) output.set(match.id, odds);
    }

    return output;
  }
}
