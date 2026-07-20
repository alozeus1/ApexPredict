# Phase 0 — Repository Discovery, Baseline & Gap Register

Date: 2026-07-19
Branch inspected: `feat/engine-correctness-and-multi-sport`
Status: **Discovery complete. Baseline metrics NOT obtained — see §5 blockers.**

> This document records evidence only. No prediction-engine changes were made during Phase 0.

---

## 1. Repository map

| Layer | Location | Notes |
|---|---|---|
| Frontend | `apps/web/app/[locale]/**` | Next.js 15 App Router, next-intl, 23 pages |
| Prediction UI | `predictions/`, `predictions/[matchId]`, `dashboard/`, `premium/` | Reads via `lib/data/get-fixtures.ts` |
| API routes | `apps/web/app/api/**` | 18 routes (auth, billing, waitlist, admin, cron, health, consent) |
| Scheduled work | `app/api/cron/daily-refresh/route.ts` | **Single** cron, `0 6 * * *` (`apps/web/vercel.json`) |
| Prediction engine | `apps/web/lib/prediction-engine/` | `model.ts`, `signals.ts`, `orchestrator.ts`, `enrichment.ts`, `premium-signals.ts`, `backtest.ts` |
| Provider clients | `apps/web/lib/providers/` | `fixtures/`, `odds/`, `enrichment/`, `api-sports/`, `mapping/`, `failover.ts` |
| Database | `packages/db` (Prisma 5.22, Postgres/Neon) | 8 migrations; latest `20260719_add_multi_sport_dimension` **not yet applied** |
| Auth / entitlements | `auth.ts`, `lib/entitlements.ts`, `lib/auth-guards.tsx` | Auth.js v5 + Prisma adapter |
| Admin | `app/[locale]/admin/odds-upload`, `api/admin/entitlements/[userId]` | Odds CSV upload + entitlement override only |
| Observability | `sentry.*.config.ts`, `lib/workers/heartbeat.ts` (`AgentHeartbeat`), `api/health`, `api/health/deep` | No provider/quota/mapping dashboards |
| CI | `.github/workflows/ci.yml`, `.forgejo/workflows/ci.yaml` | generate → typecheck → lint → test → build → smoke |
| Deploy | `.forgejo/workflows/deploy.yaml` → Vercel | typecheck + test gate before deploy |
| Tests | 62 files (unit + 12 Playwright E2E) | Engine coverage: 3 files, all added in the last 24h |

### Data flow, as built

```
Football-Data.org ──► daily-refresh cron ──► Fixture / TeamStat / Competition
                            │
                            ├─► buildFixtureEnrichment ──► FixtureEnrichment (mostly "unavailable" markers)
                            ├─► TheOddsApiProvider ──────► Odds / OddsMovement / PredictionAlert
                            ├─► runPredictionGraph ──────► PredictionSnapshot
                            └─► runBacktest ─────────────► PredictionBacktestRun / PredictionCalibrationBucket

get-fixtures.ts ──► Fixture + latest PredictionSnapshot ──► normalizeFixture ──► MatchCard
       └─► on ANY error/empty ──► data/fixtures.json (canned)      ◄── see G1
```

---

## 2. Confirmed defect status

Each reported defect was checked against current code. **Six of the nine were remediated in the last 24 hours (P0/P1) and are no longer present.**

| # | Reported defect | Status | Evidence |
|---|---|---|---|
| D1 | Uses only Football-Data.org standings | **CONFIRMED** | `daily-refresh/route.ts:19-21`; `SportmonksProvider.fetchCompetitionBundle` throws `'not implemented — wired in S2'` (`football-data-provider.ts:27-29`). API-Sports client exists but is **not wired into the cron**. |
| D2 | Team strength from position/points/games/GF/GA | **CONFIRMED (narrowed)** | `model.ts:124-135`. Still the only strength source; recent form now blended at 25% weight. |
| D3 | Elo and xG are affine transforms of one probability | **ALREADY FIXED** | `signals.ts:44-74` — Elo is now a logistic rating model independent of the heuristic. xG is `available:false, weight:0` (`orchestrator.ts:99-118`). Regression test: `signals.test.ts:72-80`. |
| D4 | Only Poisson is genuinely different | **ALREADY FIXED (partially)** | Two independent signals now (Elo, Poisson). **But both derive from the same standings table** — independence is functional, not informational. See G4. |
| D5 | Ensemble computed but not used to select the pick | **ALREADY FIXED** | `orchestrator.ts:134-136` passes the ensemble distribution into `buildPredictionContext`. Test: `signals.test.ts:161-169`. |
| D6 | Can blend probabilities of different markets | **ALREADY FIXED** | Agents emit full distributions (`signals.ts:27-34`); `blendSignals` is per-market (`signals.ts:111-123`). |
| D7 | Ignores the available `form` field | **ALREADY FIXED** | `model.ts:95-115` (`recentFormScore`, exponential decay), consumed at `model.ts:131`. |
| D8 | ~Neutral strength fallback for cup / early season | **CONFIRMED** | `model.ts:125` — `if (!stats \|\| !stats.playedGames) return 0.5`. Every cup tie and early-season fixture is a coin flip plus home advantage. |
| D9 | No injuries / lineups / rest / travel / referee / event stats / market movement | **CONFIRMED (one exception)** | `enrichment.ts:61-64` records four `available:false` markers. **Market movement is the exception** — `OddsMovement` + `premium-signals.ts` are implemented, but the engine does not consume them as features. |

**Additional defect found during discovery, not in the original report — see G1. It is the most serious item in this document.**

---

## 3. Gap register

Severity: **C**ritical / **H**igh / **M**edium / **L**ow

| ID | Sev | Gap | Impact | Evidence | Remediation | Validation |
|---|---|---|---|---|---|---|
| **G1** | **C** | `getFixtures()` silently falls back to canned `data/fixtures.json` on empty results, missing `DATABASE_URL`, or **any** thrown error (bare `catch {}`) | Subscribers can be served **fabricated predictions** — the canned file contains invented model scores and `"valueBet": true` — presented identically to real output. Directly violates "never display fabricated accuracy" and the no-invented-values rule. | `lib/data/get-fixtures.ts:21, 40-44`; `data/fixtures.json` | Restrict canned data to explicit dev/preview flag; in production surface an empty state or error; log + alert on fallback | E2E test: DB unavailable ⇒ no match cards rendered, no fabricated numbers |
| **G2** | **H** | No baseline metrics exist | Cannot prove any future model beats today's. Release gate "beats current baseline" is unmeasurable. | `PredictionBacktestRun` has never been populated (`runBacktest` reachable only via cron); migration unapplied | Add standalone `scripts/backtest.ts`; run after migration | Recorded Brier / log loss / ECE with n and CI |
| **G3** | **H** | Single live data source | No redundancy; provider outage stops all predictions; secondary provider throws by design | `football-data-provider.ts:27-29` | Wire API-Sports as fixtures + enrichment provider (P2) | Failover integration test |
| **G4** | **H** | Elo and Poisson are *functionally* independent but *informationally* correlated — both consume only standings | Ensemble diversity is overstated; `signalAgreement` will read high for structural reasons | `signals.ts:44,83`; `enrichment.ts:47-56` | Add form/ML model on point-in-time features (P6 Model C); measure pairwise correlation | Ablation: does adding a model reduce log loss out of sample? |
| **G5** | **H** | No point-in-time feature store; no leakage tests | Any future training will likely leak (standings are cumulative and mutate) | No `MatchFeature` table; `TeamStat.capturedAt` exists but is not used as an as-of filter | Build feature store with `asOf`; CI leakage assertions | Automated test: no feature timestamp > prediction timestamp |
| **G6** | **H** | Cup / early-season fixtures score 0.5 | Coin-flip predictions published with the same visual confidence as informed ones | `model.ts:125` | Competition-strength priors + explicit low-confidence suppression | Publishing gate blocks; unit test |
| **G7** | **M** | No injuries, lineups, referee, rest, travel, event statistics | Largest single-factor swings in football are invisible to the model | `enrichment.ts:61-64` | API-Sports providers + pre-kickoff worker (P2/P4) | Coverage ≥ 90% on launch competitions |
| **G8** | **M** | No provider licensing / rights registry | Storage, training, derivative and display rights are **UNKNOWN** for every provider | No registry file exists | Build registry (Phase 1); mark UNKNOWN as a release gate | Documented rights per provider |
| **G9** | **M** | `PredictionSnapshot` has no model version or feature-snapshot reference | Predictions are not reproducible; backtests mix engine generations | `schema.prisma` `PredictionSnapshot` | Add `modelVersion`, `featureSnapshotId` | Backtest filterable by version |
| **G10** | **M** | No publishing policy layer | `valueBet` boolean is the only gate; no NO-BET / SUPPRESSED states | `model.ts` `valueBet` | Implement Phase 10 policy engine | Unit tests per gate |
| **G11** | **M** | No provider/quota/mapping observability | Silent degradation; stale feeds indistinguishable from absent ones | Only `AgentHeartbeat` exists | Admin views (Phase 11) | Admin E2E |
| **G12** | **M** | Odds are h2h only, not de-vigged | Edge is computed against a margin-inclusive price, overstating value | `the-odds-api.ts` (`markets` default `h2h`); `model.ts` edge uses raw `1/price` | Implement de-vigging | Unit test vs known example |
| **G13** | **M** | No closing odds captured | Closing-line value — the strongest evidence of genuine edge — is impossible to compute | No closing snapshot in `Odds` | Capture closing price at kickoff | CLV present in backtest output |
| **G14** | **L** | Two stray files (`hello-back.txt`, `hello-floci.txt`) untracked in repo root | Noise | `git status` | Delete | Clean status |

### Credit where due

Two existing behaviours already meet the brief's standards and should be preserved:

- `lib/data/get-backtest-metrics.ts` suppresses all performance tiles below n=100 and renders dashes rather than zeros.
- `enrichment.ts` records explicit `unavailable` markers with reasons rather than imputing values.

---

## 4. Commands executed

```bash
git branch --show-current                  # feat/engine-correctness-and-multi-sport
git status --short                         # 8 untracked; no unrelated modified files
find app/api -name route.ts                # 18 routes
find . -name '*.test.ts' -o -name '*.spec.ts'   # 62 test files
npx tsc --noEmit          (apps/web)       # EXIT 0 — clean
node --experimental-strip-types verify.ts  # 43 engine-maths checks pass (sandbox harness)
node --experimental-strip-types verify-p1.ts # 30 multi-sport + mapping checks pass
```

---

## 5. Baseline blockers — metrics NOT obtained

Phase 0 requires recorded Brier score, log loss, ECE, accuracy by market and prediction count. **None were obtained. No values are reported, and none should be quoted from this document.**

| Requirement | Status | Reason |
|---|---|---|
| Install / typecheck | ✅ typecheck clean | `tsc` is pure JS and runs in the analysis sandbox |
| Lint | ❌ not run | ESLint binary not resolvable in sandbox |
| Unit tests | ❌ not run | `node_modules` built for darwin-arm64; rollup native binary mismatch on Linux |
| Integration / E2E | ❌ not run | Requires Playwright browsers + running app |
| Production build | ❌ not run | Same toolchain constraint |
| Backtest | ❌ not run | `PredictionBacktestRun` empty; no standalone entry point; migration `20260719` unapplied; production Neon is the only configured database |
| Brier / log loss / ECE / ROI | ❌ **unavailable** | Depends on the above. Reporting estimates would violate the no-fabrication rule. |

**These must be executed on a developer machine or in CI before Phase 1 begins.** Exact commands are in §7.

---

## 6. Release-gate status

**Verdict: NOT MARKET-READY.** Not a judgement of quality — simply that the required evidence does not yet exist.

| Gate | Status |
|---|---|
| Clean build / lint / tests | UNVERIFIED (not runnable here) |
| Migrations validated | **FAIL** — `20260719` pending |
| Provider rights documented | **FAIL** — no registry; all rights UNKNOWN |
| Entity mapping ≥ 98% | **FAIL** — unmeasured; seed script not yet run |
| Point-in-time leakage tests | **FAIL** — do not exist |
| Walk-forward testing | **FAIL** — framework does not exist |
| Calibration measured | **FAIL** — no populated runs |
| Ensemble beats baseline | **UNMEASURABLE** — no baseline |
| No fabricated output | **FAIL** — G1 |
| No guaranteed-win language | PASS (verified in prior repositioning work) |
| Independent Codex review | **NOT RUN** — integration not invoked; recorded as a missing gate |

---

## 7. Execution plan

**Gate A — unblock the baseline (must precede Phase 1).** Owner: developer machine / CI.

```bash
cd ~/Desktop/ApexPredict
pnpm install
pnpm -F @apexpredix/db exec prisma migrate status     # expect: 1 pending
pnpm -F @apexpredix/db exec prisma migrate deploy
pnpm typecheck && pnpm lint && pnpm test
pnpm -F @apexpredix/web build
```

Then: fix **G1** (highest severity, small change), add `scripts/backtest.ts`, add `modelVersion` to `PredictionSnapshot` (G9), and record the first clean baseline.

**Ordering rationale.** G1 before anything else — a subscriber-facing product that can silently serve invented predictions is a correctness and trust defect, not a roadmap item. G9 before the baseline, because a baseline that cannot be attributed to a model version is not a baseline. Phase 5 (feature store) before Phase 6 (models), because training without point-in-time discipline produces a model that backtests beautifully and loses money.

**Subsequent phases** follow the brief's numbering, with two deviations:

1. **Phase 1 (provider registry) is elevated ahead of new model work.** Every provider right is currently UNKNOWN. Building models on data we may not be licensed to train on or redistribute creates rework and legal exposure.
2. **Phase 6 Model C (form/ML) is prioritised over Model E (lineup) and Model F (Monte Carlo).** Per G4, the ensemble's real weakness is informational correlation, not model count. A third model reading the same standings adds nothing.

**Recommended cadence:** one phase per increment, each ending in Loop D (full verification) with recorded evidence. Do not stack unverified architectural changes.

---

## 8. Open questions for the owner

1. Is a **staging database** available? Running Phase 5/9 backfills and backtests against production Neon is a standing risk.
2. Is the **Codex integration** installed in this environment? If not, Loop E is a permanently open gate and must be declared as such.
3. Which competitions are the **launch set**? Entity-mapping and coverage thresholds are meaningless without a defined scope.
4. Are commercial licences held for **OpticOdds / TheRundown**, or are these aspirational? This determines whether closing-line value (G13) is achievable at launch.
