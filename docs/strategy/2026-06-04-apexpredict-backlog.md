# ApexPredict — Engineering Backlog (v1 MVP)

**Kickoff:** Tuesday 2026-06-09
**Public Nigeria launch target:** Monday 2026-08-04 (60 days)
**Owner:** CTO Office, Web Forx Global Inc.
**Version:** v1.1 · 2026-06-05
**Status:** Approved — S0 execution in progress

> **Self-contained spec.** Every task below includes description, acceptable deliverables, expectations / edge cases, dependencies, estimate, and acceptance criteria. Engineers should not need to ping the user for clarification before starting work.

---

## Sprint S0 — execution status (agent, 2026-06-05)

Per-task status lives in the XLSX `Backlog` sheet (`Status` column). Labels:
`Done` · `In flight (agent)` · `In flight (human)` · `Not started` · `Deferred to v1.1`.
Summary of what the five Sprint-S0 PRs delivered (all branched off `develop`):

| PR | Branch | Tickets → status |
|----|--------|------------------|
| 1 | `chore/ci-cd-and-scanners` | **Done:** E00-S2-T1..T5. **In flight (human):** E00-S2-T6 (branch protection is a Forgejo UI action). |
| 2 | `chore/repo-hygiene` | Locale gate, fabricated-count removal, `HASH_SECRET_SECONDARY` rotation, `/api/health/deep` (repo-hygiene; the `E00-S1-T8` rotation *runbook* remains **In flight (human)**). |
| 3 | `feat/copy-repositioning` | **Done:** E04-S3-T4 + repositioning-copy list. |
| 4 | `feat/identity-foundation` | **Done:** E01-S1-T1..T7, E01-S3-T1..T3, E01-S4-T1, E01-S4-T4. |
| 5 | `feat/data-and-prediction-scaffolds` | **Done:** E03-S1-T8, E03-S2-T1, E03-S3-T3 (partial), E04-S4-T1, E05-S2-T1. |

**In flight (human)** — vendor signups, KYC, DNS, billing alerts: `E00-S1-T1..T8`, `E00-S2-T6`.
Everything else remains **Not started**. Migrations in PRs 4 & 5 are generated SQL only — not yet applied to Neon.

---

## How to read this doc

- **Epic** — a coherent product area (e.g., Payments). Spans one or more sprints.
- **Story** — a user-visible outcome with a Definition of Done. Sized to fit inside one sprint.
- **Task** — an atomic engineering ticket. Sized to fit inside 1–5 days for one engineer.
- **Estimate** — `XS` ≤2h · `S` ≤1d · `M` ≤3d · `L` ≤5d · `XL` 1–2 weeks. Sum the estimates against the team capacity before committing a sprint.
- **Acceptance criteria (AC)** — testable conditions. A task is not "done" until all AC pass in code review *and* a deployed preview environment.
- **Dependencies** are referenced by ticket id (`E01-S2-T3` = Epic 01, Story 2, Task 3).
- **Owner role** — frontend (FE), backend (BE), ML, SRE/DevOps, design (DES), product/PM, QA.

---

## Sprint calendar (locked)

| Sprint | Dates | Theme | Capacity assumption |
|---|---|---|---|
| **S0** | Fri 2026-06-05 → Mon 2026-06-08 (4d prep) | Kickoff & foundations | Whole team part-time |
| **S1** | Tue 2026-06-09 → Mon 2026-06-22 | Identity, Subscription, Payments | 2 BE + 2 FE + DES + SRE |
| **S2** | Tue 2026-06-23 → Mon 2026-07-06 | Data ingestion v2 + Prediction v2 | 2 BE + 1 ML + 1 FE + SRE |
| **S3** | Tue 2026-07-07 → Mon 2026-07-20 | Product UX + Notifications + SEO | 2 FE + 1 BE + DES + QA |
| **S4** | Tue 2026-07-21 → Mon 2026-08-03 | Compliance, hardening, launch | Whole team + ext. pen-test |
| **Launch** | Tue 2026-08-04 | Public Nigeria launch | GTM + SRE on-call |

---

## Strategic guardrails (apply to every story)

1. **Positioning.** No copy/UI/email/Telegram language may claim a "win rate," "guaranteed wins," or specific ROI promise. Everything is framed as **calibrated probabilities** and **edge vs. live market**. Reviewer rejects any PR that violates this.
2. **Lean-spend rule.** During S0–S3, use free / dev tiers wherever feasible. Upgrade to paid plans only on a per-component basis at the documented trigger (see `2026-06-04-apexpredict-lean-infra.md`). Full ~$600/mo stack does not come on until S4 cutover.
3. **Locale gate.** Ship English-only at launch unless Yoruba (`yo`), Igbo (`ig`), or Hausa (`ha`) pass the translation gate (see `2026-06-04-apexpredict-locale-gate.md`). No Pidgin in v1.
4. **No directly-scraping Nigerian sportsbooks.** Use The Odds API + manual NPFL upload. Direct scraping is brittle, ToS-violating, and exits the legal posture.
5. **All PRs require:** linked ticket id, passing CI (typecheck + lint + unit + e2e smoke), one reviewer, no `high`/`critical` SAST findings.
6. **Definition of Ready (DoR)** for any story to enter a sprint: AC clear, design link present where UI exists, env vars listed, dependencies merged or scoped out.

---

# EPIC-00 — Prep & Foundations (Sprint S0)

**Sprint:** S0 · **Owner role:** PM + SRE + CTO
**Goal:** Eliminate every pre-flight blocker before Tuesday kickoff. By end of S0 every engineer can clone, run, and ship.

## Story E00-S1 — Provider accounts opened & secrets vaulted

**Outcome:** All third-party accounts exist on free/dev plans, billing alerts set, credentials stored in 1Password / Doppler vault, accessible only to roles that need them.

**Acceptance criteria:**
- Accounts created on: Paystack (test mode), Smile ID (sandbox), Sportmonks (Bronze trial), The Odds API (free 500/mo), OpenWeather (free), Resend, Sentry, Upstash (Redis + QStash free tiers), Axiom (free 0.5 GB/mo), PostHog (free), Cloudflare (free).
- Each account has a billing-alert at 80% of the free-tier ceiling, and a hard cap where supported.
- Secrets written to a shared 1Password / Doppler vault. No secret committed to git. `apps/web/.env.example` lists every key; values stay in the vault.
- A `docs/runbooks/secrets.md` rotation runbook exists.

### Tasks
| ID | Subject | Description | Deliverables | Expectations | Estimate | Owner |
|---|---|---|---|---|---|---|
| E00-S1-T1 | Stand up shared secret vault | Provision 1Password Business or Doppler workspace `apexpredict-prod`. Add CTO + 2 engineers + SRE. Create vaults: `bootstrap`, `dev`, `staging`, `prod`. | Vault link in `docs/runbooks/secrets.md`; member list in PM tool. | Use SSO if available. Disable export. Audit log on. | S | SRE |
| E00-S1-T2 | Open Paystack test account, fetch keys | Register Web Forx Technology Ltd on Paystack. Stay in test mode. Generate `PAYSTACK_PUBLIC_KEY_TEST`, `PAYSTACK_SECRET_KEY_TEST`, webhook signing secret. | Keys in `bootstrap` vault. Webhook endpoint placeholder agreed. | Real KYC submission for live mode deferred to S4. | XS | PM |
| E00-S1-T3 | Open Smile ID sandbox | Register; create sandbox partner ID + API key. Read pricing + free-test cap. | Keys in vault; pricing note in `docs/runbooks/kyc.md`. | NG document types only: NIN, BVN, Driver's Licence, Voters Card. | XS | PM |
| E00-S1-T4 | Open Sportmonks trial + The Odds API free | Create accounts, capture tokens, confirm league coverage list. | Tokens in vault; coverage notes in `docs/runbooks/data-providers.md`. | Verify NPFL coverage: Sportmonks usually does not — confirm manual-upload fallback plan. | XS | BE |
| E00-S1-T5 | Open Upstash (Redis + QStash), Axiom, PostHog free | Create projects. Capture REST/HTTP keys. | Tokens in vault; quotas in runbook. | Upstash Redis free = 10k req/day; QStash free = 500 msg/day. Plan accordingly. | XS | SRE |
| E00-S1-T6 | Cloudflare zone for apexpredict.ai | Move DNS to Cloudflare (if not already). Free plan. DNSSEC on. SPF / DKIM / DMARC entries for Resend domain. | DNS records committed to `docs/runbooks/dns.md`. | Don't enable WAF rules yet; bot management ships in S4. | S | SRE |
| E00-S1-T7 | Billing alerts everywhere | Configure 80% utilization alerts for: Vercel, Neon, Upstash, The Odds API, Sportmonks, Smile ID, Resend, Sentry, Axiom. | Screenshot evidence in `docs/runbooks/cost-alerts.md`. | Alerts go to `cto@webforx.global` and `sre@webforx.global`. | S | SRE |
| E00-S1-T8 | Document rotation cadence | Quarterly rotation calendar for all secrets. Primary/secondary key fallback for HMAC. | `docs/runbooks/secrets.md` table of secrets → owners → rotation date. | Include `HASH_SECRET_PRIMARY` + `HASH_SECRET_SECONDARY` plan. | S | SRE |

## Story E00-S2 — CI/CD activated, branch protection enforced

**Outcome:** Every PR runs typecheck, lint, unit, e2e smoke, SAST, dependency scan, and secret scan. `main` requires PR + 1 reviewer + green CI.

**Acceptance criteria:**
- `.github/workflows/ci.yml` runs on `pull_request` and `push` to `main`/`develop`.
- Jobs: `install` → `typecheck` → `lint` → `test` → `e2e:smoke` → `sast` (CodeQL) → `deps` (`pnpm audit`) → `secrets` (`gitleaks`).
- Forgejo branch protection on `main`: PR required, 1 reviewer, all checks must pass, no force push.
- Failing CI blocks merge.

### Tasks
| ID | Subject | Description | Deliverables | Expectations | Estimate | Dep |
|---|---|---|---|---|---|---|
| E00-S2-T1 | Activate CI workflow | Switch `.github/workflows/ci.yml` from `workflow_dispatch` to PR + push triggers. Cache `pnpm` store. Concurrency group per branch. | Updated YAML; first green run. | Cache key keyed on `pnpm-lock.yaml`. | S | — |
| E00-S2-T2 | Add CodeQL SAST | Add `github/codeql-action/init@v3` + `analyze@v3` step. Languages: `javascript-typescript`. | Workflow file; CodeQL alerts visible. | Fail PR on any `high` or `critical`. | S | E00-S2-T1 |
| E00-S2-T3 | Add gitleaks secret scanner | Add `gitleaks/gitleaks-action@v2`. Tune `.gitleaks.toml` to allow `.env.example`. | Workflow + config file. | False-positives logged but do not block (warn). | XS | E00-S2-T1 |
| E00-S2-T4 | Add Playwright smoke e2e | Add `e2e:smoke` script running only `e2e/00-smoke.spec.ts`: landing renders, waitlist returns 202, `/api/health` 200. | New spec + workflow step with `npx playwright install --with-deps chromium`. | <90s total. Block merge if red. | S | E00-S2-T1 |
| E00-S2-T5 | Mirror CI to Forgejo Actions | Port the same workflow into `.forgejo/workflows/ci.yaml`. | YAML committed. | Forgejo is canonical for production deploys — match jobs exactly. | S | E00-S2-T1 |
| E00-S2-T6 | Branch protection on `main` | In Forgejo: require PR, 1 reviewer, all status checks pass, no force push. | Settings screenshot in `docs/runbooks/branch-protection.md`. | Mirror on GitHub `origin/main`. | XS | E00-S2-T5 |

## Story E00-S3 — Legal & compliance engagement started

**Outcome:** Nigerian gaming counsel retained; NLRC opinion letter requested; NDPA / NDPR registration filing initiated.

**Acceptance criteria:**
- Retainer agreement signed with a Nigerian gaming-law firm.
- Opinion-letter brief submitted asking: "Is a non-bookmaker, AI-prediction + affiliate platform a regulated activity under NLRC, and if so under which licence category? Recommended advertising-standards posture."
- NDPA Data Controller registration form filed.
- DPO appointed (fractional acceptable).

### Tasks
| ID | Subject | Description | Deliverables | Estimate | Owner |
|---|---|---|---|---|---|
| E00-S3-T1 | Retain Nigerian gaming counsel | Shortlist 3 firms; pick one. Sign retainer. | Signed PDF in legal vault; firm contact in PM tool. | M | CTO + PM |
| E00-S3-T2 | Submit NLRC opinion-letter brief | Draft brief; counsel files. | Filed brief; ETA estimate. | S | Counsel |
| E00-S3-T3 | NDPA Data Controller registration | File via NDPC portal. | Acknowledgement receipt. | S | DPO |
| E00-S3-T4 | Draft public advertising standards posture | One-page internal doc: prohibited claims, required disclosures. | `docs/compliance/advertising-posture.md`. | S | PM + Counsel |

## Story E00-S4 — Stale `.git/index.lock` cleared, dev environment validated

**Outcome:** All engineers can clone, run, and pass the `Engineer Local Deploy` checklist in `README.md`.

### Tasks
| ID | Subject | Description | Estimate |
|---|---|---|---|
| E00-S4-T1 | Clear stale `.git/index.lock` on shared dev machine | One-off cleanup. | XS |
| E00-S4-T2 | Verify `pnpm install && pnpm -F @apexpredix/web build` succeeds on a fresh clone | Document any required corepack or Node version pin. | XS |
| E00-S4-T3 | Provision shared Neon dev DB (free tier) + share via vault | Single DB shared across engineers in S0; per-engineer branches enabled in S1. | S |
| E00-S4-T4 | Write `CONTRIBUTING.md` | Branching model, commit convention (Conventional Commits), PR template, review SLA (24h). | S |

---

# EPIC-01 — Identity & Subscription Foundation

**Sprint:** S1 · **Owner role:** BE lead + FE support
**Goal:** Real user accounts with sessions, profile, and an entitlement model the rest of the app reads from.

## Story E01-S1 — Email/password + magic-link auth

**Description:** Use **Auth.js v5** (a.k.a. NextAuth v5) with Email + Credentials providers, sessions backed by Prisma adapter on Neon.

**Acceptance criteria:**
- Routes `/[locale]/signup`, `/[locale]/login`, `/[locale]/verify-email`, `/[locale]/forgot-password`, `/[locale]/reset-password` exist and render.
- New `User`, `Account`, `Session`, `VerificationToken` (rename existing) Prisma models per Auth.js v5 schema.
- Passwords hashed with `argon2id` (work factor ≥ 19 MiB, iterations 2, parallelism 1). bcrypt is rejected.
- Sessions stored server-side, 30-day TTL, rotate on privilege change.
- Lockout after 5 failed attempts/15 min (KV-backed).
- All auth events written to `AuditLog` (`auth.signup`, `auth.login.success`, `auth.login.fail`, `auth.logout`, `auth.lockout`, `auth.password.reset`).

### Tasks
| ID | Subject | Description | Deliverables | Expectations | Estimate |
|---|---|---|---|---|---|
| E01-S1-T1 | Add Auth.js v5 + Prisma adapter | `pnpm add next-auth@beta @auth/prisma-adapter argon2`. Wire `[...nextauth]` route handler. | `app/api/auth/[...nextauth]/route.ts`; provider config. | Use `argon2id`, not bcrypt. | M |
| E01-S1-T2 | Extend Prisma schema with `User`, `Account`, `Session` | Conform to Auth.js v5 + add `locale`, `region`, `kycStatus`, `rgFlags Json`, `disabledAt`. Rename existing `VerificationToken`. | Migration + generated client. | Keep `Citext` on email. | M |
| E01-S1-T3 | Signup + verify-email flow | New `/[locale]/signup` → POST `/api/auth/signup` → email via Resend → `/[locale]/verify-email?token=…`. | Pages, route, email template. | Anti-enumeration: same response for new vs. existing email. | M |
| E01-S1-T4 | Login + lockout | `/[locale]/login` with credentials + magic-link option. 5-strike lockout in KV. | Page + route + KV helper. | Lockout key: `auth:lockout:<emailHash>:<ipHash>` 15-min sliding window. | S |
| E01-S1-T5 | Forgot/reset password | Email a tokenised reset link. | Pages + routes + email template. | Reset invalidates all sessions for that user. | S |
| E01-S1-T6 | AuditLog model + write helper | `AuditLog` model; `logAudit(actor, action, target, meta)` helper. Wire into every auth event. | Model + helper + tests. | Use Prisma `$transaction` to avoid losing audit entries on partial failure. | S |
| E01-S1-T7 | E2E auth tests | Playwright: signup → verify → login → lockout → reset → re-login. | `e2e/03-auth.spec.ts`. | Mock Resend in CI. | S |

## Story E01-S2 — Google OAuth (one-tap)

**AC:** Google provider live in `Account` table; UI button on signup + login; account-link if email matches an existing record.

### Tasks
- E01-S2-T1 — Register Google OAuth client (test + prod redirect URIs). `XS` — PM.
- E01-S2-T2 — Add Google provider config. `XS` — BE.
- E01-S2-T3 — Account-linking on email match. `S` — BE.
- E01-S2-T4 — E2E for Google flow (mocked). `S` — QA.

## Story E01-S3 — Subscription model + entitlement middleware

**Description:** Introduce `Subscription` model. Build a middleware (or RSC helper) that resolves a user's effective entitlement from `Subscription.tier` and a feature-flag table; pages and APIs read from a single `getEntitlements(userId)` helper.

**AC:**
- `Subscription` model exists with: `userId`, `tier` (enum: `FREE` / `WEEKLY` / `MONTHLY` / `YEARLY`), `status`, `provider`, `providerCustomer`, `providerSub`, `currentPeriodEnd`, `cancelAt`.
- `lib/entitlements.ts` exposes typed `entitlementsFor(user)` returning `{ picksPerDay, valueBets, alerts, kelly, warRoom, telegram, whatsapp, calibrationDepthDays }`.
- All UI gating reads from `useEntitlements()` (client) or `entitlementsFor(user)` (server). No hardcoded "Unlocked" string anywhere.
- A free user gets exactly 2–3 picks/day, no value-bets, no Telegram, no Kelly tool, 30-day backtest.

### Tasks
- E01-S3-T1 — Prisma `Subscription` model + migration. `S` — BE.
- E01-S3-T2 — Tier enum + entitlement matrix (Zod-validated) in `data/pricing.json`. `S` — BE.
- E01-S3-T3 — `lib/entitlements.ts` + `useEntitlements()` hook. `S` — BE.
- E01-S3-T4 — Replace `/[locale]/dashboard` hardcoded KPIs with entitlement-aware "Demo / Real" branching. `S` — FE.
- E01-S3-T5 — Replace `Premium` section "Unlocked" copy with tier-aware UI. `S` — FE + DES.
- E01-S3-T6 — Unit tests for `entitlementsFor` per tier × every feature. `S` — QA.

## Story E01-S4 — Account & RG settings page

**AC:** `/[locale]/account` shows: profile, change password, sessions list (with revoke), language, region, RG settings (self-exclude, cool-off, advisory deposit cap). Logout-all.

### Tasks
- E01-S4-T1 — Account profile page + form. `S` — FE.
- E01-S4-T2 — Sessions list + revoke action. `S` — BE+FE.
- E01-S4-T3 — RG flags UI: self-exclude radio (24h / 7d / 30d / permanent); cool-off; advisory deposit cap; "I am 18+" reaffirmation. Persist to `User.rgFlags` and emit `rg.selfExclude.start` audit event. `M` — FE+BE.
- E01-S4-T4 — `Suspended` server-component banner that suppresses all picks UI when `rgFlags.selfExcludedUntil > now`. `S` — FE.

---

# EPIC-02 — Payments (Paystack first, Flutterwave fallback)

**Sprint:** S1 (overlap with E01) · **Owner role:** BE lead + DES
**Goal:** A user can subscribe to Edge Weekly / Monthly / Yearly via Paystack and the app reflects entitlement within ≤30 seconds of webhook receipt.

## Story E02-S1 — Paystack checkout integration (test mode)

**AC:**
- `/[locale]/billing/checkout?tier=monthly` initiates a Paystack inline checkout (NGN).
- On success, the server creates a `Subscription` row in `trialing` status if a trial applies, else `active`.
- `redirect_url` returns to `/[locale]/billing/thanks`.
- Idempotency keys prevent duplicate subs if the user double-clicks.

### Tasks
- E02-S1-T1 — Server route `/api/billing/checkout` (POST). Tier from query; build Paystack init call; return `authorization_url`. `S` — BE.
- E02-S1-T2 — Inline-checkout page (`/[locale]/billing/checkout`) + UI for plan summary, currency note. `S` — FE+DES.
- E02-S1-T3 — Idempotency: store `requestId` in KV for 10 min; reject duplicates. `S` — BE.
- E02-S1-T4 — `billing/thanks` page reading `?reference=…` and showing pending/active state until webhook arrives. `S` — FE.

## Story E02-S2 — Paystack webhook (subscriptions canonical source)

**AC:**
- `/api/billing/webhook/paystack` verifies HMAC `X-Paystack-Signature`.
- Events handled idempotently: `subscription.create`, `subscription.disable`, `invoice.create`, `invoice.payment_failed`, `charge.success`, `charge.failed`.
- `Subscription.status` is derived **only** from provider events; client state never trusted.
- Failed webhooks are re-fired by Paystack — handler must be safe on duplicate delivery.

### Tasks
- E02-S2-T1 — Webhook signature verification. `S` — BE.
- E02-S2-T2 — Event router (switch on `event`) with one handler per event. `M` — BE.
- E02-S2-T3 — Persist `WebhookDelivery` row keyed on `event.id` for replay/dedup. `S` — BE.
- E02-S2-T4 — Audit log entry per event. `XS` — BE.
- E02-S2-T5 — Manual entitlement-fix admin endpoint (gated to admin role) for support. `S` — BE.
- E02-S2-T6 — Replay simulator (CLI script that POSTs canned events). `S` — BE.

## Story E02-S3 — Dunning + cancel-at-period-end

**AC:** Past-due users keep entitlement until `currentPeriodEnd`. `/api/billing/cancel` schedules cancellation. Three reminder emails on dunning (T+1d, T+3d, T+7d).

### Tasks
- E02-S3-T1 — `currentPeriodEnd` recomputed from `invoice.create`. `S` — BE.
- E02-S3-T2 — Cancel API + UI button. `S` — BE+FE.
- E02-S3-T3 — Dunning emails (Resend templates). `S` — BE+DES.
- E02-S3-T4 — Soft suspend at period end if not renewed; UI banner; downgrade to Free. `S` — BE+FE.

## Story E02-S4 — Flutterwave fallback (feature-flagged)

**AC:** A `BILLING_PROVIDER` env toggles between `paystack` / `flutterwave`. Same `getCheckoutUrl()` and `verifyWebhook()` interfaces.

### Tasks
- E02-S4-T1 — Provider adapter interface `lib/billing/provider.ts`. `S` — BE.
- E02-S4-T2 — Flutterwave adapter (test keys). `M` — BE.
- E02-S4-T3 — Switch tests for both providers. `S` — QA.

---

# EPIC-03 — Data Ingestion v2 (Queue + Workers + Odds)

**Sprint:** S2 · **Owner role:** BE lead + SRE
**Goal:** Replace the single daily Vercel cron with Upstash QStash workers. Add a secondary fixtures provider and an aggregated odds provider. No more "MODEL fair price" labelled as odds.

## Story E03-S1 — Cron → QStash worker decomposition

**AC:**
- Six workers exist: `fixture-sync`, `odds-ingest`, `prediction`, `settlement`, `backtest`, `notify`. Each has its own route under `/api/workers/<name>` and is invoked by QStash on schedule.
- Each worker is idempotent. Exponential backoff retries (max 5).
- `AgentHeartbeat` table records each run with `agentId`, `status`, `message`, `durationMs`, `errorClass`.
- `/api/cron/daily-refresh` is removed; deploy of S2 = removal commit.

### Tasks
- E03-S1-T1 — QStash schedule registration script (`scripts/qstash-register.ts`). `S` — SRE.
- E03-S1-T2 — `fixture-sync` worker. Reads `FOOTBALL_DATA_COMPETITIONS`. Adds 7-second jitter between provider calls. `M` — BE.
- E03-S1-T3 — `odds-ingest` worker. Pulls from The Odds API for covered fixtures within the next 48h. `M` — BE.
- E03-S1-T4 — `prediction` worker. Iterates fixtures lacking a snapshot in last 6h; runs the model; writes `PredictionSnapshot`. `M` — BE+ML.
- E03-S1-T5 — `settlement` worker. Fetches finished fixtures; writes `FixtureResult`. `S` — BE.
- E03-S1-T6 — `backtest` worker. Calls `runBacktest(prisma, { windowDays: 90 })`. `S` — BE.
- E03-S1-T7 — `notify` worker (placeholder, wires up E06 in S3). `S` — BE.
- E03-S1-T8 — Shared `runWorker(name, fn)` wrapper with timing + audit + heartbeat. `S` — BE.
- E03-S1-T9 — Remove `/api/cron/daily-refresh`. `XS` — BE.

## Story E03-S2 — Secondary fixtures provider (Sportmonks / API-Football)

**AC:**
- A pluggable `FixturesProvider` interface with `primary` (Football-Data) and `secondary` (Sportmonks Bronze) implementations.
- If primary fails 3× consecutively with 4xx/5xx, secondary auto-engages and a Sentry warning is emitted.
- Coverage gap (e.g. NPFL) declared explicitly in `data/competitions.ts`.

### Tasks
- E03-S2-T1 — Provider interface + adapter for Football-Data. `S` — BE.
- E03-S2-T2 — Sportmonks adapter. `M` — BE.
- E03-S2-T3 — Failover state machine (last-known-good + cool-down). `S` — BE.
- E03-S2-T4 — `docs/runbooks/provider-failover.md`. `S` — SRE.

## Story E03-S3 — Aggregated bookmaker odds

**AC:**
- `OddsProvider` interface + adapter for The Odds API (primary) covering 1X2 market for covered fixtures.
- `Odds.bookCode` populated with real values: `sportybet`, `bet9ja`, `onexbet`, `betking`, `msport`, plus `pinnacle` (sharp reference). Where The Odds API does not surface a NG book, a manual-upload tool fills the gap for NPFL.
- The model's `MODEL` fair-price entries are removed from `Odds`.

### Tasks
- E03-S3-T1 — The Odds API adapter; map their `bookmakers.key` → our `bookCode`. `M` — BE.
- E03-S3-T2 — Admin route `/api/admin/odds/upload` for CSV NPFL odds. `M` — BE.
- E03-S3-T3 — Migration: delete legacy `bookCode = 'MODEL'` rows; ensure model still functions when no real odds present (returns `valueBet = false`). `S` — BE+ML.
- E03-S3-T4 — Unit + integration tests for the Odds API mapping. `S` — QA.

## Story E03-S4 — Match-day enrichment: weather + injuries

**AC:**
- `prediction` worker enriches each fixture with: kickoff weather (OpenWeather), injury count + impact (RotoWire-lite or curated feed), referee tendencies if available.
- New `FixtureEnrichment` model storing `weatherJson`, `injuriesJson`, `refereeJson`, `capturedAt`.
- Prediction narrative includes weather/injury when material (e.g., > 20 km/h wind, > 2 starting-XI injuries on either side).

### Tasks
- E03-S4-T1 — `FixtureEnrichment` model. `XS` — BE.
- E03-S4-T2 — OpenWeather adapter (kickoff venue if available). `S` — BE.
- E03-S4-T3 — Injury feed adapter (RotoWire or curated JSON). `M` — BE.
- E03-S4-T4 — Narrative generator updated to surface enrichment when material. `S` — BE.

---

# EPIC-04 — Prediction Engine v2

**Sprint:** S2 · **Owner role:** ML lead + BE support
**Goal:** Replace the simple standings-driven ensemble with a calibrated XGBoost classifier blended with Dixon-Coles. Publish calibration metrics live.

## Story E04-S1 — Feature pipeline

**AC:**
- A Python module (`packages/ml/features/`) produces a feature vector per fixture: Elo with home edge, Dixon-Coles params, recent form (last 5/10), strength-of-schedule, head-to-head, injuries (impact-weighted), travel days, weather, referee tendency, market-consensus closing line.
- Output written to a `FixtureFeatures` table.

### Tasks
- E04-S1-T1 — `packages/ml` Python sub-workspace; uv/poetry config. `S` — ML.
- E04-S1-T2 — Elo updating with `K=20`, home-edge `60`, competition-strength normalization. `M` — ML.
- E04-S1-T3 — Dixon-Coles fit on rolling 365-day window. `M` — ML.
- E04-S1-T4 — Recent-form features (5/10 game window, SoS-adjusted). `M` — ML.
- E04-S1-T5 — Injury / weather / referee feature extractors. `M` — ML.
- E04-S1-T6 — Write to `FixtureFeatures` via Prisma client (Python `prisma-client-py`) OR via a thin Node ingest API. `S` — ML+BE.

## Story E04-S2 — Train + serve XGBoost classifier

**AC:**
- Training script targets `1`/`X`/`2` (and `O/U 2.5`, `BTTS` as stretch). Calibrated with Platt scaling.
- Trained model pickled to S3-compatible object storage (Cloudflare R2 free 10 GB).
- A stateless serving endpoint on Modal (or a Vercel Function with model loaded from R2 on cold start, < 200 ms warm) returns `{ probabilities, drivers[] }`.

### Tasks
- E04-S2-T1 — Train/test split: time-based 80/20, no leakage. `S` — ML.
- E04-S2-T2 — XGBoost training + Platt calibration. `M` — ML.
- E04-S2-T3 — Model versioning: `models/v<semver>/model.pkl` in R2; `MODEL_VERSION` env points to active version. `S` — ML+SRE.
- E04-S2-T4 — Serving endpoint (Modal free tier OR Vercel Edge function with R2 fetch). `M` — ML+BE.
- E04-S2-T5 — `prediction` worker switches from local `model.ts` to remote endpoint. `S` — BE.
- E04-S2-T6 — Keep `lib/prediction-engine/model.ts` as the fallback if endpoint is unreachable; log a Sentry warning. `S` — BE.

## Story E04-S3 — Calibration & evaluation surfaced publicly

**AC:**
- `/methodology` page renders the latest `PredictionBacktestRun` with: rolling 90-day hit rate by confidence bucket, calibration plot (predicted vs. observed), Brier score, log-loss, ROI at flat-stake + ¼-Kelly.
- The calibration plot and bucket table refresh whenever `backtest` worker runs.

### Tasks
- E04-S3-T1 — Server-render the methodology page from latest `PredictionBacktestRun` + `PredictionCalibrationBucket`. `S` — FE+BE.
- E04-S3-T2 — Calibration plot component (Recharts or D3) — predicted vs. observed line with confidence bands. `M` — FE.
- E04-S3-T3 — Per-bucket hit-rate table + sample-size column. `S` — FE.
- E04-S3-T4 — Copy rewrite: remove all "win rate" language; install "calibrated probability + edge" language. `S` — DES + PM.

## Story E04-S4 — Per-market expansion (O/U + BTTS)

**AC:** Snapshots cover `1X2`, `O/U 2.5`, `BTTS YES/NO`. Each gets its own value-bet check against best book price.

### Tasks
- E04-S4-T1 — Schema: `market` enum widened to include `O25_OVER`, `O25_UNDER`, `BTTS_YES`, `BTTS_NO`. Migration. `S` — BE.
- E04-S4-T2 — Model output extended; serving endpoint contract updated. `M` — ML.
- E04-S4-T3 — Match-detail UI shows multi-market table. `M` — FE.

---

# EPIC-05 — Product UX

**Sprint:** S3 · **Owner role:** FE lead + DES
**Goal:** Real product surface that converts free → paid and retains.

## Story E05-S1 — Onboarding (4 steps)

**AC:** New users complete: (1) pick favourite leagues, (2) notification prefs, (3) region, (4) review first 3 picks. Skippable but bounce-tracked.

### Tasks
- E05-S1-T1 — `/[locale]/onboarding/[step]` wizard. `M` — FE+DES.
- E05-S1-T2 — `User.preferences Json` field + API. `S` — BE.
- E05-S1-T3 — Picks recommendation engine reads preferences. `S` — BE.
- E05-S1-T4 — Step analytics in PostHog. `S` — FE.

## Story E05-S2 — Dashboard rewrite (real per-user)

**AC:** Dashboard reads from `UserPick` ledger. KPI tiles: lifetime ROI (flat stake), 30d ROI, hit rate by bucket, Brier vs. baseline, streak. Hardcoded numbers and demo state are removed.

### Tasks
- E05-S2-T1 — `UserPick` model + migration. `S` — BE.
- E05-S2-T2 — `POST /api/picks` (track a pick), `POST /api/picks/[id]/settle` (manual override), auto-settle on `FixtureResult.upsert`. `M` — BE.
- E05-S2-T3 — Dashboard UI rewrite. `M` — FE.
- E05-S2-T4 — Per-user backtest tile (uses `PredictionEvaluation` joined to `UserPick`). `S` — BE+FE.

## Story E05-S3 — Match detail rewrite

**AC:** `/predictions/[id]` shows: live odds table across NG books with our best-price highlighted, model probability + edge per market, calibrated confidence, ¼-Kelly stake (Pro), explainable narrative with feature drivers, weather + injury bullets, JSON-LD `SportsEvent` rich-result.

### Tasks
- E05-S3-T1 — UI redesign + Figma handoff. `M` — DES.
- E05-S3-T2 — Server component fetching fixture + enrichment + odds + snapshot. `M` — FE+BE.
- E05-S3-T3 — Value-bet chip + tooltip explaining edge. `S` — FE.
- E05-S3-T4 — Kelly stake calculator (Pro). `S` — FE.
- E05-S3-T5 — Bookmaker deeplink with affiliate UTM (gated on `affiliateCode` present). `S` — BE+FE.

## Story E05-S4 — Referral funnel

**AC:** `/account/referrals` shows the user's `referralToken`, total signups, total verified, total converted-to-paid. Verified referral grants 7 days of Edge Weekly to the referrer.

### Tasks
- E05-S4-T1 — Wire existing `WaitlistSignup.referralToken` into `User`. `S` — BE.
- E05-S4-T2 — Reward grant job: on `user.verifiedAt` event, if `referredByToken` non-null and within 30d window, push 7-day grant on referrer. `S` — BE.
- E05-S4-T3 — Referrals UI page. `S` — FE+DES.

## Story E05-S5 — Bookmakers data + affiliate link tracking

**AC:** `Bookmaker` model in DB (replaces `bookmakers.json`); each has `affiliateUrlTemplate`, `affiliateNetwork`, `defaultUtm`. Outbound clicks tracked in `AffiliateClick`.

### Tasks
- E05-S5-T1 — `Bookmaker` model + seed migration. `S` — BE.
- E05-S5-T2 — `AffiliateClick` model + `GET /go/<bookCode>?fixtureId=…&market=…` redirect endpoint with hashed IP + UA. `S` — BE.
- E05-S5-T3 — Reconciliation script comparing our click ledger to affiliate-network exports (weekly). `M` — BE.

---

# EPIC-06 — Notifications

**Sprint:** S3 · **Owner role:** BE + DES
**Goal:** Daily picks + value-bet alerts arrive on email, Telegram, and (Pro) push.

## Story E06-S1 — Email digest (Free + Pro)

**AC:** Daily 06:30 WAT (05:30 UTC) email lists the top picks for the next 36h. Free users see top 3; Pro users see all + value bets. Unsubscribe + preference link in every email.

### Tasks
- E06-S1-T1 — Resend template (`apps/web/emails/DailyDigest.tsx`). `S` — DES+BE.
- E06-S1-T2 — `notify` worker tick at 05:30 UTC; iterate subscribed users; send. `M` — BE.
- E06-S1-T3 — Unsubscribe handler + preference page. `S` — BE+FE.
- E06-S1-T4 — Bounce / complaint webhook from Resend → flag user, suppress further sends. `S` — BE.

## Story E06-S2 — Telegram bot (Free channel + Pro DM)

**AC:** A public `@ApexPredictNG` channel posts 2 free picks at 07:00 WAT. Pro users `/start` the bot to receive value-bet DMs in real time.

### Tasks
- E06-S2-T1 — Register bot; generate token. `XS` — PM.
- E06-S2-T2 — `notify` worker posts to channel. `S` — BE.
- E06-S2-T3 — Pro user linking flow: `/start <linkToken>` ↔ `User.telegramChatId`. `M` — BE.
- E06-S2-T4 — Value-bet alert DM when `prediction` worker flags an edge ≥ 3% for any covered fixture in the next 6h. `S` — BE.

## Story E06-S3 — WhatsApp Business hook (stub for v1.1)

**AC:** Feature-flagged off in v1; collect WhatsApp opt-in numbers; do not send.

### Tasks
- E06-S3-T1 — Profile field + UI. `XS` — FE.
- E06-S3-T2 — Persist opt-in audit event. `XS` — BE.

---

# EPIC-07 — Compliance & Responsible Gaming

**Sprint:** S4 · **Owner role:** BE + Counsel + DPO
**Goal:** Pass an NLRC + NDPA inspection.

## Story E07-S1 — KYC at Pro signup (Smile ID)

**AC:** Any user attempting to start an Edge subscription is routed through Smile ID. Pass → `User.kycStatus = verified`. Fail → manual review queue. Pro entitlement blocked until verified.

### Tasks
- E07-S1-T1 — Smile ID server SDK integration. `M` — BE.
- E07-S1-T2 — KYC modal UI (NIN / BVN / DL / Voters). `M` — FE+DES.
- E07-S1-T3 — Manual review admin queue. `M` — BE+FE.
- E07-S1-T4 — Audit + Sentry events on every KYC outcome. `S` — BE.

## Story E07-S2 — Self-exclusion (functional)

**AC:** A user choosing self-exclude is fully blocked from all picks UI + email + Telegram for the chosen window. Self-exclusion is irreversible within the active window.

### Tasks
- E07-S2-T1 — `Suspended` middleware (server) and `useSuspended()` (client). `S` — BE+FE.
- E07-S2-T2 — Email + Telegram suppression at `notify` worker. `S` — BE.
- E07-S2-T3 — Locked confirmation modal; legal copy. `S` — FE+DES+Counsel.

## Story E07-S3 — Audit log immutable

**AC:** `AuditLog` is append-only at the DB role level (`app_rw` cannot `UPDATE` or `DELETE`). RLS policies enforce that users only read their own entries.

### Tasks
- E07-S3-T1 — Neon role split: `app_rw`, `app_ro`, `app_admin`, `auditor`. `S` — SRE+BE.
- E07-S3-T2 — RLS policies on `AuditLog`, `UserPick`, `Subscription`, `User`. `M` — BE.
- E07-S3-T3 — Quarterly export to S3-compatible cold storage (R2). `S` — SRE.

## Story E07-S4 — Cookie consent v2 + NDPA banner refresh

**AC:** Banner version bumped; previous consent invalidated; first-party + third-party categories listed; granular opt-in for analytics + Telegram.

### Tasks
- E07-S4-T1 — Increment `CONSENT_VERSION`; force re-banner on bump. `XS` — FE+BE.
- E07-S4-T2 — Update legal mdx in `content/legal/`. `S` — Counsel+FE.

---

# EPIC-08 — SEO & Content

**Sprint:** S3 (carry into S4) · **Owner role:** FE + DES + PM
**Goal:** ≥ 500 indexable programmatic leaf pages live; structured-data clean; hreflang valid.

## Story E08-S1 — Programmatic leaf pages

**AC:** Routes generated and rendered with real data: `/free-tips/[league]/[date]`, `/team/[slug]`, `/h2h/[a]-vs-[b]`, `/competition/[slug]/predictions`, `/competition/[slug]/table`. Each has unique `<h1>`, canonical tag, `OpenGraph`, JSON-LD `SportsEvent` or `SportsTeam`.

### Tasks
- E08-S1-T1 — `lib/seo/routes.ts` route catalog + URL helpers. `S` — FE.
- E08-S1-T2 — `[league]/[date]` page + ISR (1h revalidate). `M` — FE+BE.
- E08-S1-T3 — `team/[slug]` page (form, last 5, calibration history). `M` — FE.
- E08-S1-T4 — `h2h/[a]-vs-[b]` page. `M` — FE.
- E08-S1-T5 — `competition/[slug]/predictions` + `table` pages. `M` — FE.
- E08-S1-T6 — Static "no fixtures" fallback per page to avoid soft-404. `S` — FE.

## Story E08-S2 — DB-driven sitemap + hreflang

**AC:** `sitemap.xml` enumerates every leaf URL with `lastmod` derived from `Fixture.updatedAt` or content `mtime`. `hreflang` set on each multi-locale page; `x-default` to English.

### Tasks
- E08-S2-T1 — Replace static sitemap with `sitemap.ts` DB-driven. `S` — BE.
- E08-S2-T2 — `hreflang` injector for app layout. `S` — FE.
- E08-S2-T3 — Google Search Console submit + validate. `S` — PM.

## Story E08-S3 — Blog scaffold + first 6 posts

**AC:** `/[locale]/blog` and `/[locale]/blog/[slug]` exist. 6 launch-window posts published: NPFL guide, "how we measure model accuracy," value-bet 101, bankroll discipline, AFCON 2026 preview, Premier League opening weekend preview.

### Tasks
- E08-S3-T1 — MDX content pipeline + frontmatter schema. `S` — FE.
- E08-S3-T2 — Blog list + detail pages. `S` — FE+DES.
- E08-S3-T3 — 6 posts authored (English) — owner: PM + freelance writer. `XL` — PM.

---

# EPIC-09 — Security & Reliability

**Sprint:** S0 setup + S4 hardening · **Owner role:** SRE + BE
**Goal:** No `high`/`critical` SAST findings; pass external pen-test; LCP p75 < 2.5s on mid-3G; status page live.

## Story E09-S1 — RLS on Neon (foundational)

**AC:** Every user-scoped table has `auth.uid()` row-level policies; integration tests prove a user cannot read another user's data via the Prisma layer.

### Tasks
- E09-S1-T1 — Enable RLS on `User`, `Subscription`, `UserPick`, `AuditLog`, `AffiliateClick`. `M` — BE+SRE.
- E09-S1-T2 — `lib/db/auth-context.ts` to set `auth.uid()` per request. `S` — BE.
- E09-S1-T3 — Pen-test integration tests (`tests/security/rls.spec.ts`). `S` — QA.

## Story E09-S2 — WAF rules + bot management

**AC:** Cloudflare WAF rules in `cf-rules.json` deployed via API. Bot fight mode on. Rate-limit profiles for `/api/auth/*`, `/api/billing/*`, `/api/waitlist`.

### Tasks
- E09-S2-T1 — Author rules. `S` — SRE.
- E09-S2-T2 — Apply via API + Terraform module. `M` — SRE.
- E09-S2-T3 — Synthetic abuse tests. `S` — SRE.

## Story E09-S3 — External penetration test

**AC:** A reputable firm (proposed: TIM Group, e-Watch, or HackerOne Managed) runs a black-box + grey-box pen-test in week 7; report delivered before launch; all `high`/`critical` findings remediated.

### Tasks
- E09-S3-T1 — RFP + scope. `S` — PM.
- E09-S3-T2 — Engagement window booked (Mon–Fri week 7). `XS` — PM.
- E09-S3-T3 — Remediation sprint (week 7 latter half). `XL` — BE+SRE.

## Story E09-S4 — Load test with k6

**AC:** A k6 script simulates 5k concurrent users + 50 RPS sustained for 30 min hitting landing + predictions + match detail + waitlist. Error rate < 0.5%, p95 latency < 800 ms.

### Tasks
- E09-S4-T1 — k6 script in `tests/load/`. `S` — SRE.
- E09-S4-T2 — Run on staging; capture report. `S` — SRE.
- E09-S4-T3 — Resolve any bottleneck found (DB connection pool, ISR tuning, etc.). `M` — BE+SRE.

## Story E09-S5 — Status page + on-call runbooks

**AC:** `status.apexpredict.ai` (Statuspage.io free / Better Uptime free). Components: Predictions, Billing, Auth, Notifications, Data Providers. Runbooks for each common failure mode (see `docs/runbooks/`).

### Tasks
- E09-S5-T1 — Stand up status page. `S` — SRE.
- E09-S5-T2 — Automation hook so a Sentry "Error budget burned" alert flips a component to "Degraded." `M` — SRE.
- E09-S5-T3 — 7 runbooks: provider outage, payment outage, KYC outage, DB failover, deploy rollback, KV outage, Sentry outage. `M` — SRE.

---

# EPIC-10 — Launch & GTM

**Sprint:** S4 · **Owner role:** PM + DES + GTM lead
**Goal:** Public Nigeria launch on Tuesday 2026-08-04 with measurable funnel and a credible press placement.

## Story E10-S1 — Soft launch (closed beta, 1,000 users)

**AC:** Week of 2026-07-27: 1,000 users invited from waitlist; full feature set live in production; daily standup reviewing funnel; bugs triaged.

### Tasks
- E10-S1-T1 — Beta-invite mailer + tracking. `S` — BE+DES.
- E10-S1-T2 — Daily funnel report: signup → verify → onboarding → first-pick → paid. `S` — PM.
- E10-S1-T3 — Bug-bash schedule + triage owner. `S` — QA.

## Story E10-S2 — PR placements

**AC:** Coordinated coverage in Punch, BusinessDay, TechCabal, Techpoint on launch day (or +1).

### Tasks
- E10-S2-T1 — Press kit (one-pager, screenshots, CEO quote). `S` — PM+DES.
- E10-S2-T2 — Outreach to 4 publications. `S` — PM.
- E10-S2-T3 — Embargo + go-live coordination. `S` — PM.

## Story E10-S3 — Affiliate setup

**AC:** Direct affiliate agreements signed with SportyBet, Bet9ja, 1xBet, BetKing, MSport (whichever respond by 2026-07-28). Deeplinks + tracking codes wired into `Bookmaker` rows.

### Tasks
- E10-S3-T1 — Affiliate outreach + agreement signoff. `XL` — PM.
- E10-S3-T2 — Wire tracking codes into DB. `S` — BE.

## Story E10-S4 — Support runbook + helpdesk

**AC:** A Crisp / Intercom-equivalent (free tier) chat widget on the site. Tier-1 support runbook for top 10 expected questions. Escalation flow.

### Tasks
- E10-S4-T1 — Widget integration. `S` — FE.
- E10-S4-T2 — Tier-1 runbook in `docs/runbooks/support.md`. `S` — PM.

---

# Cross-cutting backlog (not Epic-scoped, drop into the appropriate sprint)

- **Remove `WAITLIST_BASELINE = 14203`** from `app/[locale]/page.tsx`. Replace with real count or hide the metric until count exceeds 5,000 verified signups. `XS` — FE. Sprint **S1**.
- **Fix `apps/web/scripts/capture-reel-stills.ts`** so its visited URL matches dev route (`/dev/stills/<id>` not `/en/dev/stills/<id>`). `XS` — FE. Sprint **S1**.
- **Implement `HASH_SECRET_SECONDARY` verify-on-read fallback** in `lib/hash.ts`. `S` — BE. Sprint **S1**.
- **`/api/health/deep` endpoint** that checks DB, KV, Resend, Football-Data + Sportmonks reachability. `S` — BE. Sprint **S2**.
- **Replace `revalidate = 60` on `/predictions`** with KV-cached payload, same TTL. `S` — BE. Sprint **S2**.
- **Save-Data / prefer-reduced-motion drop of hero reel.** `S` — FE+DES. Sprint **S1** (UX) or **S3** when reel asset is finalized.
- **Drop `es`/`zu` locales** from `messages/`, `i18n/locales.ts`, `i18n/routing.ts`. **Add `ig` locale** if/when gate passes. `S` — FE. Sprint **S3** (post translation-gate sign-off).
- **Remove hardcoded `+14,203` baseline** from the Stats section copy. `XS` — FE. Sprint **S1**.

---

# Backlog summary

| Epic | Sprint(s) | Stories | Approx. effort |
|---|---|---|---|
| E00 — Prep & Foundations | S0 | 4 | 1 week (whole team part-time) |
| E01 — Identity & Subscription | S1 | 4 | ~3.5 dev-weeks |
| E02 — Payments | S1 | 4 | ~2.5 dev-weeks |
| E03 — Data Ingestion v2 | S2 | 4 | ~3.5 dev-weeks |
| E04 — Prediction Engine v2 | S2 | 4 | ~3 ML-weeks + 1 dev-week |
| E05 — Product UX | S3 | 5 | ~4 dev-weeks |
| E06 — Notifications | S3 | 3 | ~1.5 dev-weeks |
| E07 — Compliance & RG | S4 | 4 | ~2.5 dev-weeks |
| E08 — SEO & Content | S3–S4 | 3 | ~2 dev-weeks + writer |
| E09 — Security & Reliability | S0+S4 | 5 | ~3 SRE/BE-weeks + ext. pen-test |
| E10 — Launch & GTM | S4 | 4 | ~2 dev-weeks + PM heavy |

**Total ≈ 28–30 developer-weeks across 6–8 weeks of calendar time.** With a 2 BE + 2 FE + 1 ML + 1 SRE + 1 design configuration the plan fits, but every story marked `M`/`L` should be re-estimated by the assigned engineer before the sprint starts.

---

— *Backlog v1 · Web Forx Global Inc. · Confidential*
