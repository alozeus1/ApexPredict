/**
 * Provider and licensing registry types.
 *
 * Two purposes:
 *
 * 1. Operational — what each feed covers, how fast it moves, what it costs in
 *    quota, and whether it is currently healthy.
 * 2. Legal — what we are actually permitted to do with the data. Storage,
 *    model-training, derivative-commercial-output and redistribution rights are
 *    SEPARATE permissions. Holding an API key grants none of them by default.
 *
 * Any right recorded as UNKNOWN is a production gate, not a footnote. We do not
 * infer commercial rights from the existence of a free tier.
 */

export type RightsStatus = 'GRANTED' | 'DENIED' | 'CONDITIONAL' | 'UNKNOWN';

export type VerificationStatus =
  | 'VERIFIED' // terms read, right confirmed in writing or in published terms
  | 'ASSUMED' // read but ambiguous — treated as UNKNOWN for gating
  | 'UNREVIEWED';

export type AuthMethod = 'header-api-key' | 'query-api-key' | 'bearer-token' | 'basic' | 'none';

export type DataPurpose =
  | 'fixtures'
  | 'standings'
  | 'team-statistics'
  | 'player-statistics'
  | 'injuries'
  | 'lineups'
  | 'referees'
  | 'odds'
  | 'odds-history'
  | 'closing-odds'
  | 'results'
  | 'weather';

/**
 * The four rights that matter, kept separate because vendors grant them
 * separately. Conflating them is how products end up in breach.
 */
export interface LicensingRights {
  /** May we persist raw or normalized records beyond the request? */
  storage: RightsStatus;
  /** May we train statistical or ML models on it? */
  modelTraining: RightsStatus;
  /** May we sell output derived from it (subscriptions)? */
  derivedCommercialOutput: RightsStatus;
  /** May we display or redistribute the values themselves to end users? */
  displayRedistribution: RightsStatus;
  attributionRequired: boolean;
  attributionText?: string;
  retentionLimitDays?: number;
  verification: VerificationStatus;
  /** Where the determination came from — terms URL, email, contract reference. */
  evidence?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface QuotaPolicy {
  /** Requests per day, if the plan is expressed that way. */
  dailyRequests?: number;
  /** Requests per minute, if enforced. */
  requestsPerMinute?: number;
  /** Fraction of the daily budget held back for scheduled jobs. */
  reservePct: number;
  /** Whether the vendor hard-stops (no overage) or bills for excess. */
  overage: 'hard-stop' | 'billed' | 'unknown';
}

export interface ReliabilityPolicy {
  timeoutMs: number;
  maxRetries: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  jitter: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerCooldownMs: number;
}

export interface ProviderCoverage {
  purposes: DataPurpose[];
  /** Internal competition codes, or 'varies' where coverage is per-league. */
  competitions: string[] | 'varies';
  /** Earliest season available, if known. */
  historicalDepthFrom?: string;
  /** Typical lag between real-world event and availability. */
  dataLatency: string;
  /** How often we refresh from this provider. */
  refreshInterval: string;
}

export interface ProviderHealth {
  lastSuccessfulIngestionAt?: string;
  lastFailureAt?: string;
  consecutiveFailures: number;
  /** 0–1. Composite of coverage, freshness and missingness. Null until measured. */
  dataQualityScore: number | null;
}

export interface ProviderDefinition {
  id: string;
  displayName: string;
  /** Feed or product name where a vendor sells several. */
  dataset: string;
  purposes: DataPurpose[];
  /** Env var names ONLY. Never a value. */
  envVars: string[];
  authMethod: AuthMethod;
  baseUrlEnvVar?: string;
  quota: QuotaPolicy;
  reliability: ReliabilityPolicy;
  coverage: ProviderCoverage;
  licensing: LicensingRights;
  /** False disables the provider without deleting its registry entry. */
  enabled: boolean;
  /** Higher wins when two providers supply the same field. */
  priority: number;
}

/** A right required for a given use of a provider. */
export type RequiredRight = keyof Pick<
  LicensingRights,
  'storage' | 'modelTraining' | 'derivedCommercialOutput' | 'displayRedistribution'
>;
