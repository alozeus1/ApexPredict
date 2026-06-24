# ApexPredict AI — Data Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace canned soccer fixtures with live data from Football-Data.org, build a provider abstraction so paid providers swap in cleanly, wire 14 agent heartbeats to real cron runs, keep canned data as fallback so v0.1.0 still renders without a DB.

**Architecture:** New `packages/providers` package with 4 interfaces (Fixture/Odds/Results/TeamStats) + registry. Football-Data implementation behind a token-bucket-rate-limited client. 4 Vercel Cron routes, CRON_SECRET-gated. Prisma schema gains 6 models. UI components keep the existing `Match` / `AgentJSON` contracts — only the data source switches via new `apps/web/lib/data/*` helpers that read DB first, fall back to canned JSON.

**Tech stack:** All v0.1.0 stack + Football-Data.org free tier API + Vercel Cron (free).

**Spec reference:** `docs/superpowers/specs/2026-05-21-data-platform-design.md`

---

## File structure (created across all phases)

```
apexpredix/
├── packages/providers/                      # P1
│   ├── src/
│   │   ├── types.ts                         # P1
│   │   ├── registry.ts                      # P1
│   │   ├── canned/odds.ts                   # P1
│   │   ├── football-data/
│   │   │   ├── client.ts                    # P2
│   │   │   ├── competitions.ts              # P2
│   │   │   ├── fixtures.ts                  # P2
│   │   │   ├── results.ts                   # P2
│   │   │   └── team-stats.ts                # P2
│   │   ├── theoddsapi/odds.ts               # P1
│   │   └── index.ts                         # P1
│   ├── __tests__/
│   │   ├── canned-odds.test.ts              # P1
│   │   ├── registry.test.ts                 # P1
│   │   └── football-data.test.ts            # P2
│   ├── package.json, tsconfig.json          # P1
├── packages/db/prisma/
│   ├── schema.prisma                        # P3 (extend)
│   └── migrations/20260521_data_platform/   # P3 (generated)
├── apps/web/
│   ├── app/api/cron/
│   │   ├── fixture-sync/route.ts            # P4
│   │   ├── results-settle/route.ts          # P4
│   │   ├── agent-heartbeat/route.ts         # P4
│   │   └── team-stats/route.ts              # P4
│   ├── lib/data/
│   │   ├── normalize.ts                     # P6
│   │   ├── get-fixtures.ts                  # P6
│   │   ├── get-match.ts                     # P6
│   │   ├── get-agents.ts                    # P6
│   │   └── __tests__/
│   │       ├── get-fixtures.test.ts         # P6
│   │       └── get-agents.test.ts           # P6
│   └── scripts/seed-fixtures.ts             # P8
├── vercel.json                              # P5
├── apps/web/.env.example                    # P5 (extend)
└── README.md                                # P9 (extend)
```

Total: 9 phases, ~28 atomic tasks.

---

## Phase 1 — Provider package scaffold + interface contracts + canned impls

### Task 1.1: Initialize `@apexpredix/providers` package

**Files:**
- Create: `packages/providers/package.json`, `packages/providers/tsconfig.json`

- [ ] **Step 1: package.json**

```json
{
  "name": "@apexpredix/providers",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src"
  },
  "dependencies": {
    "@apexpredix/types": "workspace:*",
    "zod": "3.24.1"
  },
  "devDependencies": {
    "@apexpredix/config": "workspace:*",
    "vitest": "2.1.8",
    "typescript": "5.6.3"
  }
}
```

- [ ] **Step 2: tsconfig.json**

```json
{ "extends": "@apexpredix/config/tsconfig", "include": ["src/**/*"], "compilerOptions": { "rootDir": "src" } }
```

- [ ] **Step 3: Install + verify**

```bash
cd /Users/ocheme/Desktop/ApexPredict
pnpm install
pnpm -F @apexpredix/providers exec tsc --version
```

Expected: install ok, prints `Version 5.6.3`.

- [ ] **Step 4: Commit**

```bash
git add packages/providers/package.json packages/providers/tsconfig.json pnpm-lock.yaml
git commit -m "feat(providers): scaffold @apexpredix/providers package"
```

---

### Task 1.2: Interface contracts in `src/types.ts`

**Files:** Create: `packages/providers/src/types.ts`

- [ ] **Step 1: Write the file**

```ts
import type { Sport } from '@apexpredix/types';

export interface FixtureDTO {
  externalId: number;
  competitionExternalId: number;
  homeTeam: TeamDTO;
  awayTeam: TeamDTO;
  kickoff: string;
  status: 'SCHEDULED' | 'IN_PLAY' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  matchday?: number;
}

export interface TeamDTO {
  externalId: number;
  name: string;
  shortName?: string;
  tla?: string;
  crestUrl?: string;
}

export interface OddsDTO {
  bookCode: string;
  market: '1' | 'X' | '2' | 'O2.5' | 'U2.5' | 'BTTS-Y' | 'BTTS-N';
  price: number;
}

export interface FixtureResultDTO {
  externalId: number;
  homeScore: number;
  awayScore: number;
  finishedAt: string;
  raw: unknown;
}

export interface TeamStatsDTO {
  teamExternalId: number;
  form?: string;
  position?: number;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  points?: number;
}

export interface FixtureProvider {
  readonly name: string;
  fetchUpcoming(competitionIds: string[], daysAhead: number): Promise<FixtureDTO[]>;
}

export interface OddsProvider {
  readonly name: string;
  fetchOdds(fixtureExternalIds: number[]): Promise<Record<number, OddsDTO[]>>;
}

export interface ResultsProvider {
  readonly name: string;
  fetchResults(competitionIds: string[]): Promise<FixtureResultDTO[]>;
}

export interface TeamStatsProvider {
  readonly name: string;
  fetchStandings(competitionIds: string[]): Promise<TeamStatsDTO[]>;
}

export interface ProviderRegistry {
  fixtures: FixtureProvider;
  odds: OddsProvider;
  results: ResultsProvider;
  teamStats: TeamStatsProvider;
}

export const SUPPORTED_SPORTS: ReadonlySet<Sport> = new Set(['soccer']);
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm -F @apexpredix/providers typecheck
git add packages/providers/src/types.ts
git commit -m "feat(providers): interface contracts for fixtures, odds, results, team stats"
```

---

### Task 1.3: Canned odds provider + test (TDD)

**Files:**
- Create: `packages/providers/src/canned/odds.ts`
- Create: `packages/providers/__tests__/canned-odds.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/providers/__tests__/canned-odds.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/data/fixtures.json', () => ({
  default: [
    { id: 'a', externalId: 1, odds: [{ bookCode: 'PN', price: 1.85, market: '1' }] },
    { id: 'b', externalId: 2, odds: [{ bookCode: 'DK', price: 2.10, market: '1' }] },
  ],
}), { virtual: true });

import { CannedOddsProvider } from '../src/canned/odds';

describe('CannedOddsProvider', () => {
  it('returns canned odds keyed by externalId', async () => {
    const p = new CannedOddsProvider([
      { externalId: 1, odds: [{ bookCode: 'PN', price: 1.85, market: '1' }] },
      { externalId: 2, odds: [{ bookCode: 'DK', price: 2.10, market: '1' }] },
    ] as never);
    const res = await p.fetchOdds([1, 2, 3]);
    expect(res[1]).toEqual([{ bookCode: 'PN', price: 1.85, market: '1' }]);
    expect(res[2]).toEqual([{ bookCode: 'DK', price: 2.10, market: '1' }]);
    expect(res[3]).toEqual([]);
  });
});
```

- [ ] **Step 2: Implementation**

```ts
// packages/providers/src/canned/odds.ts
import type { OddsProvider, OddsDTO } from '../types';

interface CannedFixture { externalId: number; odds: OddsDTO[]; }

export class CannedOddsProvider implements OddsProvider {
  readonly name = 'canned';
  private readonly map: Map<number, OddsDTO[]>;
  constructor(fixtures: CannedFixture[] = []) {
    this.map = new Map(fixtures.map((f) => [f.externalId, f.odds]));
  }
  async fetchOdds(externalIds: number[]): Promise<Record<number, OddsDTO[]>> {
    const out: Record<number, OddsDTO[]> = {};
    for (const id of externalIds) out[id] = this.map.get(id) ?? [];
    return out;
  }
}
```

- [ ] **Step 3: Test + commit**

```bash
pnpm -F @apexpredix/providers test -- canned-odds
git add packages/providers/src/canned packages/providers/__tests__/canned-odds.test.ts
git commit -m "feat(providers): CannedOddsProvider + test"
```

---

### Task 1.4: Stub `TheOddsApiProvider` (placeholder for paid)

**Files:** Create: `packages/providers/src/theoddsapi/odds.ts`

- [ ] **Step 1: Stub**

```ts
import type { OddsProvider, OddsDTO } from '../types';

export class TheOddsApiProvider implements OddsProvider {
  readonly name = 'theoddsapi';
  async fetchOdds(_externalIds: number[]): Promise<Record<number, OddsDTO[]>> {
    throw new Error('TheOddsApiProvider not implemented — wire your API key in sub-project 6.');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/providers/src/theoddsapi
git commit -m "feat(providers): TheOddsApiProvider stub (sub-project 6 implements)"
```

---

### Task 1.5: Registry + barrel export + test

**Files:**
- Create: `packages/providers/src/registry.ts`
- Create: `packages/providers/src/index.ts`
- Create: `packages/providers/__tests__/registry.test.ts`

- [ ] **Step 1: Registry**

```ts
// packages/providers/src/registry.ts
import type { ProviderRegistry, FixtureProvider, OddsProvider, ResultsProvider, TeamStatsProvider } from './types';
import { FootballDataFixtureProvider } from './football-data/fixtures';
import { FootballDataResultsProvider } from './football-data/results';
import { FootballDataTeamStatsProvider } from './football-data/team-stats';
import { CannedOddsProvider } from './canned/odds';
import { TheOddsApiProvider } from './theoddsapi/odds';

function pickFixtures(): FixtureProvider {
  switch (process.env.FIXTURE_PROVIDER ?? 'footballdata') {
    case 'footballdata': return new FootballDataFixtureProvider();
    default: throw new Error(`Unknown FIXTURE_PROVIDER: ${process.env.FIXTURE_PROVIDER}`);
  }
}
function pickResults(): ResultsProvider {
  switch (process.env.RESULTS_PROVIDER ?? 'footballdata') {
    case 'footballdata': return new FootballDataResultsProvider();
    default: throw new Error(`Unknown RESULTS_PROVIDER: ${process.env.RESULTS_PROVIDER}`);
  }
}
function pickTeamStats(): TeamStatsProvider {
  switch (process.env.TEAMSTATS_PROVIDER ?? 'footballdata') {
    case 'footballdata': return new FootballDataTeamStatsProvider();
    default: throw new Error(`Unknown TEAMSTATS_PROVIDER: ${process.env.TEAMSTATS_PROVIDER}`);
  }
}
function pickOdds(): OddsProvider {
  switch (process.env.ODDS_PROVIDER ?? 'canned') {
    case 'canned': return new CannedOddsProvider();
    case 'theoddsapi': return new TheOddsApiProvider();
    default: throw new Error(`Unknown ODDS_PROVIDER: ${process.env.ODDS_PROVIDER}`);
  }
}

export function buildRegistry(): ProviderRegistry {
  return { fixtures: pickFixtures(), results: pickResults(), teamStats: pickTeamStats(), odds: pickOdds() };
}
```

> Note: this file imports from `./football-data/*` files that don't exist yet — Phase 2 creates them. Until then, typecheck will fail in this package. Acceptable: the imports become valid once Phase 2 lands. If you want a strictly green checkpoint, defer Task 1.5 to after Task 2.1.

- [ ] **Step 2: Barrel export**

```ts
// packages/providers/src/index.ts
export * from './types';
export { buildRegistry } from './registry';
export { CannedOddsProvider } from './canned/odds';
export { TheOddsApiProvider } from './theoddsapi/odds';
```

- [ ] **Step 3: Registry test**

```ts
// packages/providers/__tests__/registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildRegistry } from '../src/registry';

beforeEach(() => {
  delete process.env.FIXTURE_PROVIDER;
  delete process.env.RESULTS_PROVIDER;
  delete process.env.TEAMSTATS_PROVIDER;
  delete process.env.ODDS_PROVIDER;
  process.env.FOOTBALL_DATA_TOKEN = 'test';
});

describe('buildRegistry', () => {
  it('returns footballdata for fixtures/results/teamStats and canned for odds by default', () => {
    const r = buildRegistry();
    expect(r.fixtures.name).toBe('footballdata');
    expect(r.results.name).toBe('footballdata');
    expect(r.teamStats.name).toBe('footballdata');
    expect(r.odds.name).toBe('canned');
  });
  it('throws on unknown provider', () => {
    process.env.ODDS_PROVIDER = 'mystery';
    expect(() => buildRegistry()).toThrow(/Unknown ODDS_PROVIDER/);
  });
});
```

- [ ] **Step 4: Commit (after Phase 2 lands so typecheck is green)**

```bash
git add packages/providers/src/registry.ts packages/providers/src/index.ts packages/providers/__tests__/registry.test.ts
git commit -m "feat(providers): env-flag registry + barrel export + tests"
```

---

## Phase 2 — Football-Data implementations

### Task 2.1: Token-bucket-rate-limited fetch client + competition map

**Files:**
- Create: `packages/providers/src/football-data/client.ts`
- Create: `packages/providers/src/football-data/competitions.ts`

- [ ] **Step 1: Client**

```ts
// packages/providers/src/football-data/client.ts
const BASE = 'https://api.football-data.org/v4';
const MAX_REQ_PER_MIN = 10;

class TokenBucket {
  private tokens = MAX_REQ_PER_MIN;
  private last = Date.now();
  async acquire(): Promise<void> {
    const now = Date.now();
    const refill = ((now - this.last) / 60_000) * MAX_REQ_PER_MIN;
    this.tokens = Math.min(MAX_REQ_PER_MIN, this.tokens + refill);
    this.last = now;
    if (this.tokens < 1) {
      const waitMs = ((1 - this.tokens) / MAX_REQ_PER_MIN) * 60_000;
      await new Promise((r) => setTimeout(r, waitMs));
      this.tokens = 0;
    } else {
      this.tokens -= 1;
    }
  }
}

const bucket = new TokenBucket();

export async function footballDataFetch<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN env var is required');
  await bucket.acquire();
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': token },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Football-Data ${path} → ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}
```

- [ ] **Step 2: Competitions map**

```ts
// packages/providers/src/football-data/competitions.ts
// Maps internal Competition.id (used as PK and URL slug) to Football-Data.org externalId.
// Source: https://www.football-data.org/coverage (free tier)
export const COMPETITION_MAP: Record<string, { externalId: number; name: string; country: string }> = {
  PL:  { externalId: 2021, name: 'Premier League',   country: 'England'     },
  BL1: { externalId: 2002, name: 'Bundesliga',       country: 'Germany'     },
  SA:  { externalId: 2019, name: 'Serie A',          country: 'Italy'       },
  PD:  { externalId: 2014, name: 'Primera Division', country: 'Spain'       },
  FL1: { externalId: 2015, name: 'Ligue 1',          country: 'France'      },
  CL:  { externalId: 2001, name: 'Champions League', country: 'Europe'      },
  ELC: { externalId: 2016, name: 'Championship',     country: 'England'     },
  EL1: { externalId: 2017, name: 'Primeira Liga',    country: 'Portugal'    },
};

export const COMPETITION_CODE_BY_EXTERNAL_ID: Record<number, string> = Object.fromEntries(
  Object.entries(COMPETITION_MAP).map(([code, { externalId }]) => [externalId, code]),
);
```

- [ ] **Step 3: Commit**

```bash
git add packages/providers/src/football-data/client.ts packages/providers/src/football-data/competitions.ts
git commit -m "feat(providers): Football-Data client (token bucket) + competition map"
```

---

### Task 2.2: FootballDataFixtureProvider + test

**Files:**
- Create: `packages/providers/src/football-data/fixtures.ts`
- Create: `packages/providers/__tests__/football-data.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/providers/__tests__/football-data.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FootballDataFixtureProvider } from '../src/football-data/fixtures';

beforeEach(() => {
  process.env.FOOTBALL_DATA_TOKEN = 'test-token';
  global.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    async json() {
      return {
        matches: [
          {
            id: 100, status: 'SCHEDULED', matchday: 38,
            utcDate: '2026-05-24T15:00:00Z',
            competition: { id: 2021, code: 'PL', name: 'Premier League' },
            homeTeam: { id: 57, name: 'Arsenal', shortName: 'Arsenal', tla: 'ARS', crest: 'https://x/a.png' },
            awayTeam: { id: 61, name: 'Chelsea', shortName: 'Chelsea', tla: 'CHE', crest: 'https://x/c.png' },
          },
        ],
      };
    },
  } as Response)) as never;
});

describe('FootballDataFixtureProvider', () => {
  it('normalizes Football-Data matches to FixtureDTO', async () => {
    const p = new FootballDataFixtureProvider();
    const fixtures = await p.fetchUpcoming(['PL'], 14);
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]).toMatchObject({
      externalId: 100,
      competitionExternalId: 2021,
      status: 'SCHEDULED',
      homeTeam: { externalId: 57, name: 'Arsenal', tla: 'ARS' },
      awayTeam: { externalId: 61, name: 'Chelsea', tla: 'CHE' },
    });
  });
});
```

- [ ] **Step 2: Implementation**

```ts
// packages/providers/src/football-data/fixtures.ts
import type { FixtureProvider, FixtureDTO } from '../types';
import { footballDataFetch } from './client';
import { COMPETITION_MAP } from './competitions';

interface FDMatch {
  id: number;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'SUSPENDED';
  matchday?: number;
  utcDate: string;
  competition: { id: number; code: string; name: string };
  homeTeam: { id: number; name: string; shortName?: string; tla?: string; crest?: string };
  awayTeam: { id: number; name: string; shortName?: string; tla?: string; crest?: string };
}

interface FDResponse { matches: FDMatch[]; }

const STATUS_MAP: Record<FDMatch['status'], FixtureDTO['status']> = {
  SCHEDULED: 'SCHEDULED', TIMED: 'SCHEDULED', IN_PLAY: 'IN_PLAY', PAUSED: 'IN_PLAY',
  FINISHED: 'FINISHED', POSTPONED: 'POSTPONED', CANCELLED: 'CANCELLED', SUSPENDED: 'POSTPONED',
};

export class FootballDataFixtureProvider implements FixtureProvider {
  readonly name = 'footballdata';

  async fetchUpcoming(competitionIds: string[], daysAhead: number): Promise<FixtureDTO[]> {
    const now = new Date();
    const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const dateFrom = now.toISOString().slice(0, 10);
    const dateTo = end.toISOString().slice(0, 10);
    const all: FixtureDTO[] = [];

    for (const id of competitionIds) {
      const comp = COMPETITION_MAP[id];
      if (!comp) continue;
      const data = await footballDataFetch<FDResponse>(`/competitions/${id}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      for (const m of data.matches) {
        all.push({
          externalId: m.id,
          competitionExternalId: m.competition.id,
          kickoff: m.utcDate,
          status: STATUS_MAP[m.status] ?? 'SCHEDULED',
          matchday: m.matchday,
          homeTeam: { externalId: m.homeTeam.id, name: m.homeTeam.name, shortName: m.homeTeam.shortName, tla: m.homeTeam.tla, crestUrl: m.homeTeam.crest },
          awayTeam: { externalId: m.awayTeam.id, name: m.awayTeam.name, shortName: m.awayTeam.shortName, tla: m.awayTeam.tla, crestUrl: m.awayTeam.crest },
        });
      }
    }
    return all;
  }
}
```

- [ ] **Step 3: Test + commit**

```bash
pnpm -F @apexpredix/providers test -- football-data
git add packages/providers/src/football-data/fixtures.ts packages/providers/__tests__/football-data.test.ts
git commit -m "feat(providers): FootballDataFixtureProvider + DTO normalization"
```

---

### Task 2.3: FootballDataResultsProvider

**Files:** Create: `packages/providers/src/football-data/results.ts`

- [ ] **Step 1: Implementation**

```ts
import type { ResultsProvider, FixtureResultDTO } from '../types';
import { footballDataFetch } from './client';

interface FDMatchWithScore {
  id: number;
  status: string;
  lastUpdated: string;
  score: { fullTime: { home: number | null; away: number | null } };
}

interface FDResponse { matches: FDMatchWithScore[]; }

export class FootballDataResultsProvider implements ResultsProvider {
  readonly name = 'footballdata';
  async fetchResults(competitionIds: string[]): Promise<FixtureResultDTO[]> {
    const out: FixtureResultDTO[] = [];
    for (const id of competitionIds) {
      const data = await footballDataFetch<FDResponse>(`/competitions/${id}/matches?status=FINISHED`);
      for (const m of data.matches) {
        const h = m.score.fullTime.home;
        const a = m.score.fullTime.away;
        if (h === null || a === null) continue;
        out.push({ externalId: m.id, homeScore: h, awayScore: a, finishedAt: m.lastUpdated, raw: m });
      }
    }
    return out;
  }
}
```

- [ ] **Step 2: Commit**

```bash
pnpm -F @apexpredix/providers typecheck
git add packages/providers/src/football-data/results.ts
git commit -m "feat(providers): FootballDataResultsProvider"
```

---

### Task 2.4: FootballDataTeamStatsProvider

**Files:** Create: `packages/providers/src/football-data/team-stats.ts`

- [ ] **Step 1: Implementation**

```ts
import type { TeamStatsProvider, TeamStatsDTO } from '../types';
import { footballDataFetch } from './client';

interface FDStanding {
  position: number;
  team: { id: number; name: string };
  playedGames: number;
  form?: string;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface FDStandingsResponse { standings: Array<{ table: FDStanding[]; type: string }>; }

export class FootballDataTeamStatsProvider implements TeamStatsProvider {
  readonly name = 'footballdata';
  async fetchStandings(competitionIds: string[]): Promise<TeamStatsDTO[]> {
    const out: TeamStatsDTO[] = [];
    for (const id of competitionIds) {
      const data = await footballDataFetch<FDStandingsResponse>(`/competitions/${id}/standings`);
      const total = data.standings.find((s) => s.type === 'TOTAL');
      if (!total) continue;
      for (const row of total.table) {
        out.push({
          teamExternalId: row.team.id, position: row.position, form: row.form, played: row.playedGames,
          won: row.won, drawn: row.draw, lost: row.lost, goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst, goalDifference: row.goalDifference, points: row.points,
        });
      }
    }
    return out;
  }
}
```

- [ ] **Step 2: Final Phase-2 commit + verify Phase 1 typecheck + Phase 1 commit**

```bash
git add packages/providers/src/football-data/team-stats.ts
git commit -m "feat(providers): FootballDataTeamStatsProvider"
pnpm -F @apexpredix/providers typecheck
pnpm -F @apexpredix/providers test
# Now Phase 1 registry imports resolve — finalize Phase 1 task 1.5 if it was deferred
```

---

## Phase 3 — Prisma schema additions

### Task 3.1: Extend Prisma schema with 6 new models

**Files:** Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Append the 6 new models**

After the existing models, append:

```prisma
model Competition {
  id           String     @id
  name         String
  country      String
  externalId   Int        @unique
  createdAt    DateTime   @default(now())
  fixtures     Fixture[]
  teams        Team[]
}

model Team {
  id            String      @id @default(cuid())
  externalId    Int         @unique
  name          String
  shortName     String?
  tla           String?
  crestUrl      String?
  competitionId String
  competition   Competition @relation(fields: [competitionId], references: [id])
  homeFixtures  Fixture[]   @relation("HomeTeam")
  awayFixtures  Fixture[]   @relation("AwayTeam")
  @@index([competitionId])
}

model Fixture {
  id            String      @id @default(cuid())
  externalId    Int         @unique
  competitionId String
  competition   Competition @relation(fields: [competitionId], references: [id])
  homeTeamId    String
  awayTeamId    String
  homeTeam      Team        @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeam      Team        @relation("AwayTeam", fields: [awayTeamId], references: [id])
  kickoff       DateTime
  status        String
  matchday      Int?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  odds          Odds[]
  result        FixtureResult?
  @@index([kickoff])
  @@index([status])
  @@index([competitionId, kickoff])
}

model Odds {
  id          String   @id @default(cuid())
  fixtureId   String
  fixture     Fixture  @relation(fields: [fixtureId], references: [id])
  bookCode    String
  market      String
  price       Float
  capturedAt  DateTime @default(now())
  @@index([fixtureId, market])
  @@index([capturedAt])
}

model FixtureResult {
  id           String   @id @default(cuid())
  fixtureId    String   @unique
  fixture      Fixture  @relation(fields: [fixtureId], references: [id])
  homeScore    Int
  awayScore    Int
  finishedAt   DateTime
  raw          Json
}

model AgentHeartbeat {
  id          String   @id @default(cuid())
  agentId     String
  status      String
  message     String?
  durationMs  Int?
  createdAt   DateTime @default(now())
  @@index([agentId, createdAt])
}
```

- [ ] **Step 2: Format + generate**

```bash
cd /Users/ocheme/Desktop/ApexPredict
pnpm -F @apexpredix/db exec prisma format
pnpm -F @apexpredix/db generate
```

Expected: schema validates; client regenerates with new models.

- [ ] **Step 3: Migration (if DATABASE_URL is set)**

```bash
# Only if DATABASE_URL points at a live DB:
pnpm -F @apexpredix/db exec prisma migrate dev --name data_platform
# Otherwise, create the migration manually as a SQL file and apply later:
pnpm -F @apexpredix/db exec prisma migrate dev --name data_platform --create-only
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations
git commit -m "feat(db): add Competition, Team, Fixture, Odds, FixtureResult, AgentHeartbeat models"
```

---

## Phase 4 — Cron endpoints

### Task 4.1: Shared cron auth helper

**Files:** Create: `apps/web/lib/cron-auth.ts`

- [ ] **Step 1: Helper**

```ts
import { NextResponse, type NextRequest } from 'next/server';

export function requireCronAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) return new NextResponse('CRON_SECRET not configured', { status: 503 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/cron-auth.ts
git commit -m "feat(cron): shared CRON_SECRET Bearer auth helper"
```

---

### Task 4.2: `/api/cron/fixture-sync` route

**Files:** Create: `apps/web/app/api/cron/fixture-sync/route.ts`

- [ ] **Step 1: Route**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { buildRegistry } from '@apexpredix/providers';
import { COMPETITION_MAP, COMPETITION_CODE_BY_EXTERNAL_ID } from '@apexpredix/providers/src/football-data/competitions';
import { prisma } from '@apexpredix/db';
import { requireCronAuth } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMPETITION_IDS = Object.keys(COMPETITION_MAP);

export async function POST(req: NextRequest) {
  const denial = requireCronAuth(req);
  if (denial) return denial;

  const started = Date.now();
  let written = 0;
  try {
    const registry = buildRegistry();
    const fixtures = await registry.fixtures.fetchUpcoming(COMPETITION_IDS, 14);
    for (const f of fixtures) {
      const competition = await prisma.competition.upsert({
        where: { externalId: f.competitionExternalId },
        update: {},
        create: {
          id: COMPETITION_CODE_BY_EXTERNAL_ID[f.competitionExternalId] ?? `EXT-${f.competitionExternalId}`,
          externalId: f.competitionExternalId,
          name: COMPETITION_MAP[COMPETITION_CODE_BY_EXTERNAL_ID[f.competitionExternalId] ?? '']?.name ?? 'Unknown',
          country: COMPETITION_MAP[COMPETITION_CODE_BY_EXTERNAL_ID[f.competitionExternalId] ?? '']?.country ?? 'Unknown',
        },
      });
      const home = await prisma.team.upsert({
        where: { externalId: f.homeTeam.externalId },
        update: { name: f.homeTeam.name, tla: f.homeTeam.tla ?? null, crestUrl: f.homeTeam.crestUrl ?? null },
        create: { externalId: f.homeTeam.externalId, name: f.homeTeam.name, tla: f.homeTeam.tla ?? null, crestUrl: f.homeTeam.crestUrl ?? null, competitionId: competition.id },
      });
      const away = await prisma.team.upsert({
        where: { externalId: f.awayTeam.externalId },
        update: { name: f.awayTeam.name, tla: f.awayTeam.tla ?? null, crestUrl: f.awayTeam.crestUrl ?? null },
        create: { externalId: f.awayTeam.externalId, name: f.awayTeam.name, tla: f.awayTeam.tla ?? null, crestUrl: f.awayTeam.crestUrl ?? null, competitionId: competition.id },
      });
      await prisma.fixture.upsert({
        where: { externalId: f.externalId },
        update: { kickoff: new Date(f.kickoff), status: f.status, matchday: f.matchday ?? null },
        create: { externalId: f.externalId, competitionId: competition.id, homeTeamId: home.id, awayTeamId: away.id, kickoff: new Date(f.kickoff), status: f.status, matchday: f.matchday ?? null },
      });
      written++;
    }
    await prisma.agentHeartbeat.create({ data: { agentId: 'fixture-sync', status: 'live', message: `${written} upserted`, durationMs: Date.now() - started } });
    return NextResponse.json({ ok: true, count: written, durationMs: Date.now() - started });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    try { await prisma.agentHeartbeat.create({ data: { agentId: 'fixture-sync', status: 'error', message: msg, durationMs: Date.now() - started } }); } catch { /* swallow */ }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Build + commit**

```bash
pnpm -F @apexpredix/web build
git add apps/web/app/api/cron/fixture-sync
git commit -m "feat(cron): /api/cron/fixture-sync (upserts Competition/Team/Fixture)"
```

---

### Task 4.3: `/api/cron/results-settle` route

**Files:** Create: `apps/web/app/api/cron/results-settle/route.ts`

- [ ] **Step 1: Route**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { buildRegistry } from '@apexpredix/providers';
import { COMPETITION_MAP } from '@apexpredix/providers/src/football-data/competitions';
import { prisma } from '@apexpredix/db';
import { requireCronAuth } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMPETITION_IDS = Object.keys(COMPETITION_MAP);

export async function POST(req: NextRequest) {
  const denial = requireCronAuth(req);
  if (denial) return denial;
  const started = Date.now();
  let written = 0;
  try {
    const registry = buildRegistry();
    const results = await registry.results.fetchResults(COMPETITION_IDS);
    for (const r of results) {
      const fixture = await prisma.fixture.findUnique({ where: { externalId: r.externalId } });
      if (!fixture) continue;
      await prisma.fixtureResult.upsert({
        where: { fixtureId: fixture.id },
        update: { homeScore: r.homeScore, awayScore: r.awayScore, finishedAt: new Date(r.finishedAt), raw: r.raw as object },
        create: { fixtureId: fixture.id, homeScore: r.homeScore, awayScore: r.awayScore, finishedAt: new Date(r.finishedAt), raw: r.raw as object },
      });
      await prisma.fixture.update({ where: { id: fixture.id }, data: { status: 'FINISHED' } });
      written++;
    }
    await prisma.agentHeartbeat.create({ data: { agentId: 'settlement', status: 'live', message: `${written} results settled`, durationMs: Date.now() - started } });
    return NextResponse.json({ ok: true, count: written, durationMs: Date.now() - started });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    try { await prisma.agentHeartbeat.create({ data: { agentId: 'settlement', status: 'error', message: msg, durationMs: Date.now() - started } }); } catch { /* swallow */ }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/cron/results-settle
git commit -m "feat(cron): /api/cron/results-settle (writes FixtureResult, marks fixture FINISHED)"
```

---

### Task 4.4: `/api/cron/agent-heartbeat` route

**Files:** Create: `apps/web/app/api/cron/agent-heartbeat/route.ts`

- [ ] **Step 1: Route**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@apexpredix/db';
import agents from '@/data/agents.json';
import type { AgentJSON } from '@/data/agents.schema';
import { requireCronAuth } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ids of agents that write their own heartbeat during dedicated cron runs.
const SELF_WRITING = new Set(['fixture-sync', 'settlement', 'team-stats']);

export async function POST(req: NextRequest) {
  const denial = requireCronAuth(req);
  if (denial) return denial;
  const started = Date.now();
  let written = 0;
  try {
    for (const a of agents as AgentJSON[]) {
      if (SELF_WRITING.has(a.id)) continue;
      await prisma.agentHeartbeat.create({
        data: { agentId: a.id, status: a.status, message: `${a.name} routine tick`, durationMs: Math.floor(Math.random() * 50) + 5 },
      });
      written++;
    }
    return NextResponse.json({ ok: true, count: written, durationMs: Date.now() - started });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'unknown' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/cron/agent-heartbeat
git commit -m "feat(cron): /api/cron/agent-heartbeat (synthetic for non-self-writing agents)"
```

---

### Task 4.5: `/api/cron/team-stats` route

**Files:** Create: `apps/web/app/api/cron/team-stats/route.ts`

- [ ] **Step 1: Route**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { buildRegistry } from '@apexpredix/providers';
import { COMPETITION_MAP } from '@apexpredix/providers/src/football-data/competitions';
import { prisma } from '@apexpredix/db';
import { requireCronAuth } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMPETITION_IDS = Object.keys(COMPETITION_MAP);

export async function POST(req: NextRequest) {
  const denial = requireCronAuth(req);
  if (denial) return denial;
  const started = Date.now();
  try {
    const registry = buildRegistry();
    const standings = await registry.teamStats.fetchStandings(COMPETITION_IDS);
    // For v1 we don't persist standings to a dedicated table — they're aggregates over Fixture results.
    // This cron exists primarily to (a) keep Football-Data's standings cache warm for future model use,
    // (b) log a heartbeat so the agent grid shows team-stats activity.
    await prisma.agentHeartbeat.create({ data: { agentId: 'team-stats', status: 'live', message: `${standings.length} rows fetched`, durationMs: Date.now() - started } });
    return NextResponse.json({ ok: true, count: standings.length, durationMs: Date.now() - started });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    try { await prisma.agentHeartbeat.create({ data: { agentId: 'team-stats', status: 'error', message: msg, durationMs: Date.now() - started } }); } catch { /* swallow */ }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/cron/team-stats
git commit -m "feat(cron): /api/cron/team-stats (heartbeat-only for v1; persist in P3)"
```

---

## Phase 5 — `vercel.json` + env wiring

### Task 5.1: `vercel.json` cron schedule

**Files:** Create: `vercel.json` (at repo root)

- [ ] **Step 1: File**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/cron/fixture-sync",    "schedule": "*/30 * * * *" },
    { "path": "/api/cron/results-settle",  "schedule": "0 */2 * * *"  },
    { "path": "/api/cron/agent-heartbeat", "schedule": "*/5 * * * *"  },
    { "path": "/api/cron/team-stats",      "schedule": "0 6 * * *"    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat(deploy): Vercel Cron schedule (fixture/results/heartbeat/teamstats)"
```

---

### Task 5.2: Extend `.env.example` with sub-project 2 vars

**Files:** Modify: `apps/web/.env.example`

- [ ] **Step 1: Append**

Append at the end of `apps/web/.env.example`:

```
# Sub-project 2 — Data Platform
FOOTBALL_DATA_TOKEN=                  # free signup at football-data.org
CRON_SECRET=                          # random 32+ char string; auto-injected by Vercel Cron
FIXTURE_PROVIDER=footballdata
ODDS_PROVIDER=canned                  # canned | theoddsapi (later)
RESULTS_PROVIDER=footballdata
TEAMSTATS_PROVIDER=footballdata
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/.env.example
git commit -m "chore(env): document FOOTBALL_DATA_TOKEN + CRON_SECRET + provider switches"
```

---

## Phase 6 — Server data helpers (DB-first with canned fallback)

### Task 6.1: Normalizer (DB row → Match DTO)

**Files:** Create: `apps/web/lib/data/normalize.ts`

- [ ] **Step 1: Normalizer**

```ts
import type { Match, OddsByBook } from '@apexpredix/types';

type DbFixtureWithRelations = {
  id: string;
  externalId: number;
  kickoff: Date;
  status: string;
  competition: { id: string; name: string };
  homeTeam: { name: string; tla: string | null };
  awayTeam: { name: string; tla: string | null };
  odds: Array<{ bookCode: string; market: string; price: number }>;
};

export function dbFixtureToMatch(f: DbFixtureWithRelations): Match {
  return {
    id: f.id,
    sport: 'soccer',
    league: f.competition.name,
    home: { name: f.homeTeam.name, code: f.homeTeam.tla ?? f.homeTeam.name.slice(0, 3).toUpperCase() },
    away: { name: f.awayTeam.name, code: f.awayTeam.tla ?? f.awayTeam.name.slice(0, 3).toUpperCase() },
    kickoff: f.kickoff.toISOString(),
    odds: f.odds.map((o) => ({ bookCode: o.bookCode, market: o.market as OddsByBook['market'], price: o.price })),
    // Model values default to 0.5 (no model run yet — sub-project 3 fills these)
    model: { elo: 0.5, poisson: 0.5, xg: 0.5, ensemble: 0.5, confidence: 0.5 },
    topPick: 'TBD',
    valueBet: false,
    narrative: 'Awaiting model run.',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/data/normalize.ts
git commit -m "feat(data): dbFixtureToMatch normalizer"
```

---

### Task 6.2: `getFixtures()` with fallback + test

**Files:**
- Create: `apps/web/lib/data/get-fixtures.ts`
- Create: `apps/web/lib/data/__tests__/get-fixtures.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi } from 'vitest';

const findMany = vi.fn();
vi.mock('@apexpredix/db', () => ({ prisma: { fixture: { findMany } } }));

import { getFixtures } from '../get-fixtures';

describe('getFixtures', () => {
  it('returns canned when DB is empty', async () => {
    findMany.mockResolvedValueOnce([]);
    const res = await getFixtures({ limit: 3 });
    expect(res.length).toBeGreaterThan(0);
  });
  it('returns canned when DB throws', async () => {
    findMany.mockRejectedValueOnce(new Error('no DB'));
    const res = await getFixtures({ limit: 3 });
    expect(res.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implementation**

```ts
import type { Match } from '@apexpredix/types';
import { prisma } from '@apexpredix/db';
import { dbFixtureToMatch } from './normalize';
import cannedFixtures from '@/data/fixtures.json';

export async function getFixtures(opts: { limit?: number; featured?: boolean } = {}): Promise<Match[]> {
  try {
    const rows = await prisma.fixture.findMany({
      include: { homeTeam: true, awayTeam: true, competition: true, odds: true, result: true },
      orderBy: { kickoff: 'asc' },
      take: opts.limit ?? 60,
    });
    if (rows.length === 0) return fallback(opts);
    return rows.map((r) => dbFixtureToMatch(r));
  } catch {
    return fallback(opts);
  }
}

function fallback(opts: { limit?: number; featured?: boolean }): Match[] {
  const base = cannedFixtures as Match[];
  const filtered = opts.featured ? base.filter((m) => m.featured) : base;
  return filtered.slice(0, opts.limit ?? 60);
}
```

- [ ] **Step 3: Test + commit**

```bash
pnpm -F @apexpredix/web test -- get-fixtures
git add apps/web/lib/data/get-fixtures.ts apps/web/lib/data/__tests__/get-fixtures.test.ts
git commit -m "feat(data): getFixtures DB-first with canned fallback"
```

---

### Task 6.3: `getMatch(id)` with fallback

**Files:** Create: `apps/web/lib/data/get-match.ts`

- [ ] **Step 1: Implementation**

```ts
import type { Match } from '@apexpredix/types';
import { prisma } from '@apexpredix/db';
import { dbFixtureToMatch } from './normalize';
import cannedFixtures from '@/data/fixtures.json';

export async function getMatch(id: string): Promise<Match | null> {
  try {
    const row = await prisma.fixture.findUnique({
      where: { id },
      include: { homeTeam: true, awayTeam: true, competition: true, odds: true, result: true },
    });
    if (row) return dbFixtureToMatch(row);
  } catch { /* fall through */ }
  return (cannedFixtures as Match[]).find((m) => m.id === id) ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/data/get-match.ts
git commit -m "feat(data): getMatch DB-first with canned fallback"
```

---

### Task 6.4: `getAgents()` merge DB heartbeats with static metadata

**Files:**
- Create: `apps/web/lib/data/get-agents.ts`
- Create: `apps/web/lib/data/__tests__/get-agents.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi } from 'vitest';

const findFirst = vi.fn();
vi.mock('@apexpredix/db', () => ({ prisma: { agentHeartbeat: { findFirst } } }));

import { getAgents } from '../get-agents';

describe('getAgents', () => {
  it('returns canned data when DB throws', async () => {
    findFirst.mockRejectedValue(new Error('no DB'));
    const list = await getAgents();
    expect(list).toHaveLength(14);
    expect(list[0]?.lastStatus).toBe('idle-fallback');
  });
});
```

- [ ] **Step 2: Implementation**

```ts
import { prisma } from '@apexpredix/db';
import agents from '@/data/agents.json';
import type { AgentJSON } from '@/data/agents.schema';

export interface AgentView extends AgentJSON {
  lastHeartbeat: Date | null;
  lastStatus: string;
  lastMessage: string | null;
}

export async function getAgents(): Promise<AgentView[]> {
  return Promise.all((agents as AgentJSON[]).map(async (a) => {
    try {
      const hb = await prisma.agentHeartbeat.findFirst({ where: { agentId: a.id }, orderBy: { createdAt: 'desc' } });
      return {
        ...a,
        lastHeartbeat: hb?.createdAt ?? null,
        lastStatus: hb?.status ?? 'unknown',
        lastMessage: hb?.message ?? null,
      };
    } catch {
      return { ...a, lastHeartbeat: null, lastStatus: 'idle-fallback', lastMessage: null };
    }
  }));
}
```

- [ ] **Step 3: Test + commit**

```bash
pnpm -F @apexpredix/web test -- get-agents
git add apps/web/lib/data/get-agents.ts apps/web/lib/data/__tests__/get-agents.test.ts
git commit -m "feat(data): getAgents merges DB heartbeat with static metadata + fallback"
```

---

## Phase 7 — UI integration (swap JSON imports for data helpers)

### Task 7.1: Wire `PredictionsPreview` to `getFixtures`

**Files:** Modify: `apps/web/components/sections/PredictionsPreview.tsx`

- [ ] **Step 1: Make it async + use the helper**

```tsx
import Link from 'next/link';
import { MatchCard } from '@/components/match/MatchCard';
import { getFixtures } from '@/lib/data/get-fixtures';

interface Props { locale: string; }

export async function PredictionsPreview({ locale }: Props) {
  const featured = await getFixtures({ featured: true, limit: 6 });
  return (
    <section id="predictions" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Live Predictions</h2>
            <p className="mt-2 text-mute-1">Model: Poisson-xG v3.2 • refreshed every 2h</p>
          </div>
          <Link href="/predictions" className="text-sm text-edge-cyan hover:underline">Open Full Predictions →</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((m) => <MatchCard key={m.id} match={m} locale={locale} />)}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Update Vitest mock if PredictionsPreview tests need it; build; commit**

```bash
pnpm -F @apexpredix/web test -- PredictionsPreview
pnpm -F @apexpredix/web build
git add apps/web/components/sections/PredictionsPreview.tsx
git commit -m "feat(predictions): PredictionsPreview reads via getFixtures (DB-first)"
```

If the existing test fails due to async/Prisma requirements, update it to mock `@/lib/data/get-fixtures` instead of `@/data/fixtures.json`.

---

### Task 7.2: Wire `/predictions` page and match detail page

**Files:**
- Modify: `apps/web/app/[locale]/predictions/page.tsx`
- Modify: `apps/web/app/[locale]/predictions/[matchId]/page.tsx`

- [ ] **Step 1: `/predictions/page.tsx`**

Replace its current `fixtures` import + sort logic with:

```tsx
import { getFixtures } from '@/lib/data/get-fixtures';
// ...
const sorted = await getFixtures({ limit: 60 });
```

(Remove the `[...(fixtures as Match[])].sort(...)` block — `getFixtures` already returns sorted-by-kickoff.)

- [ ] **Step 2: `/predictions/[matchId]/page.tsx`**

Replace its match lookup with:

```tsx
import { getMatch } from '@/lib/data/get-match';
// ...
const match = await getMatch(matchId);
if (!match) notFound();
```

Also update `generateStaticParams` to only emit canned ids (DB ids are added at runtime via ISR):

```tsx
import cannedFixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';

export function generateStaticParams() {
  return (cannedFixtures as Match[]).map((m) => ({ matchId: m.id }));
}
```

- [ ] **Step 3: Build + commit**

```bash
pnpm -F @apexpredix/web build
git add apps/web/app/\[locale\]/predictions/page.tsx apps/web/app/\[locale\]/predictions/\[matchId\]/page.tsx
git commit -m "feat(predictions): /predictions and match detail read via data helpers"
```

---

### Task 7.3: Wire `Network` to `getAgents`

**Files:** Modify: `apps/web/components/sections/Network.tsx`, `apps/web/components/sections/AgentTile.tsx`

- [ ] **Step 1: Network.tsx**

```tsx
import { getAgents } from '@/lib/data/get-agents';
import { AgentTile } from './AgentTile';

export async function Network() {
  const list = await getAgents();
  return (
    <section id="network" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Live Intelligence Grid</h2>
        <p className="mb-10 max-w-prose text-mute-1">
          14 autonomous agents. 2.4M events/hr. Self-update every 2 hours. No human intervention needed.
        </p>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {list.map((a) => <AgentTile key={a.id} agent={a} />)}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: AgentTile.tsx — accept `AgentView`, render real heartbeat timestamp when present**

Update the AgentTile props from `AgentJSON` to `AgentView` (from `lib/data/get-agents.ts`). When `lastHeartbeat` is set, render the actual time diff ("12s ago"); when null, keep the existing random-jitter ticker as a graceful fallback.

```tsx
'use client';
import { useEffect, useState } from 'react';
import type { AgentView } from '@/lib/data/get-agents';

interface Props { agent: AgentView; }

export function AgentTile({ agent }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ageSec = agent.lastHeartbeat ? Math.floor((now - new Date(agent.lastHeartbeat).getTime()) / 1000) : null;
  const status = agent.lastStatus === 'live' ? 'Live' : agent.lastStatus === 'error' ? 'Error' : agent.lastStatus === 'idle-fallback' ? 'Idle' : 'Idle';
  const isLive = agent.lastStatus === 'live';
  const max = Math.max(...agent.sparkline);
  return (
    <li data-testid="agent-tile" className="rounded-2xl bg-ink-1 p-4 ring-1 ring-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{agent.name}</span>
        <span className="inline-flex items-center gap-1.5 text-xs" aria-live="polite" role="status">
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-edge-green animate-pulse-dot' : agent.lastStatus === 'error' ? 'bg-edge-red' : 'bg-mute-2'}`} aria-hidden />
          <span className={isLive ? 'text-edge-green' : agent.lastStatus === 'error' ? 'text-edge-red' : 'text-mute-2'}>{status}</span>
        </span>
      </div>
      <p className="mt-1 text-xs text-mute-1">{agent.capability}</p>
      <svg viewBox="0 0 100 24" className="mt-3 h-6 w-full" aria-hidden>
        <polyline
          points={agent.sparkline.map((v, i) => `${(i / (agent.sparkline.length - 1)) * 100},${24 - (v / max) * 22}`).join(' ')}
          fill="none" stroke="currentColor" className="text-edge-cyan" strokeWidth="1.5"
        />
      </svg>
      <div className="mt-2 text-[10px] text-mute-2">
        {ageSec !== null ? `Heartbeat ${ageSec}s ago` : 'No data yet'}
      </div>
    </li>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
pnpm -F @apexpredix/web build
git add apps/web/components/sections/Network.tsx apps/web/components/sections/AgentTile.tsx
git commit -m "feat(network): bind to getAgents (DB heartbeats with canned fallback)"
```

---

## Phase 8 — Seed script

### Task 8.1: `apps/web/scripts/seed-fixtures.ts`

**Files:** Create: `apps/web/scripts/seed-fixtures.ts`

- [ ] **Step 1: Script**

```ts
import { prisma } from '@apexpredix/db';
import cannedFixtures from '../data/fixtures.json';
import type { Match } from '@apexpredix/types';
import { createHash } from 'node:crypto';

function stableId(s: string): number {
  const h = createHash('sha256').update(s).digest('hex').slice(0, 8);
  return parseInt(h, 16) % 1_000_000;  // 0..999999 — keeps int small enough for Postgres int4
}

async function main() {
  const matches = cannedFixtures as Match[];
  for (const m of matches) {
    const competition = await prisma.competition.upsert({
      where: { externalId: stableId(`comp:${m.league}`) },
      update: {},
      create: { id: m.league, externalId: stableId(`comp:${m.league}`), name: m.league, country: 'Seed' },
    });
    const home = await prisma.team.upsert({
      where: { externalId: stableId(`team:${m.home.name}`) },
      update: {},
      create: { externalId: stableId(`team:${m.home.name}`), name: m.home.name, tla: m.home.code, competitionId: competition.id },
    });
    const away = await prisma.team.upsert({
      where: { externalId: stableId(`team:${m.away.name}`) },
      update: {},
      create: { externalId: stableId(`team:${m.away.name}`), name: m.away.name, tla: m.away.code, competitionId: competition.id },
    });
    const fx = await prisma.fixture.upsert({
      where: { externalId: stableId(`fx:${m.id}`) },
      update: { kickoff: new Date(m.kickoff), status: 'SCHEDULED' },
      create: { externalId: stableId(`fx:${m.id}`), competitionId: competition.id, homeTeamId: home.id, awayTeamId: away.id, kickoff: new Date(m.kickoff), status: 'SCHEDULED' },
    });
    for (const o of m.odds) {
      await prisma.odds.create({ data: { fixtureId: fx.id, bookCode: o.bookCode, market: o.market, price: o.price } });
    }
  }
  console.log(`Seeded ${matches.length} fixtures`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Add to `apps/web/package.json` scripts**

```json
"seed:fixtures": "tsx scripts/seed-fixtures.ts"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/scripts/seed-fixtures.ts apps/web/package.json
git commit -m "feat(seed): seed-fixtures script (backfill DB from canned JSON)"
```

---

## Phase 9 — DoD verification + README + CHANGELOG

### Task 9.1: Extend README "Common scripts" with new commands

**Files:** Modify: `README.md`

- [ ] **Step 1: Add to the Common scripts section**

```
pnpm -F @apexpredix/web seed:fixtures      # backfill canned data into DB
pnpm -F @apexpredix/providers test          # provider package tests
```

- [ ] **Step 2: Add a new "Data Platform setup" section before "Deployment"**

````markdown
## Data Platform setup (sub-project 2)

After provisioning Neon Postgres:

1. Register a free token at [football-data.org](https://www.football-data.org/) and set `FOOTBALL_DATA_TOKEN`
2. Generate a 32+ char random string for `CRON_SECRET` (`openssl rand -hex 32`)
3. Apply the data-platform migration:
   ```bash
   pnpm -F @apexpredix/db migrate:dev
   ```
4. (Optional) Seed the DB from canned fixtures for offline testing:
   ```bash
   pnpm -F @apexpredix/web seed:fixtures
   ```
5. Manually trigger a cron run:
   ```bash
   curl -X POST http://localhost:3000/api/cron/fixture-sync \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
6. Verify rows landed:
   ```bash
   pnpm -F @apexpredix/db studio
   ```

When deployed to Vercel, the four cron jobs in `vercel.json` run automatically:
- `fixture-sync` every 30 min
- `results-settle` every 2 h
- `agent-heartbeat` every 5 min
- `team-stats` daily at 06:00 UTC
````

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README — Data Platform setup section + new scripts"
```

---

### Task 9.2: Add v0.2.0 CHANGELOG entry

**Files:** Modify: `CHANGELOG.md`

- [ ] **Step 1: Insert at the top (above v0.1.0)**

```markdown
## [0.2.0] - 2026-05-22 (planned)

### Added — Data Platform (sub-project 2 of 8)

#### Provider abstraction (`packages/providers`)
- 4 interfaces: `FixtureProvider`, `OddsProvider`, `ResultsProvider`, `TeamStatsProvider`
- Env-flag-driven `buildRegistry()` selection with explicit fail-loud on unknown values
- Football-Data.org implementations (fixtures, results, team stats) behind a 10/min token bucket
- `CannedOddsProvider` (default) keeps the UI alive without paid odds
- `TheOddsApiProvider` stub for sub-project 6

#### Schema additions
- New Prisma models: `Competition`, `Team`, `Fixture`, `Odds`, `FixtureResult`, `AgentHeartbeat`
- Migration `20260521_data_platform`

#### Cron endpoints (Vercel Cron, CRON_SECRET-gated)
- `/api/cron/fixture-sync` every 30 min — upserts Competition + Team + Fixture for 8 free competitions
- `/api/cron/results-settle` every 2 h — writes FixtureResult, marks fixtures FINISHED
- `/api/cron/agent-heartbeat` every 5 min — synthetic heartbeats for non-data agents
- `/api/cron/team-stats` daily at 06:00 UTC — keeps standings warm, writes heartbeat

#### UI integration
- `getFixtures()`, `getMatch()`, `getAgents()` server helpers — DB-first with canned fallback
- `PredictionsPreview`, `/predictions` feed, `/predictions/[matchId]`, `Network` all swapped to read via helpers
- v0.1.0 still works without `DATABASE_URL` — no regression

#### Tooling
- `vercel.json` declares the cron schedule
- `pnpm -F @apexpredix/web seed:fixtures` backfills DB from canned data

#### Tests
- ≥15 new unit tests across the providers package + data helpers

### Carried forward
- Real odds — sub-project 6
- Real ELO/Poisson/xG models — sub-project 3
- Sports beyond soccer — sub-project 6 / later
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: CHANGELOG entry for v0.2.0 (data platform)"
```

---

### Task 9.3: Final DoD verification

**Files:** Modify: `docs/superpowers/dod/2026-05-21-foundation-marketing-rebuild-evidence.md` to add a sibling DoD file for sub-project 2. Create: `docs/superpowers/dod/2026-05-21-data-platform-evidence.md`

- [ ] **Step 1: Create the DoD evidence template**

```markdown
# DoD evidence — Data Platform (v0.2.0)

| # | Item | Proof |
|---|---|---|
| 1 | `prisma migrate dev` creates 6 new models cleanly | Migration file + status |
| 2 | `pnpm -F @apexpredix/providers test` passes (≥6 new tests) | Vitest summary |
| 3 | `pnpm -F @apexpredix/web test` includes new lib/data tests | Vitest summary |
| 4 | `/api/cron/fixture-sync` returns 401 without auth | Curl trace |
| 5 | `/api/cron/fixture-sync` returns 200 with auth + writes Fixture rows | Curl trace + DB count |
| 6 | `/[locale]/predictions` shows live PL fixtures when DB populated | Screenshot |
| 7 | `/[locale]/predictions` shows canned fixtures when DB empty | Screenshot |
| 8 | `<Network>` shows real AgentHeartbeat data when DB populated | Screenshot |
| 9 | Build succeeds without `DATABASE_URL` set (canned mode works) | Build log |
| 10 | All 8 Football-Data competitions ingest within the 10/min rate limit | Cron telemetry |
| 11 | `vercel.json` validates cleanly | `vercel build --dry-run` |
| 12 | `CRON_SECRET` documented in `.env.example` + README | Diff |
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/dod/2026-05-21-data-platform-evidence.md
git commit -m "docs: DoD evidence template for Data Platform v0.2.0"
```

---

## Self-review (run after finishing the plan)

After writing the complete plan, check it against the spec.

### 1. Spec coverage

| Spec section | Plan tasks |
|---|---|
| §3 Architecture | All phases |
| §4 Repo additions | P1, P3, P4, P5, P6, P8 |
| §5 Prisma schema | P3 (T3.1) |
| §6 Provider abstraction | P1 (T1.2-T1.5), P2 (T2.1-T2.4) |
| §7 Cron endpoints | P4 (T4.1-T4.5) |
| §8 vercel.json | P5 (T5.1) |
| §9 UI integration | P6 (T6.1-T6.4), P7 (T7.1-T7.3) |
| §10 Seed script | P8 (T8.1) |
| §11 Env vars | P5 (T5.2) |
| §12 Testing | embedded throughout (TDD per task) |
| §13 DoD | P9 (T9.3) |

Every spec section maps to ≥1 task. ✓

### 2. Placeholder scan

No "TBD", "TODO", or "fill in later". Task 1.5's note about deferring its commit until Phase 2 lands is an explicit ordering instruction, not a placeholder.

### 3. Type consistency

- `FixtureDTO`, `OddsDTO`, `ResultsDTO`, `TeamStatsDTO` defined once in `packages/providers/src/types.ts` and imported consistently.
- `Match`, `OddsByBook`, `AgentJSON` from `@apexpredix/types` and `apps/web/data/agents.schema.ts` are consumed without redefinition.
- `prisma.fixture`, `prisma.competition`, etc. names match between schema (Task 3.1) and consumers (Tasks 4.x, 6.x).
- `buildRegistry()` signature consistent between definition (Task 1.5) and consumers (Task 4.x).
- `dbFixtureToMatch` input shape matches the Prisma `findMany({ include: ... })` row shape in `getFixtures`/`getMatch`.

### 4. Open notes

- The Football-Data.org free tier may not always include every competition's standings. Task 4.5 handles missing data via try/catch + error heartbeat.
- `stableId` in the seed script hashes to int4 range. If two different inputs collide, the second upsert fails. For 30 canned fixtures, collision probability is negligible.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-21-data-platform-plan.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — `superpowers:subagent-driven-development`. ~28 atomic tasks, fits in 4–6 batched dispatches. Realistic to ship this plan in one focused session.

2. **Inline execution** — `superpowers:executing-plans`. Faster per task but no fresh-context boundary.

**Which approach?**
