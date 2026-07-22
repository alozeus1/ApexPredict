export type Sport = 'soccer' | 'basketball' | 'tennis' | 'football' | 'hockey' | 'rugby';

export interface OddsByBook {
  bookCode: string;
  price: number;
  market: '1' | 'X' | '2' | 'O2.5' | 'U2.5' | 'BTTS-Y' | 'BTTS-N';
}

export interface ModelOutput {
  elo: number;
  poisson: number;
  xg: number;
  ensemble: number;
  confidence: number;
}

export interface MatchContextStatus {
  available: boolean;
  provider?: string;
  reason?: string;
  summary: string;
}

export interface OddsMovementContext {
  bookCode: string;
  market: OddsByBook['market'];
  previousPrice: number;
  currentPrice: number;
  movementPct: number;
  capturedAt: string;
}

export interface PerformanceContext {
  sampleSize: number;
  windowDays: number;
  roi: number;
  hitRate: number;
  brierScore: number;
  logLoss: number;
  calibrationError: number;
}

export interface MatchPremiumContext {
  weather: MatchContextStatus;
  injuries: MatchContextStatus;
  lineups: MatchContextStatus;
  referee: MatchContextStatus;
  oddsMovement: OddsMovementContext[];
  performance?: PerformanceContext;
}

export interface Match {
  id: string;
  sport: Sport;
  league: string;
  home: { name: string; code: string };
  away: { name: string; code: string };
  kickoff: string;
  odds: OddsByBook[];
  model: ModelOutput;
  topPick: string;
  valueBet: boolean;
  narrative: string;
  premiumContext?: MatchPremiumContext;
  featured?: boolean;
}
