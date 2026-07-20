/**
 * API-Sports HTTP client.
 *
 * Two things this handles that a bare `fetch` does not:
 *
 * 1. Transport. API-Sports is reachable either directly (dashboard key,
 *    `x-apisports-key`) or through RapidAPI (`x-rapidapi-key` + host). The
 *    headers are not interchangeable and the wrong one returns a 403 that reads
 *    like an entitlement problem.
 * 2. Quota. Paid plans hard-stop at the daily request cap with no overage. A
 *    runaway loop does not cost money, it silently destroys tomorrow's data, so
 *    the budget guard refuses calls as the cap approaches.
 */

export type ApiSportsTransport = 'direct' | 'rapidapi';

export type ApiSportsSport = 'football' | 'basketball' | 'baseball' | 'hockey' | 'rugby' | 'american-football';

const DEFAULT_HOSTS: Record<ApiSportsSport, string> = {
  football: 'v3.football.api-sports.io',
  basketball: 'v1.basketball.api-sports.io',
  baseball: 'v1.baseball.api-sports.io',
  hockey: 'v1.hockey.api-sports.io',
  rugby: 'v1.rugby.api-sports.io',
  'american-football': 'v1.american-football.api-sports.io',
};

export class ApiSportsError extends Error {
  readonly status: number;
  readonly endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = 'ApiSportsError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

export class ApiSportsQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiSportsQuotaError';
  }
}

/** API-Sports wraps every payload in this envelope, including its own errors. */
interface ApiSportsEnvelope<T> {
  get?: string;
  results?: number;
  paging?: { current: number; total: number };
  /** Either an object of field errors or an empty array when there are none. */
  errors?: Record<string, string> | unknown[];
  response?: T;
}

export interface ApiSportsClientOptions {
  apiKey?: string | undefined;
  transport?: ApiSportsTransport | undefined;
  sport?: ApiSportsSport | undefined;
  host?: string | undefined;
  dailyQuota?: number | undefined;
  fetchImpl?: typeof fetch | undefined;
  /** Reserve a slice of the daily quota so scheduled jobs can't starve. */
  reservePct?: number | undefined;
}

export interface QuotaState {
  used: number;
  limit: number;
  remaining: number;
  usablePct: number;
}

export class ApiSportsClient {
  private readonly apiKey: string | undefined;
  private readonly transport: ApiSportsTransport;
  private readonly host: string;
  private readonly dailyQuota: number;
  private readonly reservePct: number;
  private readonly fetchImpl: typeof fetch;
  private used = 0;

  constructor(options: ApiSportsClientOptions = {}) {
    const sport = options.sport ?? 'football';
    this.apiKey = options.apiKey ?? process.env.API_SPORTS_KEY;
    this.transport = options.transport ?? ((process.env.API_SPORTS_TRANSPORT as ApiSportsTransport) || 'direct');
    this.host =
      options.host ??
      process.env[`API_SPORTS_${sport.toUpperCase().replace(/-/g, '_')}_HOST`] ??
      DEFAULT_HOSTS[sport];
    this.dailyQuota = options.dailyQuota ?? Number(process.env.API_SPORTS_DAILY_QUOTA ?? 7500);
    this.reservePct = options.reservePct ?? 0.1;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  configured() {
    return Boolean(this.apiKey);
  }

  quota(): QuotaState {
    const limit = Math.floor(this.dailyQuota * (1 - this.reservePct));
    return {
      used: this.used,
      limit,
      remaining: Math.max(0, limit - this.used),
      usablePct: limit > 0 ? this.used / limit : 1,
    };
  }

  private headers(): Record<string, string> {
    if (!this.apiKey) throw new ApiSportsError('API_SPORTS_KEY is not configured', 401, '');

    // Wrong header for the transport returns 403 with a misleading message.
    return this.transport === 'rapidapi'
      ? { 'x-rapidapi-key': this.apiKey, 'x-rapidapi-host': this.host }
      : { 'x-apisports-key': this.apiKey };
  }

  /**
   * Performs a single GET against an API-Sports endpoint.
   *
   * API-Sports returns HTTP 200 with a populated `errors` object for several
   * failure modes (bad params, plan limits), so the envelope must be inspected
   * rather than trusting the status code.
   */
  async get<T>(endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<T[]> {
    const budget = this.quota();
    if (budget.remaining <= 0) {
      throw new ApiSportsQuotaError(
        `API-Sports daily budget exhausted (${budget.used}/${budget.limit}). Refusing ${endpoint} to protect the next scheduled run.`,
      );
    }

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') search.set(key, String(value));
    }

    const query = search.toString();
    const url = `https://${this.host}/${endpoint.replace(/^\//, '')}${query ? `?${query}` : ''}`;

    const response = await this.fetchImpl(url, { headers: this.headers(), cache: 'no-store' });
    this.used += 1;

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ApiSportsError(
        `API-Sports ${response.status} on ${endpoint}: ${body.slice(0, 240)}`,
        response.status,
        endpoint,
      );
    }

    const envelope = (await response.json()) as ApiSportsEnvelope<T[]>;
    const errors = envelope.errors;

    if (errors && !Array.isArray(errors) && Object.keys(errors).length > 0) {
      const detail = Object.entries(errors)
        .map(([field, message]) => `${field}: ${message}`)
        .join('; ');
      throw new ApiSportsError(`API-Sports rejected ${endpoint}: ${detail}`, 200, endpoint);
    }

    return envelope.response ?? [];
  }

  /** Follows `paging` to completion, respecting the quota guard on each page. */
  async getAllPages<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
    maxPages = 20,
  ): Promise<T[]> {
    const collected: T[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= maxPages) {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') search.set(key, String(value));
      }
      search.set('page', String(page));

      const budget = this.quota();
      if (budget.remaining <= 0) {
        throw new ApiSportsQuotaError(
          `API-Sports daily budget exhausted during paging of ${endpoint} at page ${page}.`,
        );
      }

      const url = `https://${this.host}/${endpoint.replace(/^\//, '')}?${search.toString()}`;
      const response = await this.fetchImpl(url, { headers: this.headers(), cache: 'no-store' });
      this.used += 1;

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ApiSportsError(
          `API-Sports ${response.status} on ${endpoint} page ${page}: ${body.slice(0, 240)}`,
          response.status,
          endpoint,
        );
      }

      const envelope = (await response.json()) as ApiSportsEnvelope<T[]>;
      const errors = envelope.errors;
      if (errors && !Array.isArray(errors) && Object.keys(errors).length > 0) {
        const detail = Object.entries(errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join('; ');
        throw new ApiSportsError(`API-Sports rejected ${endpoint}: ${detail}`, 200, endpoint);
      }

      collected.push(...(envelope.response ?? []));
      totalPages = envelope.paging?.total ?? 1;
      page += 1;
    }

    return collected;
  }
}
