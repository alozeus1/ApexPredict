# API-Sports Integration & Model Training Architecture

Date: 2026-07-19
Status: Proposed — supersedes the enrichment roadmap in `2026-06-25-agentic-prediction-orchestration.md`
Owner: CTO / Platform

---

## 0. Summary

ApexPredict currently runs a deterministic league-table heuristic (`lib/prediction-engine/model.ts`)
wrapped in a LangGraph orchestration (`orchestrator.ts`). Its only data input is the
Football-Data.org standings table (position, points, played, goals for/against).

This document specifies three things:

1. Where the API-Sports credential plugs into the repo.
2. The multi-sport schema change that must land **before** historical backfill.
3. The training pipeline that turns the heuristic into a calibrated, retrainable model.

**Sequencing is deliberate.** Multi-sport schema first, then backfill, then training.
Backfilling a football-shaped schema and re-migrating it later means re-ingesting
every historical record.

---

## 1. Credentials & configuration

### 1.1 Environment variables

Add to Vercel (Production / Preview / Development), the Forgejo + GitHub Actions
secret stores, and local `.env.local`. Never to a tracked file — `.env*` is
gitignored and must stay that way.

| Variable | Example | Notes |
|---|---|---|
| `API_SPORTS_KEY` | `<secret>` | The subscription key. |
| `API_SPORTS_TRANSPORT` | `direct` | `direct` or `rapidapi` — **auth header differs**, see 1.2. |
| `API_SPORTS_SPORTS_ENABLED` | `football` | Comma-separated. Add sports only as their models are validated. |
| `API_SPORTS_FOOTBALL_HOST` | `v3.football.api-sports.io` | Per-sport host. |
| `API_SPORTS_DAILY_QUOTA` | `75000` | Used by the local budget guard, not by the provider. |
| `API_SPORTS_HISTORICAL_SEASONS` | `2016,…,2025` | Backfill scope. Verify actual entitlement in the API-Sports dashboard before setting. |

### 1.2 Transport difference — verify before coding

API-Sports is reachable two ways and the headers are not interchangeable:

- **Direct** (`api-sports.io` dashboard account): `x-apisports-key: <key>`
- **RapidAPI marketplace**: `x-rapidapi-key: <key>` + `x-rapidapi-host: <host>`

Confirm which one the current subscription is on. Wrong header returns 403 with
a message that reads like an entitlement problem, which wastes debugging time.

### 1.3 Secret hygiene

- Add API-Sports key patterns to `.gitleaks.toml`.
- Rotation follows `docs/runbooks/secrets-incident-response.md`.
- The key is server-only. It must never reach a client bundle — keep all
  provider modules out of any `'use client'` import graph.

---

## 2. Multi-sport schema change (do this first)

The current model is football-shaped in ways that break on other sports:

- `EnginePrediction.market` is typed to `'1' | 'X' | '2'`. Basketball, tennis,
  and NFL moneylines are **two-way** — there is no draw.
- `Competition` and `Fixture` carry no sport dimension.
- `teamStrength()` assumes a league table with points. Tennis has rankings;
  knockout formats have none.

### 2.1 Migration

```prisma
enum Sport {
  FOOTBALL
  BASKETBALL
  AMERICAN_FOOTBALL
  BASEBALL
  HOCKEY
  RUGBY
  TENNIS
  MMA
}

enum MarketType {
  MONEYLINE_3WAY   // 1 / X / 2
  MONEYLINE_2WAY   // home / away
  TOTALS
  HANDICAP
  BTTS
  CARDS
}

model ProviderEntityMap {
  id         String @id @default(cuid())
  entityType String   // 'team' | 'competition' | 'player'
  internalId String
  provider   String   // 'api-sports' | 'football-data' | 'the-odds-api'
  providerId String
  sport      Sport
  confidence Float    @default(1.0)
  verifiedBy String?  // null = auto-matched, NOT yet trusted
  createdAt  DateTime @default(now())

  @@unique([provider, providerId, entityType])
  @@index([internalId, provider])
}
```

Add `sport Sport @default(FOOTBALL)` to `Competition` and `Fixture`.
Add `marketType MarketType @default(MONEYLINE_3WAY)` to `Odds`,
`PredictionSnapshot`, and `PredictionEvaluation`.

### 2.2 Engine generalisation

Replace the hardcoded `['1','X','2']` tuples in `model.ts` and `orchestrator.ts`
with a market set resolved from `MarketType`. The Poisson branch stays
football-only; other sports get their own scoring model behind the same
`PredictionContext` interface.

**Rule: one sport ships at a time, and only after its own backtest passes the
promotion gate in §6.** Breadth without calibration is a liability, not a feature.

---

## 3. Provider layer

New modules, mirroring the existing `FixturesProvider` / `BatchOddsProvider`
interface pattern so `runWorkerWithFailover` keeps working unchanged:

```
apps/web/lib/providers/api-sports/
  client.ts              # auth headers, retry, quota accounting, response envelope
  quota.ts               # daily budget guard, refuses calls near the cap
  football/
    fixtures.ts          # FixturesProvider impl
    injuries.ts          # /injuries
    lineups.ts           # /fixtures/lineups
    statistics.ts        # /fixtures/statistics  (shots, SOT, possession, corners)
    headtohead.ts        # /fixtures/headtohead
    odds.ts              # /odds  (benchmark only — see note)
  mapping/
    resolve.ts           # ProviderEntityMap lookup + fuzzy fallback
```

### 3.1 Cleanup prerequisite

`TheOddsApiProvider` is currently implemented inside
`lib/providers/odds/types.ts`. Move it to `lib/providers/odds/the-odds-api.ts`
before adding providers, or that directory becomes unnavigable.

### 3.2 Coverage gating

API-Sports exposes a `coverage` object per league-season indicating whether
injuries, lineups, odds, and player stats exist. Check it before scheduling
calls. Coverage for NPFL and CAF competitions is materially thinner than for
the top five European leagues — the enrichment layer must record
`unavailable` there rather than degrade silently.

### 3.3 Do not consume `/predictions`

API-Sports ships its own `/predictions` endpoint. It must **not** enter the
ensemble — that would be reselling a third-party black box. Store it in a
`benchmarkJson` column and beat it. That comparison becomes marketing evidence.

---

## 4. Cron topology

The current single daily cron cannot use lineup data, which publishes 20–40
minutes before kickoff. Three workers:

| Worker | Cadence | Job |
|---|---|---|
| `daily-refresh` (exists) | 02:00 UTC | Fixtures, standings, injuries, referee, H2H, baseline predictions |
| `pre-kickoff` (new) | every 15 min | Confirmed lineups + odds refresh → re-score → `LINEUP_SHOCK` alerts |
| `settle-and-evaluate` (new) | hourly | Results → `PredictionEvaluation` → rolling calibration |

The `pre-kickoff` worker is where the commercial value concentrates: detecting
that team news has landed while a soft book has not yet moved its line.

---

## 5. Historical backfill & training

Vercel serverless cannot train models. Training lives in `services/`, alongside
the existing CrewAI scaffold.

```
services/model-training/          # Python
  ingest/       # paged historical pull → raw Parquet in object storage
  features/     # feature builder with as-of enforcement
  train/        # LightGBM (1X2), Dixon-Coles (scorelines)
  calibrate/    # isotonic regression on held-out folds
  registry/     # versioned model artefacts + metrics
  export/       # artefact → object storage for the Next.js cron to load
```

### 5.1 Feature store

```prisma
model MatchFeature {
  id         String   @id @default(cuid())
  fixtureId  String
  sport      Sport
  featureSet String   // e.g. 'football-v1'
  asOf       DateTime // MUST be <= kickoff. Enforced in code AND by CI test.
  payload    Json
  createdAt  DateTime @default(now())

  @@unique([fixtureId, featureSet, asOf])
  @@index([sport, asOf])
}
```

### 5.2 Leakage rules — the single biggest risk

Nearly every amateur sports model fails here, and it fails *invisibly*: the
backtest looks superb and live performance collapses. Non-negotiable:

1. **Reconstruct standings as-of the match date.** Never join a historical
   fixture to the end-of-season table. This alone can fabricate 15–20 points of
   apparent accuracy.
2. Every feature carries `asOf`, and `asOf <= kickoff`. Assert it in a CI test,
   not just a code comment.
3. **Time-ordered splits only.** Walk-forward validation. A random train/test
   split on time-series data is invalid.
4. Odds features use the price available pre-kickoff, never the closing price,
   unless the closing price is explicitly the CLV benchmark target.
5. No target encoding or normalisation computed across the full dataset —
   fit scalers on the training fold only.

### 5.3 Historical odds — the cheap path

API-Sports historical odds depth is limited. The repo already has
`lib/odds/csv-import.ts` and an NPFL fixture CSV. Extend it to ingest
football-data.co.uk's free historical CSVs, which carry opening and closing
1X2 prices for major European leagues going back many seasons. Without
historical closing odds you cannot compute closing-line value, and CLV is the
only metric that credibly proves a model has edge.

### 5.4 Model choice

Start boring and beat the baseline before getting clever:

1. **Baseline**: current heuristic. Already implemented — this is what you must beat.
2. **v1**: multinomial LightGBM on form, availability, H2H, home/away splits, shot stats.
3. **v1 scorelines**: Dixon-Coles (corrects the Poisson model's known
   underestimation of low-scoring results, as flagged in the June architecture doc).
4. **Calibration layer**: isotonic regression. This is what makes the published
   probabilities honest and is the foundation of the entire market position.

Deep learning is not warranted at this data volume. It adds variance, opacity,
and training cost without beating gradient boosting on tabular sports data.

---

## 6. Promotion gate

No model reaches production without clearing all of the following against the
current champion, on a walk-forward holdout:

| Metric | Requirement |
|---|---|
| Log loss | Lower than champion |
| Brier score | Lower than champion |
| Calibration error | ≤ 0.03 across all `PredictionCalibrationBucket` buckets |
| Closing-line value | Positive mean CLV over ≥ 500 settled predictions |
| ROI at realistic stake | Positive after 5% commission assumption |
| Sample size | ≥ 500 settled predictions in the evaluation window |

The existing `PredictionBacktestRun` / `PredictionCalibrationBucket` tables
already compute most of this. Add a `ModelVersion` table and make promotion an
explicit, audited, revertible action.

The deterministic heuristic stays as the permanent fallback. If a trained model
fails to load or scores out of range, the cron degrades to it rather than
serving nothing.

---

## 7. Sequencing

| Phase | Scope | Exit criteria |
|---|---|---|
| P0 | Ensemble bug fixes; move `TheOddsApiProvider`; baseline backtest recorded | Documented baseline log loss + Brier |
| P1 | Multi-sport schema migration; `ProviderEntityMap`; mapping verified for configured competitions | Mapping coverage report; unverified matches degrade safely |
| P2 | API-Sports football providers; `pre-kickoff` worker; enrichment populated | Injuries/lineups present for ≥ 90% of covered fixtures |
| P3 | Historical backfill; feature store; leakage CI tests green | ≥ 5 seasons ingested with as-of integrity verified |
| P4 | Train v1 + calibration; promotion gate | v1 clears all gate metrics |
| P5 | Second sport (basketball) through the same pipeline | Its own gate cleared independently |

---

## 8. Known risks

| Risk | Mitigation |
|---|---|
| Data leakage inflates backtest | §5.2 rules enforced by CI, not convention |
| Entity mapping errors on African/lower-tier leagues | `verifiedBy` gate; unverified → unavailable, never guessed |
| Quota exhaustion kills next-day data | `quota.ts` budget guard + circuit breaker + heartbeat alert |
| Multi-sport breadth outpaces calibration | One sport per gate; §2.2 rule |
| Stale feed trusted by model | Freshness assertion: enrichment > 24h old → unavailable |
| Vendor redistribution terms | Confirm in writing with API-Sports what may be surfaced in-product vs. derived-only |

---

## 9. Open questions

1. Which transport is the current subscription on — direct or RapidAPI?
2. What historical season depth does the current plan actually entitle?
3. Which sports are commercially prioritised after football, and on what evidence?
4. Object storage target for Parquet + model artefacts (S3, R2, Supabase Storage)?
