---
title: ApexPredict AI — Sub-project 2 · Data Platform
status: draft
version: 0.2.0
date: 2026-05-21
authors: Claude (assistant) + ocheme
parent_project: ApexPredict AI (by Maralito Labs)
prior_subproject: 1 — Foundation + Marketing Rebuild (v0.1.0, shipped)
parent_program_decomposition:
  - 1. Foundation + Marketing Rebuild  (shipped v0.1.0)
  - 2. Data Platform                   ← this spec
  - 3. Prediction Engine
  - 4. Auth + Accounts
  - 5. Predictions UI wired to live DB
  - 6. Premium + Payments
  - 7. Admin / Agent Ops
  - 8. Compliance, Observability & Launch
---

# Data Platform — Design Spec

## 0. Context

Sub-project 1 shipped v0.1.0 with canned `fixtures.json` (30 matches), `agents.json` (14 agents), and canned odds. The Predictions UI, MatchDetail, and Network sections render entirely from disk. Sub-project 2 replaces the soccer slice of that canned data with live ingestion from a free provider (Football-Data.org), wires real cron-driven agent heartbeats, and locks in a provider abstraction so paid providers (API-Football, the-odds-api, OddsJam, SportRadar) can drop in later as one-file swaps.

The strategy is free-first with paid-ready interfaces. v0.1.0's canned data continues to work as fallback when `DATABASE_URL` is absent — no regression for marketing-site demos. When DB + Football-Data token are configured, real Premier League / La Liga / Bundesliga / Serie A / Ligue 1 / Champions League fixtures flow through the same Match shape the existing components already consume.

## 1. Goals

- Replace canned soccer fixtures with live data from Football-Data.org's free tier (10 req/min, ~8 competitions covered).
- Build a `packages/providers` package with four interfaces (`FixtureProvider`, `OddsProvider`, `ResultsProvider`, `TeamStatsProvider`) and a registry that picks implementations by env flag.
- Implement `FootballDataFixtureProvider`, `FootballDataResultsProvider`, `FootballDataTeamStatsProvider`, `CannedOddsProvider`. Leave `TheOddsApiProvider` as a typed-stub TODO for sub-project 6.
- Add four Vercel Cron endpoints (fixture-sync 30min, results-settle 2h, agent-heartbeat 5min, team-stats daily), each `Authorization: Bearer ${CRON_SECRET}` gated.
- Add a `vercel.json` declaring the cron schedule.
- Extend Prisma schema with six new models (Competition, Team, Fixture, Odds, FixtureResult, AgentHeartbeat) + migration.
- Add `getFixtures()` / `getMatch()` / `getAgents()` server helpers that read DB first and fall back to canned JSON when the DB is empty or unreachable. Existing UI components are unchanged.
- Run the 14 agent identities from `agents.json` against real cron heartbeats so the Network section shows authentic activity, not random jitter.
- Provide a one-shot `pnpm -F @apexpredix/web seed:fixtures` script that backfills the DB from canned `fixtures.json` for local dev when Football-Data is unreachable.

## 2. Non-goals (deferred to later sub-projects)

| Capability | Sub-project | Rationale |
|---|---|---|
| Real ELO / Poisson / xG models | 3 | This sub-project provides the data the models will consume; model implementation is its own multi-week effort |
| Live odds | 6 (or earlier with paid plan) | Free providers don't expose odds at the quality needed; `CannedOddsProvider` keeps the UI alive until then |
| Sports beyond soccer | 6 / later | Free providers for NBA / NFL / ATP / NHL are patchwork; defer to paid providers |
| Inngest workflows | 7 (admin / ops) | Vercel Cron is sufficient for v1 cadence; durability and retries become important once user money is on the line |
| Real-time push / WebSockets | future | Not required at v1 volumes |
| xG, lineups, possession, shot maps | future | Not in Football-Data free tier |

## 3. Architecture

```
                                  ┌───────────────────────────┐
   Vercel Cron (free) ─────────►  │ /api/cron/fixture-sync     (every 30 min) │
                                  │ /api/cron/results-settle   (every 2 h)    │
                                  │ /api/cron/agent-heartbeat  (every 5 min)  │
                                  │ /api/cron/team-stats       (daily 06 UTC) │
                                  └────────────┬──────────────┘
                                               │  Authorization: Bearer ${CRON_SECRET}
                                  ┌────────────▼──────────────┐
                                  │ ProviderRegistry          │
                                  │  fixtures:  FootballData  │
                                  │  results:   FootballData  │
                                  │  odds:      Canned (v1)   │
                                  │  teamStats: FootballData  │
                                  └────────────┬──────────────┘
                                               │
                          ┌────────────────────▼────────────────────┐
                          │ Neon Postgres via Prisma                │
                          │ Existing: WaitlistSignup, CookieConsent,│
                          │   VerificationToken, GeoBlockEvent      │
                          │ NEW: Competition, Team, Fixture, Odds,  │
                          │   FixtureResult, AgentHeartbeat         │
                          └────────────────────┬────────────────────┘
                                               │
                          ┌────────────────────▼────────────────────┐
                          │ Server helpers (apps/web/lib/data/*)    │
                          │  getFixtures()   ──► DB or fallback     │
                          │  getMatch(id)    ──► DB or fallback     │
                          │  getAgents()     ──► DB+canned merge    │
                          └────────────────────┬────────────────────┘
                                               │
                          ┌────────────────────▼────────────────────┐
                          │ Existing UI (unchanged contracts):       │
                          │  /[locale]/predictions feed              │
                          │  /[locale]/predictions/[matchId]         │
                          │  <Network> agent grid                    │
                          └─────────────────────────────────────────┘
```

## 4. Repo additions

```
apexpredix/
├── apps/web/
│   ├── app/api/cron/
│   │   ├── fixture-sync/route.ts
│   │   ├── results-settle/route.ts
│   │   ├── agent-heartbeat/route.ts
│   │   └── team-stats/route.ts
│   ├── lib/data/
│   │   ├── get-fixtures.ts
│   │   ├── get-match.ts
│   │   ├── get-agents.ts
│   │   └── normalize.ts        # DB row → Match DTO
│   └── scripts/
│       └── seed-fixtures.ts    # backfill DB from canned JSON
├── packages/providers/         # NEW package
│   ├── src/
│   │   ├── types.ts            # interface contracts + DTOs
│   │   ├── registry.ts         # env-flag-driven selection
│   │   ├── canned/
│   │   │   └── odds.ts
│   │   ├── football-data/
│   │   │   ├── client.ts       # rate-limited fetch wrapper
│   │   │   ├── fixtures.ts
│   │   │   ├── results.ts
│   │   │   └── team-stats.ts
│   │   ├── theoddsapi/
│   │   │   └── odds.ts         # stub with NotImplementedError
│   │   └── index.ts
│   ├── __tests__/
│   │   ├── football-data.test.ts  # mock-fetch tests
│   │   ├── canned-odds.test.ts
│   │   └── registry.test.ts
│   ├── package.json
│   └── tsconfig.json
├── packages/db/prisma/
│   ├── schema.prisma           # extended with 6 new models
│   └── migrations/             # generated
├── vercel.json                 # NEW — cron schedule
└── docs/
    └── superpowers/specs/2026-05-21-data-platform-design.md
```

## 5. Prisma schema additions

```prisma
model Competition {
  id           String     @id                // e.g. "PL", "BL1", "SA", "PD", "FL1", "CL", "ELC", "EL1"
  name         String                        // "Premier League"
  country      String
  externalId   Int        @unique            // Football-Data.org's competition id
  createdAt    DateTime   @default(now())
  fixtures     Fixture[]
  teams        Team[]
}

model Team {
  id            String      @id @default(cuid())
  externalId    Int         @unique          // Football-Data.org's team id
  name          String
  shortName     String?
  tla           String?                      // 3-letter abbr "ARS"
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
  status        String                       // SCHEDULED, IN_PLAY, FINISHED, POSTPONED, CANCELLED
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
  bookCode    String                         // PN, DK, FD, etc.
  market      String                         // "1" | "X" | "2" | "O2.5" | "U2.5" | "BTTS-Y" | "BTTS-N"
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
  raw          Json                          // raw provider payload for forensics
}

model AgentHeartbeat {
  id          String   @id @default(cuid())
  agentId     String                         // matches agents.json id (e.g. "fixture-sync")
  status      String                         // live | idle | paused | error
  message     String?
  durationMs  Int?
  createdAt   DateTime @default(now())

  @@index([agentId, createdAt])
}
```

Migration named `20260521_data_platform`. Will be applied via `prisma migrate dev` locally; `prisma migrate deploy` in CI/Vercel build.

## 6. Provider abstraction

### 6.1 Interface contracts (`packages/providers/src/types.ts`)

```ts
import type { Sport } from '@apexpredix/types';

// DTOs are provider-neutral; provider implementations normalize.
export interface FixtureDTO {
  externalId: number;
  competitionExternalId: number;
  homeTeam: TeamDTO;
  awayTeam: TeamDTO;
  kickoff: string;             // ISO 8601
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
  form?: string;               // "WWLDW"
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

export const SUPPORTED_SPORTS: ReadonlySet<Sport> = new Set(['soccer']);   // v1 scope
```

### 6.2 Registry selection (`packages/providers/src/registry.ts`)

```ts
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

The switch-based picker fails loud on unknown env values (better than silently falling through) and gives a single edit point when paid providers land: add a new `case` branch.

### 6.3 Football-Data client (`packages/providers/src/football-data/client.ts`)

```ts
const BASE = 'https://api.football-data.org/v4';
const MAX_REQ_PER_MIN = 10;

class TokenBucket {
  private tokens = MAX_REQ_PER_MIN;
  private last = Date.now();
  async acquire(): Promise<void> {
    const now = Date.now();
    const refill = ((now - this.last) / 60000) * MAX_REQ_PER_MIN;
    this.tokens = Math.min(MAX_REQ_PER_MIN, this.tokens + refill);
    this.last = now;
    if (this.tokens < 1) {
      const waitMs = ((1 - this.tokens) / MAX_REQ_PER_MIN) * 60000;
      await new Promise((r) => setTimeout(r, waitMs));
      this.tokens = 0;
    } else {
      this.tokens -= 1;
    }
  }
}

const bucket = new TokenBucket();

export async function footballDataFetch<T>(path: string): Promise<T> {
  await bucket.acquire();
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_TOKEN ?? '' },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Football-Data ${path} → ${res.status}`);
  return (await res.json()) as T;
}
```

Token-bucket prevents exceeding the 10/min free tier limit. A single fixture-sync cron run hits ~8 endpoints; well within budget.

### 6.4 Canned odds provider

Reads the `odds` arrays from `apps/web/data/fixtures.json` keyed by the canned `id` (e.g. `featured-1`). Returns the matching `OddsDTO[]` keyed by externalId. For live fixtures from Football-Data that have no canned counterpart, returns an empty array — the UI's `OddsCompare` already handles empty gracefully ("No licensed books in this region").

## 7. Cron endpoints

All four endpoints share this shape:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { buildRegistry } from '@apexpredix/providers';
import { prisma } from '@apexpredix/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMPETITIONS = ['PL', 'BL1', 'SA', 'PD', 'FL1', 'CL', 'ELC', 'EL1'];

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const started = Date.now();
  try {
    const registry = buildRegistry();
    const fixtures = await registry.fixtures.fetchUpcoming(COMPETITIONS, 14);
    let written = 0;
    for (const f of fixtures) {
      // 1) Upsert Competition (by externalId), look up its internal id
      const competition = await prisma.competition.upsert({
        where: { externalId: f.competitionExternalId },
        update: {},
        create: { id: COMPETITION_CODE_BY_EXTERNAL_ID[f.competitionExternalId] ?? `EXT-${f.competitionExternalId}`,
                  externalId: f.competitionExternalId, name: 'Auto', country: 'Auto' },
      });
      // 2) Upsert home + away teams (by externalId)
      const home = await prisma.team.upsert({
        where: { externalId: f.homeTeam.externalId },
        update: { name: f.homeTeam.name, tla: f.homeTeam.tla, crestUrl: f.homeTeam.crestUrl },
        create: { externalId: f.homeTeam.externalId, name: f.homeTeam.name, tla: f.homeTeam.tla,
                  crestUrl: f.homeTeam.crestUrl, competitionId: competition.id },
      });
      const away = await prisma.team.upsert({
        where: { externalId: f.awayTeam.externalId },
        update: { name: f.awayTeam.name, tla: f.awayTeam.tla, crestUrl: f.awayTeam.crestUrl },
        create: { externalId: f.awayTeam.externalId, name: f.awayTeam.name, tla: f.awayTeam.tla,
                  crestUrl: f.awayTeam.crestUrl, competitionId: competition.id },
      });
      // 3) Upsert Fixture using internal ids
      await prisma.fixture.upsert({
        where: { externalId: f.externalId },
        update: { kickoff: new Date(f.kickoff), status: f.status, matchday: f.matchday ?? null },
        create: {
          externalId: f.externalId,
          competitionId: competition.id,
          homeTeamId: home.id,
          awayTeamId: away.id,
          kickoff: new Date(f.kickoff),
          status: f.status,
          matchday: f.matchday ?? null,
        },
      });
      written++;
    }
    await prisma.agentHeartbeat.create({
      data: { agentId: 'fixture-sync', status: 'live', message: `${written} fixtures upserted`, durationMs: Date.now() - started },
    });
    return NextResponse.json({ ok: true, count: written, durationMs: Date.now() - started });
  } catch (err) {
    await prisma.agentHeartbeat.create({
      data: { agentId: 'fixture-sync', status: 'error', message: err instanceof Error ? err.message : 'unknown', durationMs: Date.now() - started },
    });
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'unknown' }, { status: 500 });
  }
}
```

Same pattern for the other three. Each writes an AgentHeartbeat with `agentId` matching the canonical agents.json id.

`agent-heartbeat` is special — it doesn't ingest data; it loops through ALL 14 agent ids from agents.json and writes a synthetic heartbeat for each agent that is NOT one of the data-ingestion agents (which write their own heartbeats during cron runs). This is a placeholder until sub-project 3 makes the model agents (ELO-Updater, Poisson-Predictor, etc.) actually execute.

## 8. Vercel cron config (`vercel.json` at repo root)

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

Vercel auto-injects `Authorization: Bearer ${CRON_SECRET}` when calling these paths from the cron scheduler if `CRON_SECRET` is set as a project env var. Manual invocation requires the same header.

## 9. UI integration — DB-first with fallback

### `apps/web/lib/data/get-fixtures.ts`

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
    if (rows.length === 0) return cannedFixtures as Match[];
    return rows.map(dbFixtureToMatch);
  } catch {
    return (opts.featured ? (cannedFixtures as Match[]).filter((m) => m.featured) : (cannedFixtures as Match[])).slice(0, opts.limit ?? 60);
  }
}
```

`getMatch(id)` is analogous — try DB, fall back to canned by id.

`getAgents()` reads the latest `AgentHeartbeat` per `agentId`, joins with the static `agents.json` for capability/name/sparkline metadata, and returns the merged shape `AgentJSON & { lastHeartbeat: Date; lastStatus: string; lastMessage?: string }`.

The existing components consume `Match` and `AgentJSON` types — no JSX changes needed for the swap.

## 10. Seed script

`apps/web/scripts/seed-fixtures.ts` reads canned `fixtures.json`, synthesizes Competition + Team rows (since canned fixtures don't carry Football-Data ids, we generate stable hashed externalIds), and upserts everything into the DB. Useful when developers don't have a Football-Data token and want real DB rows for local testing.

Invocation: `pnpm -F @apexpredix/web seed:fixtures`.

## 11. Env vars (added to `apps/web/.env.example`)

```
# Sub-project 2 — Data Platform
FOOTBALL_DATA_TOKEN=                  # free signup at football-data.org
CRON_SECRET=                          # random 32+ char string
FIXTURE_PROVIDER=footballdata
ODDS_PROVIDER=canned                  # canned | theoddsapi (later)
RESULTS_PROVIDER=footballdata
TEAMSTATS_PROVIDER=footballdata
```

`CRON_SECRET` is auto-included as the Bearer token when Vercel Cron calls our endpoints if set as a project env var.

## 12. Testing strategy

- **Unit (Vitest)** in `packages/providers/__tests__/`:
  - `football-data.test.ts` — mock global `fetch`, assert client URL + auth header + response normalization
  - `canned-odds.test.ts` — verify it returns canned odds keyed correctly
  - `registry.test.ts` — env-flag selection picks the right implementation
- **Unit (Vitest)** in `apps/web/lib/data/__tests__/`:
  - `get-fixtures.test.ts` — DB success returns DB rows; DB empty returns canned; DB error returns canned
  - `get-agents.test.ts` — DB-merge logic
- **Integration**: Each cron route gets a Playwright API-only test:
  - Returns 401 without CRON_SECRET
  - Returns 200 with valid CRON_SECRET (against a seeded test DB — mocked Prisma OK if DB not available in CI)
- **Migration test**: `prisma migrate dev --create-only` produces the expected migration SQL; snapshot-test it.

Target: ≥15 new unit tests on top of v0.1.0's 47.

## 13. Definition of Done

| # | Item | Proof |
|---|---|---|
| 1 | `prisma migrate dev` creates 6 new models cleanly | Migration file + `prisma migrate status` |
| 2 | `pnpm -F @apexpredix/providers test` passes | Vitest summary |
| 3 | `pnpm -F @apexpredix/web test` includes new lib/data tests | Vitest summary |
| 4 | `/api/cron/fixture-sync` returns 401 without auth, 200 with auth | Curl traces |
| 5 | After 1 cron run with FOOTBALL_DATA_TOKEN set, Fixture rows exist | `SELECT COUNT(*) FROM "Fixture"` |
| 6 | `/[locale]/predictions` shows live Premier League fixtures when DB populated | Screenshot |
| 7 | `/[locale]/predictions` shows canned fixtures when DB empty/down | Screenshot |
| 8 | `<Network>` agent grid shows latest AgentHeartbeat per agent when DB populated | Screenshot |
| 9 | Without `DATABASE_URL`, the build still succeeds and the site renders canned | Build log + screenshot |
| 10 | All 8 free Football-Data competitions ingest within the 10/min rate limit | Cron run telemetry |
| 11 | `vercel.json` cron schedule lints clean | `vercel build` no warnings |
| 12 | `CRON_SECRET` is documented in `.env.example` + README | Diff |

## 14. Phases (high-level — full plan in writing-plans step)

1. **Provider package scaffold** — create `packages/providers/`, interface contracts, registry, canned impls, tests
2. **Football-Data implementations** — client with token bucket, fixtures/results/team-stats impls, mock-based tests
3. **Prisma schema + migration** — add 6 models, generate, migrate
4. **Cron endpoints** — 4 routes with CRON_SECRET gate, AgentHeartbeat writes
5. **`vercel.json` + env wiring** — cron declaration, env example updates
6. **Server data helpers** — `getFixtures`/`getMatch`/`getAgents` with DB-first + canned fallback
7. **UI integration** — swap component reads from JSON imports to data helpers; verify no JSX changes
8. **Seed script** — backfill DB from canned JSON for offline dev
9. **DoD verification** — all 12 items proved with evidence

## 15. Open risks

- **Football-Data.org free tier has no SLA.** If it's down at cron time, that tick is lost. Mitigated by 30-min cadence (next tick recovers) and AgentHeartbeat error rows for visibility. Acceptable for v1.
- **Canned `fixtures.json` ids don't match Football-Data externalIds.** This means the canned dataset and live data are disjoint — UI shows one or the other, not both merged. By design: the canned fallback is "demo" mode, the DB is "real" mode. We don't try to merge.
- **Vercel function execution-time limits** — 60s on Hobby plan. Each cron handler must batch DB writes (use `prisma.fixture.upsertMany`-style batches via raw SQL if needed). Football-Data API responses are sub-second; the DB writes are the bottleneck.
- **`prisma.upsert` n+1 for 100+ fixtures** — for the volumes we expect at v1 scale (~50-80 fixtures across 8 competitions every 30 min), 1-by-1 upsert is fine. If we exceed that, switch to raw SQL `INSERT ... ON CONFLICT`.
- **The 14 agents are mostly decorative** until sub-project 3. AgentHeartbeat shows they're "alive" via cron runs, but the underlying capabilities (ELO recompute, xG modeling, value-bet hunting) are no-ops until then. That's acceptable for v2 — the marketing claim "14 agents active" stays truthful (they ARE running, just doing trivial work).
- **`vercel.json` cron is Vercel-specific.** If hosting moves elsewhere (Fly.io etc.) the cron approach must change. Mitigated by the worker logic living in route handlers — any cron system that can hit HTTPS endpoints with Bearer auth works.
- **No automated rollback** — if a Football-Data API change breaks `FootballDataFixtureProvider`, fixtures stop syncing. Mitigated by: (a) error AgentHeartbeats surface this in the Network grid; (b) DB-first-with-fallback means UI never goes blank.

## 16. Decisions captured

| # | Decision | Rationale |
|---|---|---|
| 1 | Free-first, paid-ready interfaces | Lowest cost to validate; clean swap when revenue justifies paid providers |
| 2 | Soccer-only for v1 | Football-Data covers 8 major comps reliably; other sports stay canned |
| 3 | Stub canned odds for v1 | No free real-odds provider exists at the quality needed; defer to paid plan |
| 4 | Vercel Cron over Inngest | Free, native, sufficient cadence; Inngest comes when retries matter |
| 5 | DB-first reads with canned fallback | v0.1.0 marketing site keeps working without DB; zero regression |
| 6 | `CRON_SECRET` Bearer header | Vercel native, simplest correct auth for cron endpoints |
| 7 | 6 new Prisma models + raw JSON for forensics | Normalized for queries, `raw` jsonb keeps provider payloads for audit |
| 8 | Separate `packages/providers` package | Reusable across web app + future admin app (sub-project 7); enforced interface boundary |

## 17. Next step

Hand this spec to the user for review. On approval, transition to `superpowers:writing-plans` to produce the executable implementation plan with full task breakdown.
