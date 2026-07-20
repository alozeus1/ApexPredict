const BASE_URL = process.env.FOOTBALL_DATA_BASE_URL ?? 'https://api.football-data.org/v4';
const DEFAULT_REQUEST_INTERVAL_MS = 6500;
let nextRequestAt = 0;

export interface FootballDataCompetition {
  id: number;
  code: string;
  name: string;
  area?: { name?: string };
}

export interface FootballDataTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
}

export interface FootballDataMatch {
  id: number;
  competition: FootballDataCompetition;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  utcDate: string;
  status: string;
  matchday?: number;
  score?: { fullTime?: { home?: number | null; away?: number | null } };
}

export interface FootballDataStandingRow {
  position: number;
  team: FootballDataTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form?: string;
}

export interface FootballDataCompetitionBundle {
  competition: FootballDataCompetition;
  matches: FootballDataMatch[];
  standings: FootballDataStandingRow[];
}

function token() {
  return process.env.FOOTBALL_DATA_API_TOKEN;
}

async function requestJson<T>(path: string): Promise<T> {
  const apiToken = token();
  if (!apiToken) throw new Error('FOOTBALL_DATA_API_TOKEN is not configured');

  await throttleFootballData();

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': apiToken },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Football-Data ${response.status} for ${path}: ${text.slice(0, 240)}`);
  }

  return response.json() as Promise<T>;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function configuredCompetitions() {
  return (process.env.FOOTBALL_DATA_COMPETITIONS ?? 'WC,BSA,PL,PD,BL1,SA,FL1,CL')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function fetchCompetitionBundle(code: string, daysAhead = 14): Promise<FootballDataCompetitionBundle> {
  const now = new Date();
  const future = new Date(now);
  future.setUTCDate(future.getUTCDate() + daysAhead);

  const [matchesResponse, standingsResponse] = await Promise.all([
    requestJson<{ matches: FootballDataMatch[] }>(
      `/competitions/${code}/matches?dateFrom=${isoDate(now)}&dateTo=${isoDate(future)}`,
    ),
    requestJson<{ standings?: Array<{ type: string; table: FootballDataStandingRow[] }> }>(`/competitions/${code}/standings`),
  ]);

  const competition = matchesResponse.matches[0]?.competition ?? {
    id: competitionExternalId(code),
    code,
    name: code,
    area: { name: 'Unknown' },
  };

  return {
    competition,
    matches: matchesResponse.matches,
    standings: standingsResponse.standings?.find((s) => s.type === 'TOTAL')?.table ?? [],
  };
}

function competitionExternalId(code: string) {
  const ids: Record<string, number> = {
    PL: 2021,
    PD: 2014,
    BL1: 2002,
    SA: 2019,
    FL1: 2015,
    CL: 2001,
    BSA: 2013,
    WC: 2000,
  };
  return ids[code] ?? Math.abs([...code].reduce((sum, char) => sum + char.charCodeAt(0), 0));
}

async function throttleFootballData() {
  const interval = Number(process.env.FOOTBALL_DATA_REQUEST_INTERVAL_MS ?? DEFAULT_REQUEST_INTERVAL_MS);
  if (!Number.isFinite(interval) || interval <= 0) return;

  const now = Date.now();
  const waitMs = Math.max(0, nextRequestAt - now);
  nextRequestAt = Math.max(now, nextRequestAt) + interval;
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
}
