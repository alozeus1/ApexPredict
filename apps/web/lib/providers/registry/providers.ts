import type { ProviderDefinition } from './types';

/**
 * The provider registry.
 *
 * Every licensing right below is UNKNOWN unless someone has read the vendor's
 * terms and recorded evidence. UNKNOWN is deliberate and honest: as of
 * 2026-07-19 no provider's terms have been reviewed for this product.
 *
 * Do not change a right to GRANTED without filling in `evidence` and
 * `reviewedAt`. `assertRightsFor()` gates behaviour on these values, so an
 * unreviewed optimistic edit silently unblocks a production gate.
 */

const UNREVIEWED_RIGHTS = {
  storage: 'UNKNOWN',
  modelTraining: 'UNKNOWN',
  derivedCommercialOutput: 'UNKNOWN',
  displayRedistribution: 'UNKNOWN',
  attributionRequired: false,
  verification: 'UNREVIEWED',
} as const;

const DEFAULT_RELIABILITY = {
  timeoutMs: 10_000,
  maxRetries: 3,
  backoffBaseMs: 500,
  backoffMaxMs: 8_000,
  jitter: true,
  circuitBreakerThreshold: 5,
  circuitBreakerCooldownMs: 30 * 60 * 1000,
};

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'football-data',
    displayName: 'Football-Data.org',
    dataset: 'competitions / matches / standings',
    purposes: ['fixtures', 'standings', 'results'],
    envVars: ['FOOTBALL_DATA_API_TOKEN', 'FOOTBALL_DATA_COMPETITIONS'],
    authMethod: 'header-api-key',
    quota: { requestsPerMinute: 10, reservePct: 0.1, overage: 'hard-stop' },
    reliability: DEFAULT_RELIABILITY,
    coverage: {
      purposes: ['fixtures', 'standings', 'results'],
      competitions: ['WC', 'BSA', 'PL', 'PD', 'BL1', 'SA', 'FL1', 'CL'],
      dataLatency: 'minutes to hours',
      refreshInterval: 'daily (0 6 * * *)',
    },
    licensing: {
      ...UNREVIEWED_RIGHTS,
      notes:
        'Currently the ONLY live source feeding the prediction engine. Free tier. ' +
        'Commercial redistribution rights unverified — a launch blocker.',
    },
    enabled: true,
    priority: 100,
  },
  {
    id: 'api-sports',
    displayName: 'API-Sports (API-Football)',
    dataset: 'football v3',
    purposes: [
      'fixtures',
      'standings',
      'team-statistics',
      'player-statistics',
      'injuries',
      'lineups',
      'referees',
      'results',
      'odds',
    ],
    envVars: ['API_SPORTS_KEY', 'API_SPORTS_TRANSPORT', 'API_SPORTS_FOOTBALL_HOST', 'API_SPORTS_DAILY_QUOTA'],
    authMethod: 'header-api-key',
    quota: { dailyRequests: 7_500, reservePct: 0.1, overage: 'hard-stop' },
    reliability: DEFAULT_RELIABILITY,
    coverage: {
      purposes: ['fixtures', 'injuries', 'lineups', 'team-statistics', 'player-statistics', 'referees'],
      competitions: 'varies',
      dataLatency: 'lineups 20-40 min pre-kickoff; injuries vary by league',
      refreshInterval: 'daily + 15-minute pre-kickoff window (planned)',
    },
    licensing: {
      ...UNREVIEWED_RIGHTS,
      notes:
        'Paid subscription held (football tier). Payment grants access, NOT ' +
        'model-training or redistribution rights. Confirm in writing before ' +
        'training on this data or displaying raw values.',
    },
    enabled: true,
    priority: 110,
  },
  {
    id: 'the-odds-api',
    displayName: 'The Odds API',
    dataset: 'v4 odds',
    purposes: ['odds'],
    envVars: ['THE_ODDS_API_KEY', 'THE_ODDS_API_REGIONS', 'THE_ODDS_API_MARKETS', 'THE_ODDS_API_FORMAT'],
    authMethod: 'query-api-key',
    quota: { reservePct: 0.1, overage: 'hard-stop' },
    reliability: DEFAULT_RELIABILITY,
    coverage: {
      purposes: ['odds'],
      competitions: ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL', 'BSA', 'WC'],
      dataLatency: 'near real-time',
      refreshInterval: 'daily (will increase pre-kickoff)',
    },
    licensing: {
      ...UNREVIEWED_RIGHTS,
      notes: 'Odds display and redistribution rights unverified. h2h markets only today; prices are not de-vigged.',
    },
    enabled: false,
    priority: 90,
  },
  {
    id: 'opticodds',
    displayName: 'OpticOdds',
    dataset: 'v3 odds / injuries / results',
    purposes: ['odds', 'odds-history', 'closing-odds', 'injuries', 'results'],
    envVars: ['OPTICODDS_API_KEY'],
    authMethod: 'header-api-key',
    quota: { reservePct: 0.1, overage: 'unknown' },
    reliability: DEFAULT_RELIABILITY,
    coverage: {
      purposes: ['odds', 'odds-history', 'closing-odds'],
      competitions: 'varies',
      dataLatency: 'real-time via SSE',
      refreshInterval: 'not integrated',
    },
    licensing: {
      ...UNREVIEWED_RIGHTS,
      notes:
        'NO CONTRACT HELD. Enterprise pricing, undisclosed. Required for ' +
        'closing-line value (gap G13). Streaming is SSE, which cannot run on ' +
        'Vercel serverless — needs a long-running service.',
    },
    enabled: false,
    priority: 120,
  },
  {
    id: 'therundown',
    displayName: 'TheRundown',
    dataset: 'odds / scores',
    purposes: ['odds', 'results'],
    envVars: ['THERUNDOWN_API_KEY'],
    authMethod: 'header-api-key',
    quota: { reservePct: 0.1, overage: 'unknown' },
    reliability: DEFAULT_RELIABILITY,
    coverage: { purposes: ['odds', 'results'], competitions: 'varies', dataLatency: 'unknown', refreshInterval: 'not integrated' },
    licensing: { ...UNREVIEWED_RIGHTS, notes: 'NO CONTRACT HELD. Not evaluated.' },
    enabled: false,
    priority: 80,
  },
  {
    id: 'open-meteo',
    displayName: 'Open-Meteo',
    dataset: 'forecast',
    purposes: ['weather'],
    envVars: ['VENUE_COORDINATES_JSON'],
    authMethod: 'none',
    quota: { reservePct: 0, overage: 'hard-stop' },
    reliability: DEFAULT_RELIABILITY,
    coverage: {
      purposes: ['weather'],
      competitions: 'varies',
      dataLatency: 'hourly',
      refreshInterval: 'daily, only where venue coordinates are configured',
    },
    licensing: {
      ...UNREVIEWED_RIGHTS,
      attributionRequired: true,
      notes: 'Free tier generally permits non-commercial use; commercial terms unverified. Attribution assumed required.',
    },
    enabled: true,
    priority: 50,
  },
  {
    id: 'football-data-couk',
    displayName: 'football-data.co.uk (historical CSV)',
    dataset: 'historical results + opening/closing odds',
    purposes: ['results', 'odds-history', 'closing-odds'],
    envVars: [],
    authMethod: 'none',
    quota: { reservePct: 0, overage: 'hard-stop' },
    reliability: DEFAULT_RELIABILITY,
    coverage: {
      purposes: ['results', 'odds-history', 'closing-odds'],
      competitions: ['PL', 'PD', 'BL1', 'SA', 'FL1'],
      historicalDepthFrom: 'unverified',
      dataLatency: 'weekly file updates',
      refreshInterval: 'manual import via lib/odds/csv-import.ts',
    },
    licensing: {
      ...UNREVIEWED_RIGHTS,
      notes:
        'Cheapest route to historical closing odds, which unblocks closing-line ' +
        'value. Terms unverified — confirm before commercial use.',
    },
    enabled: false,
    priority: 40,
  },
];

export function getProvider(id: string): ProviderDefinition | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

export function enabledProviders(): ProviderDefinition[] {
  return PROVIDERS.filter((provider) => provider.enabled);
}
