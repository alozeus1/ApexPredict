import { describe, expect, it, vi } from 'vitest';
import { ApiSportsClient, ApiSportsError, ApiSportsQuotaError } from '../client';
import { fetchLeagues, missingFeatures, supportsFeature, type ApiSportsCoverage } from '../football/leagues';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const fullCoverage: ApiSportsCoverage = {
  fixtures: { events: true, lineups: true, statistics_fixtures: true, statistics_players: true },
  standings: true,
  players: true,
  top_scorers: true,
  top_assists: true,
  top_cards: true,
  injuries: true,
  predictions: true,
  odds: true,
};

const thinCoverage: ApiSportsCoverage = {
  ...fullCoverage,
  fixtures: { events: true, lineups: false, statistics_fixtures: false, statistics_players: false },
  injuries: false,
};

describe('ApiSportsClient transport', () => {
  it('sends the direct dashboard header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ response: [] }));
    const client = new ApiSportsClient({ apiKey: 'k', transport: 'direct', fetchImpl });

    await client.get('leagues');

    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init.headers).toEqual({ 'x-apisports-key': 'k' });
  });

  it('sends the RapidAPI header pair instead', async () => {
    // Wrong header for the transport returns a 403 that reads like a billing
    // problem, so this distinction is worth a test.
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ response: [] }));
    const client = new ApiSportsClient({ apiKey: 'k', transport: 'rapidapi', fetchImpl });

    await client.get('leagues');

    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init.headers).toEqual({
      'x-rapidapi-key': 'k',
      'x-rapidapi-host': 'v3.football.api-sports.io',
    });
  });

  it('targets the right host per sport', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ response: [] }));
    const client = new ApiSportsClient({ apiKey: 'k', sport: 'basketball', fetchImpl });

    await client.get('leagues');

    expect(fetchImpl.mock.calls[0]![0]).toContain('v1.basketball.api-sports.io');
  });
});

describe('ApiSportsClient error handling', () => {
  it('throws on a non-2xx response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: 'nope' }, 403));
    const client = new ApiSportsClient({ apiKey: 'k', fetchImpl });

    await expect(client.get('leagues')).rejects.toBeInstanceOf(ApiSportsError);
  });

  it('throws when a 200 carries a populated errors object', async () => {
    // API-Sports reports plan and parameter failures as HTTP 200 with an
    // `errors` object, so trusting the status code alone silently yields [].
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ errors: { token: 'invalid api key' }, response: [] }),
    );
    const client = new ApiSportsClient({ apiKey: 'k', fetchImpl });

    await expect(client.get('leagues')).rejects.toThrow(/invalid api key/);
  });

  it('treats an empty errors array as success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ errors: [], response: [{ id: 1 }] }));
    const client = new ApiSportsClient({ apiKey: 'k', fetchImpl });

    await expect(client.get('leagues')).resolves.toEqual([{ id: 1 }]);
  });

  it('refuses to call without a key', async () => {
    const client = new ApiSportsClient({ apiKey: undefined, fetchImpl: vi.fn() });
    expect(client.configured()).toBe(false);
    await expect(client.get('leagues')).rejects.toThrow(/not configured/);
  });
});

describe('quota guard', () => {
  it('reserves a slice of the daily cap', () => {
    const client = new ApiSportsClient({ apiKey: 'k', dailyQuota: 100, reservePct: 0.1, fetchImpl: vi.fn() });
    expect(client.quota()).toMatchObject({ used: 0, limit: 90, remaining: 90 });
  });

  it('stops calling before exhausting the plan', async () => {
    // Paid plans hard-stop with no overage: a runaway loop destroys tomorrow's
    // data rather than costing money, so the guard must refuse locally.
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ response: [] }));
    const client = new ApiSportsClient({ apiKey: 'k', dailyQuota: 2, reservePct: 0, fetchImpl });

    await client.get('leagues');
    await client.get('leagues');

    expect(client.quota().remaining).toBe(0);
    await expect(client.get('leagues')).rejects.toBeInstanceOf(ApiSportsQuotaError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('counts a failed request against the quota', async () => {
    // A rejected request still consumes plan allowance upstream.
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    const client = new ApiSportsClient({ apiKey: 'k', dailyQuota: 10, reservePct: 0, fetchImpl });

    await expect(client.get('leagues')).rejects.toBeInstanceOf(ApiSportsError);
    expect(client.quota().used).toBe(1);
  });
});

describe('paging', () => {
  it('follows paging to completion', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ paging: { current: 1, total: 2 }, response: [{ id: 1 }] }))
      .mockResolvedValueOnce(jsonResponse({ paging: { current: 2, total: 2 }, response: [{ id: 2 }] }));
    const client = new ApiSportsClient({ apiKey: 'k', fetchImpl });

    await expect(client.getAllPages('teams', { league: 39 })).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('stops at maxPages rather than looping forever', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ paging: { current: 1, total: 9999 }, response: [{ id: 1 }] }),
    );
    const client = new ApiSportsClient({ apiKey: 'k', dailyQuota: 1000, fetchImpl });

    await client.getAllPages('teams', {}, 3);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe('coverage gating', () => {
  it('maps feature slots onto the coverage object', () => {
    expect(supportsFeature(fullCoverage, 'lineups')).toBe(true);
    expect(supportsFeature(thinCoverage, 'lineups')).toBe(false);
    expect(supportsFeature(thinCoverage, 'injuries')).toBe(false);
    expect(supportsFeature(thinCoverage, 'standings')).toBe(true);
  });

  it('reports exactly which required features a league lacks', () => {
    expect(missingFeatures(fullCoverage, ['injuries', 'lineups', 'standings'])).toEqual([]);
    expect(missingFeatures(thinCoverage, ['injuries', 'lineups', 'standings'])).toEqual(['injuries', 'lineups']);
  });

  it('sends search ALONE — never with country or season', async () => {
    // Regression: API-Sports rejects search+season AND search+country with an
    // HTTP 200 carrying an `errors` object, which silently yields zero leagues.
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ response: [] }));
    const client = new ApiSportsClient({ apiKey: 'k', fetchImpl });

    await fetchLeagues(client, { search: 'Premier League', country: 'England', season: 2026 });

    const url = new URL(fetchImpl.mock.calls[0]![0] as string);
    expect(url.searchParams.get('search')).toBe('Premier League');
    expect(url.searchParams.has('country')).toBe(false);
    expect(url.searchParams.has('season')).toBe(false);
  });

  it('still pushes country and season to the API when not searching', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ response: [] }));
    const client = new ApiSportsClient({ apiKey: 'k', fetchImpl });

    await fetchLeagues(client, { country: 'England', season: 2026 });

    const url = new URL(fetchImpl.mock.calls[0]![0] as string);
    expect(url.searchParams.get('country')).toBe('England');
    expect(url.searchParams.get('season')).toBe('2026');
  });

  it('does not spend a request on a search term below the 3-character minimum', async () => {
    // Competition.name holds Football-Data codes like "PL" and "SA".
    const fetchImpl = vi.fn();
    const client = new ApiSportsClient({ apiKey: 'k', fetchImpl });

    await expect(fetchLeagues(client, { search: 'PL' })).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('filters country client-side when searching', async () => {
    // "Serie A" exists in both Italy (SA) and Brazil (BSA). Without the
    // client-side filter these collide and teams map to the wrong fixtures.
    const seasons = [{ year: 2026, start: '', end: '', current: true, coverage: fullCoverage }];
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        response: [
          { league: { id: 135, name: 'Serie A', type: 'League' }, country: { name: 'Italy', code: 'IT', flag: null }, seasons },
          { league: { id: 71, name: 'Serie A', type: 'League' }, country: { name: 'Brazil', code: 'BR', flag: null }, seasons },
        ],
      }),
    );
    const client = new ApiSportsClient({ apiKey: 'k', fetchImpl });

    const italian = await fetchLeagues(client, { search: 'Serie A', country: 'Italy' });
    expect(italian).toHaveLength(1);
    expect(italian[0]?.leagueId).toBe(135);
  });

  it('picks the requested season and surfaces its coverage', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        response: [
          {
            league: { id: 332, name: 'NPFL', type: 'League' },
            country: { name: 'Nigeria', code: 'NG', flag: null },
            seasons: [
              { year: 2025, start: '', end: '', current: false, coverage: fullCoverage },
              { year: 2026, start: '', end: '', current: true, coverage: thinCoverage },
            ],
          },
        ],
      }),
    );
    const client = new ApiSportsClient({ apiKey: 'k', fetchImpl });

    const leagues = await fetchLeagues(client, { search: 'NPFL', season: 2026 });

    expect(leagues).toHaveLength(1);
    expect(leagues[0]).toMatchObject({ leagueId: 332, season: 2026, country: 'Nigeria' });
    expect(missingFeatures(leagues[0]!.coverage, ['injuries', 'lineups'])).toEqual(['injuries', 'lineups']);
  });
});
