# ApexPredict — Master Prompt for Sprint S1 Autonomous Agent

**Status:** Ready to dispatch as soon as the S1 readiness gate (see `2026-06-04-apexpredict-strategy.md`, "Sprint S0 retrospective + S1 readiness gate") has ≥ 6 of 12 gates green. Recommended minimum subset: gates 1 (Vercel token rotated), 2 (brand spelling — the agent will do this), 3 (Neon migrations applied), 4 (`AUTH_SECRET` set), 11 (branch protection on `main`).

**What this prompt does:** ships six more PRs against `develop`, focused on **scaffolding work that compiles and tests without any paid vendor calls**. Live Paystack / Smile ID / Sportmonks / The Odds API / Upstash runtime traffic is explicitly forbidden — every adapter ships with mocked-call tests and reads keys from env vars that may or may not be populated yet.

**Expected wall-clock:** 4–6 hours.

**PR layout:** PR 1 OPS hygiene · PR 2 Payments + Account · PR 3 Data failover + admin tools · PR 4 Compliance / RG / RLS draft · PR 5 SEO foundation · PR 6 Doc housekeeping.

---

## PROMPT — paste below this line

```
You are a senior DevSecOps + full-stack engineer continuing work on the ApexPredict project (Web Forx Global Inc.). Sprint S0 shipped on 2026-06-07. Now ship Sprint S1's "no-vendor-key-needed" foundation. You work AUTONOMOUSLY — no human review mid-task. Open one Pull Request per scoped group at the end.

==================
0. CONTEXT TO LOAD
==================

Before doing anything else, read these files in order — they are the source of truth and override your assumptions:

  /Users/ocheme/Desktop/ApexPredict/README.md
  /Users/ocheme/Desktop/ApexPredict/CHANGELOG.md
  /Users/ocheme/Desktop/ApexPredict/CONTRIBUTING.md
  /Users/ocheme/Desktop/ApexPredict/docs/strategy/2026-06-04-apexpredict-strategy.md
  /Users/ocheme/Desktop/ApexPredict/docs/strategy/2026-06-04-apexpredict-backlog.md
  /Users/ocheme/Desktop/ApexPredict/docs/strategy/2026-06-04-apexpredict-lean-infra.md
  /Users/ocheme/Desktop/ApexPredict/docs/strategy/2026-06-04-apexpredict-repositioning-copy.md
  /Users/ocheme/Desktop/ApexPredict/docs/strategy/2026-06-04-apexpredict-locale-gate.md
  /Users/ocheme/Desktop/ApexPredict/apps/web/auth.ts
  /Users/ocheme/Desktop/ApexPredict/apps/web/lib/audit.ts
  /Users/ocheme/Desktop/ApexPredict/apps/web/lib/entitlements.ts
  /Users/ocheme/Desktop/ApexPredict/apps/web/lib/auth-guards.tsx
  /Users/ocheme/Desktop/ApexPredict/apps/web/lib/workers/runWorker.ts
  /Users/ocheme/Desktop/ApexPredict/apps/web/lib/providers/fixtures/types.ts
  /Users/ocheme/Desktop/ApexPredict/apps/web/lib/providers/odds/types.ts
  /Users/ocheme/Desktop/ApexPredict/packages/db/prisma/schema.prisma
  /Users/ocheme/Desktop/ApexPredict/apps/web/middleware.ts
  /Users/ocheme/Desktop/ApexPredict/.github/workflows/ci.yml
  /Users/ocheme/Desktop/ApexPredict/.forgejo/workflows/ci.yaml

Then `git -C /Users/ocheme/Desktop/ApexPredict log --oneline -25` and `git status`.

==================
1. SPRINT S0 CONTEXT YOU MUST CARRY FORWARD
==================

S0 already shipped (see CHANGELOG `[Unreleased]` and strategy doc Appendix A):
- CI on PR/push with CodeQL + gitleaks + Playwright smoke. Forgejo CI mirror.
- Auth.js v5 with Prisma adapter, argon2id, signup/login/verify/reset/account pages.
- Prisma models: User, Account, Session, VerificationToken (Auth.js renamed; waitlist uses WaitlistVerificationToken), Subscription, AuditLog, UserPick.
- `lib/entitlements.ts` matrix; `lib/audit.ts` helper; `lib/auth-guards.tsx`.
- Value-bet-signal repositioning copy across Hero, Methodology, Backtest, Premium, HowToUse, Dashboard, emails.
- Locale gate: `es`/`zu` dropped; `yo`/`ha`/`ig` env-flagged (`LOCALE_*_ENABLED=false`), English-only.
- `HASH_SECRET_SECONDARY` verify-on-read; `/api/health/deep`.
- Provider interfaces (`FixturesProvider`, `OddsProvider`), `runWorker` wrapper, widened market enum + Zod schema, synthetic odds never persisted.

S0 leftovers the agent surfaced — DO NOT solve all of them in this run; pick only the ones in scope below:
- ⚠️ Live Vercel token leaked into `apps/web/.vercelrc.json` (now gitignored, never committed). **You will NOT rotate the token (that's an SRE/UI action), but you WILL add `apps/web/.vercelrc.json` to a documented "never commit" checklist in `CONTRIBUTING.md` and add a `pre-commit` guard via gitleaks rule.**
- Brand spelling mismatch: code renders `ApexPredict`, docs say `ApexPredict`. **PR 1 fixes this.**

==================
2. STRATEGIC GUARDRAILS (carry from S0 — these apply to every change)
==================

1. **Positioning** — value-bet signal service, NOT an oracle. Never add "win rate" / "guaranteed" / "sure pick" copy. The forbidden-phrase regex MUST still return zero matches at the end.
2. **Locale gate** — English-only at launch. Do NOT add Pidgin. Do NOT re-enable `yo`/`ha`/`ig` until the gate passes (`docs/strategy/2026-06-04-apexpredict-locale-gate.md`).
3. **Lean-spend rule** — DO NOT make a live call to any paid vendor in this run. That means no Paystack `transaction.initialize`, no Smile ID verification request, no The Odds API fetch, no Sportmonks fetch, no Upstash QStash dispatch, no Modal training run, no Resend send to a real address. Every adapter ships with `nock` / `msw` / `vi.fn` mocked tests. Use the env-var keys for shape only — assume they are unset and the code must compile + tests must pass.
4. **Migrations policy unchanged** — generated SQL only via `prisma migrate dev --create-only`. NEVER auto-apply against Neon. Document the apply command in the PR body.
5. **No regressions** — existing E2E tests must still pass (including the auth e2e shipped in S0). Existing pages must still render in dev.
6. **Commit convention** — Conventional Commits. Co-author tag: `Co-authored-by: Cowork CTO Agent <cto-agent@webforx.global>`.
7. **Branch model** — every PR off `develop`. NEVER push to `main` or `develop`. NEVER force-push.
8. **Quality gate before "done"** (paste output in every PR body):
     pnpm install
     pnpm -F @apexpredix/db generate
     pnpm -F @apexpredix/web typecheck
     pnpm -F @apexpredix/web lint
     pnpm -F @apexpredix/web test
     pnpm -F @apexpredix/web e2e -- e2e/00-smoke.spec.ts
9. **Documentation** — every new module gets JSDoc header. Every new env var added to `apps/web/.env.example` with a comment.
10. **Stopping conditions** — write `BLOCKED.md` at the repo root and stop if:
     - The pnpm install fails or the dev server won't start.
     - SSH push to `git@git.edusuc.net:WEBFORX/apexpredict-platform.git` fails (check `docs/runbooks/forgejo-access.md`).
     - A migration would destroy existing data without a safe path.
     - You discover the requested change conflicts with an S0 shipped decision (e.g., re-enabling Pidgin).

==================
3. SCOPED WORK GROUPS (each = one PR)
==================

Six pull requests, in numeric order. Each PR body MUST follow the S0 PR template (Summary / Tickets closed / Quality gate / Behavioral changes / Migrations / Risks / Out of scope / Screenshots).

----------------------------------------------------------------
PR 1 — `chore/brand-and-security-hygiene` — closes OPS-T2 + soft-closes OPS-T1

Branch: chore/brand-and-security-hygiene off develop

Goal: Unify brand spelling. Add tooling to prevent the `.vercelrc.json` leak recurring.

Concrete deliverables:
  a) Global-replace `ApexPredict` → `ApexPredict` across:
       - all files under `apps/web/{app,components,messages,content,emails,public,scripts}`
       - all files under `packages/{config,types,db,ui,email}`
       - all JSON-LD strings + OG image renderer + sitemap + robots
       - all email subject lines + Telegram bot copy (carry the disclaimer module too)
       - README.md, CHANGELOG.md, CONTRIBUTING.md
     Verify with: `grep -ri "ApexPredict" .` returns zero matches OUTSIDE of historical CHANGELOG entries for [0.1.0] (which is past, leave alone).
  b) Update `package.json` and `apps/web/package.json` `name` field if they reference the old spelling.
  c) Update `prisma/schema.prisma` brand string if present.
  d) Add `apps/web/.vercelrc.json` to `.gitignore` if missing (verify) AND add an explicit `.gitleaks.toml` rule that fails CI if any file matching `*.vercelrc.json` ever gets staged. Test that the rule fires by creating a sample file in a temp branch (delete the test commit before pushing).
  e) Add a "Pre-commit checklist" section to `CONTRIBUTING.md` warning never to commit secrets, `.env.local`, `.vercelrc.json`, or generated artefacts.
  f) Add `docs/runbooks/secrets-incident-response.md` documenting the steps an engineer takes when a secret slips into the repo (rotate, force-purge, audit, notify).

Acceptance:
  - Quality gate green.
  - `grep -ri "ApexPredict" .` returns zero non-historical hits.
  - gitleaks rule for `.vercelrc.json` fires on a synthetic test.
  - PR body explicitly notes: "Vercel token rotation is still a manual SRE action (see runbook); this PR only prevents recurrence."

----------------------------------------------------------------
PR 2 — `feat/payments-scaffold` — closes E02-S1-T1, E02-S1-T2, E02-S1-T3, E02-S1-T4, E02-S2-T1, E02-S2-T2, E02-S2-T3, E02-S2-T5, E02-S4-T1

Branch: feat/payments-scaffold off develop

Goal: Scaffold the entire Paystack subscription flow. No live calls. Webhook signature verification is real; the rest is shaped so wiring live keys in S2/S3 is a one-line env change.

Concrete deliverables:
  a) `apps/web/lib/billing/provider.ts` — Adapter interface:
       export interface BillingProvider {
         name: 'paystack' | 'flutterwave';
         getCheckoutUrl(input: { tier, userId, idempotencyKey }): Promise<{ authorizationUrl, reference }>;
         verifyWebhookSignature(rawBody: string, header: string): boolean;
         parseEvent(rawBody: string): BillingEvent;
       }
     With a `getActiveProvider()` factory that reads `BILLING_PROVIDER` env (default `paystack`).
  b) `apps/web/lib/billing/paystack.ts` — Paystack adapter implementing the interface. `getCheckoutUrl` makes a fetch to `https://api.paystack.co/transaction/initialize` if `PAYSTACK_SECRET_KEY_TEST` is set; otherwise returns a stub `{ authorizationUrl: '/dev/billing-stub', reference: 'STUB-...' }` and logs a warning. `verifyWebhookSignature` uses HMAC-SHA512 with `PAYSTACK_SECRET_KEY_TEST` per Paystack docs.
  c) `apps/web/lib/billing/flutterwave.ts` — Same interface, stub-only for now (throws `not implemented — wire in S2/S3`).
  d) Routes:
       - `POST /api/billing/checkout` — Tier from body; idempotency key from KV (10-min TTL); returns authorizationUrl. Idempotency: if KV is unreachable, skip silently with a Sentry warning (don't reject).
       - `POST /api/billing/webhook/paystack` — Verifies signature; routes events to handlers; idempotent on `event.id` via a new `WebhookDelivery` model.
       - `POST /api/billing/cancel` — Auth'd; schedules `cancelAt = currentPeriodEnd`; emits `subscription.cancel.scheduled` audit.
  e) Pages:
       - `/[locale]/billing/checkout?tier=monthly` — server component that calls `POST /api/billing/checkout` server-side, redirects to authorizationUrl. UI fallback for stub mode renders a dev-banner "Paystack keys not configured; this would redirect in prod."
       - `/[locale]/billing/thanks?reference=…` — Polls subscription state with exponential backoff (1s → 8s); shows "pending" UI until webhook arrives.
       - `/[locale]/billing/cancel` — Confirmation + cancel button.
  f) Prisma migration `add_webhook_delivery_and_subscription_indexes` (generated SQL only):
       - `WebhookDelivery` model — id, provider, eventId (unique), eventType, payload Json, processedAt, createdAt.
       - Add index `(userId, status)` on `Subscription` for the dashboard query in S3.
  g) Event handlers:
       - `subscription.create` → set `Subscription.status = 'active'`, persist `providerSub`.
       - `subscription.disable` → set `status = 'cancelled'`.
       - `invoice.create` → advance `currentPeriodEnd`.
       - `invoice.payment_failed` → set `status = 'past_due'`, schedule dunning emails (PR 5 wires the actual sender; here just enqueue an audit row).
       - `charge.success` / `charge.failed` → audit only.
     All idempotent on `event.id`.
  h) Admin manual entitlement override: `PATCH /api/admin/entitlements/[userId]` gated to `user.kycStatus === 'VERIFIED' && user.role === 'ADMIN'` (you'll add `role` to User in this PR as a simple enum {USER, ADMIN}; default USER). Audit every call.
  i) Webhook replay CLI: `apps/web/scripts/billing-replay.ts` reads a fixture JSON (e.g., `apps/web/scripts/fixtures/paystack-charge-success.json`) and POSTs it to `localhost:3000/api/billing/webhook/paystack` with a valid signature.
  j) Tests:
       - `apps/web/lib/billing/__tests__/paystack.test.ts` — signature verify positive + negative; event parse for 6 event types.
       - `apps/web/app/api/billing/webhook/__tests__/paystack.test.ts` — idempotent on duplicate event.id.
       - `apps/web/e2e/04-billing-stub.spec.ts` — Playwright: hit checkout → stub redirect → simulated webhook → entitlement reflected.
  k) `.env.example` adds: `BILLING_PROVIDER=paystack`, `PAYSTACK_PUBLIC_KEY_TEST=`, `PAYSTACK_SECRET_KEY_TEST=`, `PAYSTACK_WEBHOOK_SECRET=` (Paystack uses the secret key; document the choice).

Acceptance:
  - Quality gate green.
  - `pnpm -F @apexpredix/web build` succeeds.
  - Webhook idempotency proved by replay-CLI test.
  - Stub-mode UI banner visible when Paystack keys are not configured.
  - No live network call in any test.

----------------------------------------------------------------
PR 3 — `feat/data-failover-and-admin-tools` — closes E03-S2-T3, E03-S2-T4, E03-S3-T2

Branch: feat/data-failover-and-admin-tools off develop

Goal: Provider failover state machine + admin CSV upload for NPFL odds. Pure code; no live provider calls.

Concrete deliverables:
  a) `apps/web/lib/providers/failover.ts` — Generic failover wrapper:
       export async function withFailover<T>(name: string, primary: () => Promise<T>, secondary: () => Promise<T>): Promise<T>
     State stored in a small in-memory cache PLUS Upstash Redis under key `provider:health:<name>`. Rules:
       - 3 consecutive 4xx/5xx on primary → switch to secondary.
       - 30-min cool-down before retrying primary.
       - Sentry warning on every switch + log the failure class.
  b) Refactor `apps/web/lib/workers/runWorker.ts` (or whatever the S0 wrapper is named — read the file first) so the `prediction` and `fixture-sync` workers call `withFailover('fixtures', primary, secondary)` instead of the primary directly.
  c) `docs/runbooks/provider-failover.md` — Step-by-step: what happens on switch, how to manually force a switch back, what alerts fire.
  d) `apps/web/lib/odds/csv-import.ts` — Zod schema for NPFL odds CSV: columns `fixture_external_id,bookmaker,market,price,captured_at`. Idempotent: re-importing same rows updates `capturedAt` only.
  e) `POST /api/admin/odds/upload` — Multipart form accepting a CSV. Validates schema. Gated to admin role (uses the role enum from PR 2). Returns `{ inserted, updated, errors[] }`. Audit every upload (file size, row count, error count).
  f) Admin UI: `/[locale]/admin/odds-upload` — minimal page (file picker + drag-drop). Behind `user.role === 'ADMIN'` server guard.
  g) Tests:
       - `apps/web/lib/providers/__tests__/failover.test.ts` — synthetic 3× failure → switch verified; 30-min cool-down respected.
       - `apps/web/lib/odds/__tests__/csv-import.test.ts` — golden-file test with a sample NPFL CSV (~20 rows).
       - Integration: idempotent re-upload doesn't duplicate rows.

Acceptance:
  - Quality gate green.
  - Failover unit test deterministic.
  - Admin route returns 403 for non-admin user (e2e covers this).

----------------------------------------------------------------
PR 4 — `feat/compliance-rg-and-rls-draft` — closes E07-S2-T1, E07-S2-T2, E07-S2-T3, E07-S3-T2 (draft only), E07-S4-T1

Branch: feat/compliance-rg-and-rls-draft off develop

Goal: Functional self-exclusion. RLS policy SQL drafted (not applied). Cookie consent v2 bump.

Concrete deliverables:
  a) Self-exclusion functional API:
       - `POST /api/account/self-exclude` accepts `{ window: '24h' | '7d' | '30d' | 'permanent' }`. Sets `user.rgFlags.selfExcludedUntil = now + window`. Within the active window, the endpoint is REJECTED (irreversibility). Audit `rg.selfExclude.start`.
       - The existing `useSuspended` hook and `assertNotSuspended` server util are already in `lib/auth-guards.tsx` — wire them to read `selfExcludedUntil` (not just a generic `disabledAt`).
  b) Notification suppression: in `lib/audit.ts` add a `isNotificationSuppressed(user)` helper. Wire it into the email digest + Telegram bot stubs (the actual senders come in S3; here just ensure the worker scaffolds check).
  c) Locked confirmation modal: `apps/web/components/compliance/SelfExcludeModal.tsx` with a 3-step confirmation, legal copy from `docs/strategy/2026-06-04-apexpredict-repositioning-copy.md` (compliance footer pattern), and tests.
  d) RLS policy SQL (drafted, NOT applied):
       - `packages/db/sql/rls/2026-06-07-user-scoped-rls.sql` containing:
           ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
           CREATE POLICY user_self ON "User" USING (id = current_setting('app.user_id')::text);
         + same shape for `Subscription`, `UserPick`, `AuditLog`, `Account`, `Session`.
       - Document in `docs/runbooks/rls.md` how to apply (`psql … -f …`) and how `app.user_id` gets set per-request (to be wired in a future PR via `lib/db/auth-context.ts`).
       - Add a placeholder `lib/db/auth-context.ts` with `setAuthContext(prisma, userId)` using `prisma.$executeRaw\`SELECT set_config('app.user_id', ${userId}, true)\``. NOT yet wired into request middleware — that's a future PR.
  e) Cookie consent v2 bump:
       - In `packages/types`, bump `CONSENT_VERSION` from N to N+1.
       - Existing `CookieConsent` rows with `version < CONSENT_VERSION` cause the banner to re-show.
       - Update legal mdx (`content/legal/cookies.mdx`) with the new categories: strictly-necessary, analytics, marketing-future, telegram-notifications. Each category clearly explains what it controls.
       - Counsel sign-off is a future human task; mark the PR body accordingly.
  f) Tests:
       - `apps/web/app/api/account/__tests__/self-exclude.test.ts` — happy path + reject-during-active-window.
       - `apps/web/lib/__tests__/suppression.test.ts` — suspended user → notification suppressed.
       - `apps/web/components/compliance/__tests__/SelfExcludeModal.test.tsx` — 3-step confirmation accessibility (axe).

Acceptance:
  - Quality gate green.
  - Self-exclude UI flow accessible end-to-end (keyboard-only).
  - RLS SQL parses cleanly via `psql --dry-run` (or a Prisma schema validation step).
  - Consent v2 banner re-shows for existing cookies after CI build.

----------------------------------------------------------------
PR 5 — `feat/seo-foundation` — closes E08-S1-T1, E08-S2-T1, E08-S2-T2 + E08-S1-T6

Branch: feat/seo-foundation off develop

Goal: Programmatic-SEO route catalog + DB-driven sitemap + hreflang. Leaf pages themselves (E08-S1-T2..T5) wait for S2/S3 when more fixture data is in Neon.

Concrete deliverables:
  a) `apps/web/lib/seo/routes.ts` — Route catalog + URL helpers:
       export const SEO_ROUTES = {
         freeTips: (league, date) => `/free-tips/${league}/${date}`,
         team: (slug) => `/team/${slug}`,
         h2h: (a, b) => `/h2h/${a}-vs-${b}`,
         competitionPredictions: (slug) => `/competition/${slug}/predictions`,
         competitionTable: (slug) => `/competition/${slug}/table`,
       };
       export function parseLeafPath(path: string): LeafRoute | null { ... };
     With Zod schemas and round-trip parse tests.
  b) DB-driven `app/sitemap.ts`:
       - Reads `Fixture` rows with kickoff in the next 30 days OR finished in the last 90 days.
       - Reads `Team` and `Competition`.
       - Emits one entry per leaf URL with `lastmod` from `updatedAt`.
       - Caps at 50,000 URLs (Google's sitemap limit). If we cross 20,000 in practice, split into `sitemap-index.xml`.
       - ISR `revalidate` 1h.
  c) hreflang injector (`apps/web/lib/seo/hreflang.ts`):
       - For each multi-locale page, emit `<link rel="alternate" hreflang="en" …>` + `x-default`.
       - Locales gated by `LOCALE_*_ENABLED` flags. If only English is enabled, omit alternates entirely (no `x-default`).
       - Add a `<HreflangTags>` server-component used in `app/[locale]/layout.tsx`.
  d) No-data fallback component (`apps/web/components/seo/NoFixturesYet.tsx`) for the future leaf pages — returns a 200 with helpful copy + a CTA back to `/predictions`. Document in `lib/seo/routes.ts` that leaf-page implementations in S2/S3 must use this fallback to avoid soft-404.
  e) Tests:
       - `apps/web/lib/seo/__tests__/routes.test.ts` — round-trip parse for every route shape.
       - `apps/web/app/__tests__/sitemap.test.ts` — extend the existing test with DB-mocked rows.
       - `apps/web/lib/seo/__tests__/hreflang.test.ts` — single-locale skip, multi-locale full set.

Acceptance:
  - Quality gate green.
  - `pnpm -F @apexpredix/web build` succeeds.
  - Manual `curl localhost:3000/sitemap.xml` returns valid XML.
  - Google rich-results test would PASS on a sample leaf URL (you can verify via the structured-data validator's local copy if available; otherwise validate XML schema and JSON-LD object shape).

----------------------------------------------------------------
PR 6 — `chore/strategy-doc-housekeeping-s1` — backlog Status updates + CHANGELOG appendix

Branch: chore/strategy-doc-housekeeping-s1 off develop

Concrete deliverables:
  a) Update `docs/strategy/2026-06-04-apexpredict-backlog.md` Status column on every ticket closed by PRs 1–5.
  b) Update `docs/strategy/2026-06-04-apexpredict-backlog.xlsx` Backlog sheet Status column to match. Bump README sheet to v1.3.
  c) Append a "Sprint S1 — completed by agent on <today>" section to `docs/strategy/2026-06-04-apexpredict-strategy.md` listing the 6 PRs with their branch names and a one-line summary each.
  d) Append entries to `CHANGELOG.md` under `## [Unreleased]` for every substantive change. Group by area (Added / Changed / Security / Compliance).
  e) Add `OPS-T2` to the cross-cutting follow-up list as Done. Keep `OPS-T1` (Vercel token rotation) as In flight (human).

==================
4. STATUS-COLUMN LABELS (same as S0)
==================

  - "Not started"           — default
  - "In flight (agent)"     — this PR addresses it but not closed yet
  - "Done"                  — code merged + tests green + AC met
  - "In flight (human)"     — depends on a human action
  - "Deferred to v1.1"      — out of scope for the 60-day push

==================
5. ORDER OF WORK
==================

Numeric order. Each PR off the latest `develop`. Push each PR as it completes. PRs 1–5 are mostly independent; PR 6 must come last and merge after the others.

==================
6. WHAT YOU MUST NOT DO
==================

- No live calls to Paystack, Smile ID, Sportmonks, The Odds API, Upstash QStash, Modal, or any other paid vendor. Mock everything.
- No hardcoded credentials.
- No changes to `vercel.json` cron config.
- No touching `apps/web/.vercelrc.json` other than to verify it's gitignored.
- No push to `main` or `develop`. Feature branches only.
- No `experimental.typedRoutes` flip.
- No Pidgin locale, no re-enabling `es`/`zu`, no `LOCALE_*_ENABLED=true` flips.
- No win-rate language. Forbidden-phrase grep must return zero non-historical hits.
- No applying Prisma migrations to Neon. Generated SQL only; document the apply command in the PR body.

==================
7. FINAL CHECK BEFORE EACH PR LANDS
==================

- [ ] Branch rebased on current `develop`.
- [ ] Quality gate green (paste output in PR body).
- [ ] No high/critical CodeQL alerts.
- [ ] No new gitleaks findings.
- [ ] No forbidden phrase regex matches.
- [ ] Migrations idempotent.
- [ ] Every new env var documented in `.env.example`.
- [ ] PR body matches the S0 template.

==================
8. WHEN YOU FINISH
==================

Produce a single summary message back to the user with:
  - Links to all six PRs (or branch names if SSH push wasn't possible).
  - One-line status of each backlog ticket closed.
  - Any items the agent found to be already done in code and marked Done without modification.
  - `BLOCKED.md` at the repo root if any blocker hit.

Begin.
```

## END OF PROMPT

---

## What this prompt ships (mapped to backlog)

| PR | Tickets closed |
|---|---|
| PR 1 — Brand + security hygiene | OPS-T2 (brand spelling) + secrets-incident runbook |
| PR 2 — Payments scaffold | E02-S1-T1..T4, E02-S2-T1..T3+T5, E02-S4-T1 |
| PR 3 — Data failover + admin tools | E03-S2-T3, T4, E03-S3-T2 |
| PR 4 — Compliance / RG / RLS draft | E07-S2-T1..T3, E07-S3-T2 (draft only), E07-S4-T1 |
| PR 5 — SEO foundation | E08-S1-T1, E08-S1-T6, E08-S2-T1, E08-S2-T2 |
| PR 6 — Doc housekeeping | Backlog Status updates, CHANGELOG, strategy appendix |

Total backlog tickets touched: ~18 (cumulative with S0: ~41 of 177).

## What this prompt explicitly does NOT do (stays human-blocked)

- E00-S1-T1..T8 — vendor account openings
- E00-S2-T6 — Forgejo branch protection (UI)
- E00-S3-T1..T4 — legal track
- E01-S2-T1 — Google OAuth client registration
- OPS-T1 — Vercel token rotation
- Any S2/S3 work that needs live vendor traffic (Paystack live charge, Smile ID verification, Sportmonks fetch, The Odds API fetch, Telegram bot register, Resend production warm-up, Modal training run)
- E04 ML training — needs data + Modal credit
- E07-S1 — KYC at Pro signup (needs Smile ID prod keys)
- E08-S1-T2..T5 — programmatic leaf pages themselves (need fixtures in Neon)
- E09-S3 — external pen-test
- E10 — launch / GTM

## How to run it

1. Confirm S1 readiness gate ≥ 6 of 12 green (strategy doc § "Sprint S0 retrospective + S1 readiness gate").
2. Open Claude Code (or Claude Agent SDK runtime) in `/Users/ocheme/Desktop/ApexPredict`.
3. Confirm `corepack enable && corepack prepare pnpm@9.12.0 --activate` succeeds.
4. Confirm the SSH key is in place: `ssh -T git@git.edusuc.net` returns a "Hi …!" line.
5. Paste the entire **PROMPT** block above as a single message.
6. Approve tool perms only for filesystem, git, and `npm install` / `pnpm install`. Deny anything that wants to call a paid vendor endpoint.

Expect 4–6 hours. Agent writes `BLOCKED.md` on any blocker.

## When this is done — what's next

After S1 lands, the next agent run can focus on **S2 work that needs live data**:

- Wiring the live Paystack flow (PR 2 of this set ships the scaffold; live keys + the actual checkout call wait for S2).
- QStash worker decomposition (E03-S1-T1..T9) — replaces the daily Vercel cron with the six workers; needs Upstash keys.
- Sportmonks + The Odds API live adapters.
- OpenWeather + injury feed.
- XGBoost training + Modal endpoint (E04 ML).

Those are blocked on vendor keys. As gates 5–10 of the S1 readiness gate flip green, the next master prompt can dispatch.

— *S1 master prompt · 2026-06-07*
