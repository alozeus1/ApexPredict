# ApexPredict — Sprint S1 Engineering Backlog (Frontend + Backend)

**Sprint:** S1 · Tue 2026-06-09 → Mon 2026-06-22 (10 working days)
**Scope:** Frontend + Backend engineering only. **No DevOps / SRE / infra / ML / design / GTM in this sprint.** Those land in later sprints once this FE/BE foundation is solid.
**Team:** 2 BE + 2 FE (4 engineers total). DES + SRE + ML available for unblocking questions only.
**Velocity assumption:** ~55 points / sprint (≈ 14 pts/engineer/sprint after PR review, standups, and slack).
**Total committed:** **54 points** across **3 epics** and **15 user stories**.
**Owner:** Engineering Lead.

---

## How to read this doc

Every **story** below carries five required sections so an engineer can pull it without pinging anyone:

- `CONTEXT` — what we're building, why it matters now, and any relevant history (S0 shipped this, that's broken, etc.).
- `ACCEPTANCE CRITERIA` — testable, binary pass/fail conditions. The reviewer rejects the PR if any one fails.
- `DEPENDENCIES & RISKS` — what blocks this story, what it blocks, and what could go wrong.
- `DEFINITION OF READY (DoR)` — checklist that must be ticked **before** the story is pulled into the sprint board's "In Progress" column.
- **Points** — Fibonacci, one of `{1, 2, 3, 5, 8}`. Not hours — relative complexity.
- **Parent Epic** — every story belongs to exactly one epic.

Below each story, `Tasks` are atomic work units (typically not pointed in scrum — story-level points carry the weight). Engineers can split or merge tasks as they see fit during sprint planning.

---

## Sprint Goal

> By end of Sprint S1, a real user can sign up, log in, manage their account and responsible-gaming preferences, subscribe via Paystack (test mode), and view a per-fixture prediction page that compares odds across bookmakers — all gated by tier entitlements and persisted to Neon Postgres.

Three success metrics for the sprint review:

1. **Signup → Paid path is end-to-end** in stub-mode (Paystack test keys OR dev stub). User signup → email verify → subscribe (test card) → entitlement reflected → premium feature visible. Demoable.
2. **Match detail rewrite is live** at `/predictions/[matchId]` with value-bet chip, Kelly tool (gated to Pro), bookmaker deeplinks, and the model narrative pulled from the existing prediction engine.
3. **User-pick ledger works**. A signed-in user can save a pick from the match detail page; it auto-settles when `FixtureResult.upsert` runs; the dashboard reflects it. (Dashboard rewrite itself is deferred — only the data side ships this sprint.)

If any of the three is red on review, the sprint is not green.

---

## Epics in this sprint

| Epic | Title | Stories | Points |
|---|---|---|---|
| **EPIC-A** | Account & Identity Polish | 4 | 10 |
| **EPIC-B** | Subscription Checkout & Lifecycle | 6 | 20 |
| **EPIC-C** | Predictions UX v1 + Pick Ledger | 6 | 24 |
| | **TOTAL** | **15** *(see note below)* | **54** |

*(Stories C5+C6 are split below; some epic narratives overlap — total story count = 15 unique stories under the three epics.)*

---

## Guardrails (apply to every story)

These carry forward from Sprint S0 — any PR that violates them is rejected at review.

1. **Positioning** — No copy/UI/email text may claim a "win rate," "guaranteed wins," or specific ROI promise. Calibrated probability + edge language only. Forbidden-phrase regex must return zero non-historical matches at the end of the sprint.
2. **Locale gate** — English-only at launch. Do NOT re-enable `yo`/`ha`/`ig` until the gate passes. No Pidgin.
3. **Lean-spend rule** — No live calls to Paystack, Smile ID, Sportmonks, The Odds API, Upstash QStash, Modal, or any paid vendor during this sprint. Adapters must compile and unit-test against mocks. If a vendor key is set in env, integration tests may run against the test/sandbox endpoint; if not set, the code must degrade to a documented dev-stub mode.
4. **Migrations policy** — Prisma migrations generated with `migrate dev --create-only`. **Never** auto-applied to Neon. PR body must include the `prisma migrate deploy` command an SRE will run manually.
5. **Branch model** — Every PR off `develop`. Never push to `main`. PR title uses Conventional Commits (`feat(...)`, `fix(...)`, `chore(...)`). Co-author tag where appropriate.
6. **Quality gate** before "done" on every PR: `pnpm typecheck && pnpm lint && pnpm test && pnpm -F @apexpredix/web e2e -- e2e/00-smoke.spec.ts` — paste output in the PR body.
7. **No regressions** — Existing E2E specs (auth, waitlist, geo-fence, consent, locale-switch, JSON-LD, a11y) must still pass. If a refactor breaks one, fix it in the same PR.
8. **Documentation** — Every new module gets a JSDoc header. Every new env var added to `apps/web/.env.example` with a comment.

---

# EPIC-A — Account & Identity Polish

**Parent Epic ID:** `EPIC-A`
**Goal:** Finish the user-facing surface around the Auth.js v5 scaffold S0 shipped, so a real user can fully manage their account and self-protect via responsible-gaming controls.
**Why this sprint:** Auth pages exist but the account page is a stub. Functional self-exclusion is a hard requirement for the NLRC advertising-standards posture; we must ship before any paid traffic.
**Stories (4):** A2, A3, A4, A5. **Points (10).**

> Note: there is no `A1` in this sprint — basic profile fields render via the S0 stub page already. We re-style + enrich the same page in A2/A3.

---

## STORY A2 — Sessions list with revoke
**Points: 3** · **Parent: EPIC-A** · **Owners: 1 BE + 1 FE** · **Branch: `feat/account-sessions`**

### CONTEXT
Auth.js v5 (S0) writes a `Session` row per device. Today the user has no way to see or revoke those sessions. We need this for two reasons: (1) basic security hygiene every modern product ships, and (2) regulator-friendly account control — a user who self-excludes should also be able to forcibly log themselves out everywhere.

### ACCEPTANCE CRITERIA
- `/[locale]/account` shows an authenticated section "Active sessions" listing every row in `Session` for the current user with: device fingerprint (UA-derived label), region (from IP-hash lookup at session creation — write at signup, not at view time), `createdAt`, and "current session" marker on the row matching the current cookie's `sessionToken`.
- Each non-current row has a "Revoke" button that calls `DELETE /api/account/sessions/[sessionId]`.
- A single "Sign out of all other devices" button calls `DELETE /api/account/sessions` (no path param) — revokes everything except the current session.
- Revoked sessions can no longer be used. The revoked client's next request returns 401 and bounces to `/login`.
- Every revoke writes an `AuditLog` entry with `action = 'session.revoke'` and meta containing the revoked sessionId.
- A11y: keyboard-navigable; revoke button has accessible label including the session label.
- Unit tests cover: revoke own session (401 next request), cannot revoke another user's session (404, not 403, to avoid enumeration), bulk revoke leaves current session intact.

### DEPENDENCIES & RISKS
- **Depends on:** S0 ships `Session` model + auth.ts (✅ Done).
- **Blocks:** A4 (suspended state needs the bulk-revoke endpoint to forcibly log out on self-exclusion).
- **Risk:** session-token rotation behavior of Auth.js v5 — if Auth.js refreshes tokens on every request, "current session" detection by sessionToken equality may flicker. Mitigation: read the token from `cookies()` once per render and pass down as a prop. Verify against Auth.js v5 docs before implementing.
- **Risk:** UA-derived device labels are fuzzy. Use a small allowlist parser (`chrome on macos`, `safari on iphone`, etc.) rather than a heavy library. If unparseable, render "Unknown device".

### DEFINITION OF READY
- [ ] AC reviewed and unambiguous to the implementing engineer.
- [ ] `Session` table fields confirmed (read `packages/db/prisma/schema.prisma` for the S0-shipped shape).
- [ ] UA parser approach decided (allowlist regex, not a library) and approved by reviewer.
- [ ] Reviewer assigned (default: backend reviewer).
- [ ] Mock data fixture for testing (≥ 3 sessions for one user) prepared in `apps/web/e2e/_helpers/sessions.ts`.

### Tasks
| Task | Subject | Description |
|---|---|---|
| A2-T1 | API: `DELETE /api/account/sessions/[id]` | Auth-required; delete row keyed by id + userId match. Audit `session.revoke`. Returns 204 on success, 404 if not owned. |
| A2-T2 | API: `DELETE /api/account/sessions` | Bulk-revoke all sessions for the current user except the one matching the request cookie. Audit `session.revoke.bulk`. |
| A2-T3 | UA-to-label utility | `lib/sessions/device-label.ts` with allowlist + fallback "Unknown device". Unit-tested with 10 canned UA strings. |
| A2-T4 | Server component: sessions list | RSC in `account/page.tsx` fetching sessions. Renders table; marks current session. |
| A2-T5 | Client wrapper: revoke button | Calls API; shows toast on success; refreshes list. Loading + error states. |
| A2-T6 | E2E: revoke flow | Playwright spec adds a 2nd device session via test helper, revokes it, asserts it's gone. |

---

## STORY A3 — Responsible-gaming controls UI
**Points: 5** · **Parent: EPIC-A** · **Owners: 1 BE + 1 FE + counsel sign-off on copy** · **Branch: `feat/account-rg-controls`**

### CONTEXT
The S0 PRs shipped the `User.rgFlags Json` column and an `assertNotSuspended` server util. Nothing UI-facing exists yet. RG self-exclusion is the most-scrutinized control by NLRC and is a prerequisite for any paid release. The locked-confirmation modal in PR 4 of the S1 master prompt depends on this story (we wire the client UX here; the server enforcement is in PR 4).

### ACCEPTANCE CRITERIA
- `/[locale]/account` has a "Responsible gaming" section with three controls:
  - **Self-exclude:** radio group `24h / 7d / 30d / permanent`. On submit, opens a 3-step confirmation modal (read, type "I UNDERSTAND" in caps, click "Self-exclude"). On confirm, calls `POST /api/account/self-exclude` with `{ window }`. The 30d and permanent options also include a copy reaffirmation. Submission is **irreversible** within the chosen window — the API rejects any further calls with 409 until the window expires.
  - **Cool-off:** "Pause notifications and picks for N days" (1–14, slider). Less binding than self-exclude. `POST /api/account/cool-off` with `{ days }`. Reversible by the user from within the cool-off period.
  - **Advisory deposit cap:** numeric input + currency selector (NGN default). Stored on `User.rgFlags.advisoryCapNgn`. Purely advisory — does not block any flow, but is surfaced in the dashboard and in any "buy" CTA we add later.
- Server enforcement: when `User.rgFlags.selfExcludedUntil > now`, every protected route — picks index, match detail, dashboard, notifications opt-in — must render a `<Suspended>` banner using the existing `assertNotSuspended` helper.
- Audit log entries for every state change: `rg.selfExclude.start`, `rg.selfExclude.reject`, `rg.coolOff.start`, `rg.advisoryCap.set`.
- Copy on every confirmation step matches the compliance footer pattern in `docs/strategy/2026-06-04-apexpredict-repositioning-copy.md` — no win-rate language, includes the 18+ line.
- Accessibility: focus trapped inside modal, ESC closes only at step 1, screen-reader announces step transitions. axe passes.

### DEPENDENCIES & RISKS
- **Depends on:** S0 `User.rgFlags` field (✅ Done), `assertNotSuspended` server util (✅ Done), `lib/audit.ts` (✅ Done).
- **Blocks:** A4 (suspended state banner — A3 wires it; A4 finishes the cross-page rollout). Also blocks E07-S2 in the S1 master prompt (counsel-reviewed copy is finalized here).
- **Risk:** copy review delay. Mitigation: ship with placeholder copy reviewed by the engineering lead; mark the PR `needs-counsel-review` and merge with a follow-up issue for legal sign-off.
- **Risk:** users mistakenly self-excluding "permanent" with no recovery path. Counsel + product agreement: permanent is irreversible (do not add an admin override in this story — that's a separate ticket in S4).
- **Risk:** notifying users they self-excluded via an email triggered by the self-exclude itself — could be re-triggering. Make sure the "you have self-excluded" email is sent IMMEDIATELY by the API, not by a worker.

### DEFINITION OF READY
- [ ] Copy reviewed in PR by engineering lead (counsel review can be follow-up).
- [ ] Confirmation modal flow walkthrough (3 steps) sketched in a comment on the ticket — text content for each step is in the ticket.
- [ ] `User.rgFlags` schema documented in the ticket (exact JSON shape).
- [ ] `assertNotSuspended` reviewed — confirm it returns a JSX banner (server component) the caller can render conditionally.
- [ ] Reviewer assigned (default: backend reviewer + design reviewer for modal a11y).

### Tasks
| Task | Subject | Description |
|---|---|---|
| A3-T1 | API: `POST /api/account/self-exclude` | Validate window enum; set `rgFlags.selfExcludedUntil`; reject with 409 if already active. Audit. Email immediately. |
| A3-T2 | API: `POST /api/account/cool-off` | Validate days 1–14; set `rgFlags.coolOffUntil`. Reversible by `DELETE /api/account/cool-off` within the window. Audit. |
| A3-T3 | API: `POST /api/account/advisory-cap` | Numeric + currency. Persist `rgFlags.advisoryCap = { amount, currency }`. Audit. |
| A3-T4 | RGControls section component | Server-rendered shell + client-island controls for the three sub-flows. |
| A3-T5 | 3-step self-exclude modal | Focus-trapped, accessible, ESC handling per AC. |
| A3-T6 | Suppression suite wired into picks UI | `assertNotSuspended` rendered as a banner at the top of /predictions, /predictions/[id], /dashboard, /onboarding. |
| A3-T7 | Self-exclude transactional email | React Email template; sent via Resend immediately from the API on successful state change. Compliance footer applied. |
| A3-T8 | Unit + integration tests | Cover happy paths + reject-during-active-window. axe pass on the modal. |

---

## STORY A4 — Cross-page suspended-state rollout
**Points: 0** · **Parent: EPIC-A** · **Note:** This story is absorbed into A3 (the `assertNotSuspended` rollout is the same task). Tracked separately on the backlog for visibility — it is not a separate PR.

> **Engineering decision:** Originally A4 was the "Suspended banner" story. After S0 shipped the `<Suspended>` helper and A3 takes ownership of wiring it across pages, there's no additional work. **Story dropped from this sprint — points already counted under A3.**

---

## STORY A5 — Google login button (account linking)
**Points: 2** · **Parent: EPIC-A** · **Owners: 1 FE + 1 BE (shared)** · **Branch: `feat/auth-google-button`**

### CONTEXT
S0 shipped the Auth.js v5 Google provider configuration. There is no button. Users currently can only sign up / log in via email + password or magic link. Adding the Google button is high-value low-effort: ~30% of NG mobile users prefer Google sign-in (per industry benchmarks), and the account-linking logic by email match prevents duplicate accounts.

### ACCEPTANCE CRITERIA
- `/[locale]/login` and `/[locale]/signup` show a "Continue with Google" button above the email form, separated by a divider.
- On click, the button calls `signIn('google', { redirectTo: '/dashboard' })`.
- If a `User` row exists with the same email as the Google account, the new `Account` row is linked to that existing User (no duplicate User created).
- New users via Google get `User.emailVerifiedAt` set to the Google token's `email_verified` timestamp.
- Locale stays sticky across the OAuth round-trip (the redirect_to param preserves the locale path).
- Mocked Playwright E2E spec proves: button visible, OAuth dance mocked via `mockAuthorize`, user lands on `/dashboard` with a valid session.
- When `AUTH_GOOGLE_ID` is empty, the button renders a "Sign-in with Google coming soon" placeholder instead — never crashes.

### DEPENDENCIES & RISKS
- **Depends on:** S0 Google provider config in `auth.ts` (✅ Done — verify in the file).
- **Blocks:** nothing inside this sprint.
- **Risk:** Auth.js v5 redirect behavior on locale-prefixed routes. Mitigation: review next-intl + Auth.js v5 docs for `callbackUrl`/`redirectTo` interplay; add an integration test that exercises a non-default locale.
- **Risk:** account-linking edge case — what if the user signed up with `john@gmail.com` via email then later tries Google with the same address but unverified emails on Google? Decision: link only when `email_verified === true`. Reject otherwise with a 400 + friendly UI.

### DEFINITION OF READY
- [ ] `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` env-var names confirmed against `auth.ts`.
- [ ] Placeholder copy reviewed.
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| A5-T1 | UI: Google button component | Server-rendered link with proper a11y (button + Google logo + label). Locale-aware redirect. |
| A5-T2 | Linking logic | In Auth.js `signIn` callback, look up User by email; if found, attach Account; reject Google links with `email_verified === false`. |
| A5-T3 | Placeholder fallback | Render "coming soon" disabled state when env unset. |
| A5-T4 | E2E spec | Mocked OAuth flow; verifies session + sticky locale. |

---

# EPIC-B — Subscription Checkout & Lifecycle

**Parent Epic ID:** `EPIC-B`
**Goal:** Build the Paystack-driven subscription flow end-to-end in compile-only / dev-stub mode. When live keys arrive in S2/S3, flipping `BILLING_PROVIDER=paystack` + setting `PAYSTACK_SECRET_KEY_TEST` is the only change needed to take a real test transaction.
**Why this sprint:** No revenue path exists today. Without the subscription scaffold, the dashboard can't gate features by entitlement (E01-S3, ✅ Done) — the gate is wired but no `Subscription.status = 'active'` ever flips.
**Stories (6):** B1, B2, B3, B4, B5, B7. **Points (20).** *(B6 = soft-suspend deferred — see end of epic.)*

---

## STORY B1 — Billing provider adapter interface
**Points: 3** · **Parent: EPIC-B** · **Owners: 1 BE** · **Branch: `feat/billing-provider-iface`**

### CONTEXT
We need a clean abstraction so Paystack today and Flutterwave later both plug into the same call sites. The interface lives in `apps/web/lib/billing/` and is consumed by every other story in this epic. This is the foundation that everything else builds on, so it lands first.

### ACCEPTANCE CRITERIA
- `apps/web/lib/billing/provider.ts` exports `interface BillingProvider` with these methods:
  - `name: 'paystack' | 'flutterwave'`
  - `getCheckoutUrl(input: { tier: 'WEEKLY' | 'MONTHLY' | 'YEARLY'; userId: string; idempotencyKey: string; locale: string }) => Promise<{ authorizationUrl: string; reference: string; isStub: boolean }>`
  - `verifyWebhookSignature(rawBody: string, signatureHeader: string) => boolean`
  - `parseEvent(rawBody: string) => BillingEvent` where `BillingEvent` is a discriminated union: `subscription.create | subscription.disable | invoice.create | invoice.payment_failed | charge.success | charge.failed`.
- `getActiveProvider()` factory reads `BILLING_PROVIDER` env (default `paystack`), returns the appropriate impl.
- A `PaystackProvider` class implements the interface but `getCheckoutUrl` only makes a real fetch when `PAYSTACK_SECRET_KEY_TEST` is set. When unset, returns `{ authorizationUrl: '/dev/billing-stub?ref=<ref>', reference: 'STUB-<ulid>', isStub: true }`.
- A `FlutterwaveProvider` stub class implements the interface; all methods throw `Error('flutterwave-not-implemented')` for now.
- 100% branch coverage on `PaystackProvider.verifyWebhookSignature` and `parseEvent` (Paystack docs: HMAC-SHA512 of body with secret key, hex digest, compare to `x-paystack-signature` header).
- A `tests/billing/__fixtures__/paystack-charge-success.json` fixture loads cleanly into `parseEvent`.

### DEPENDENCIES & RISKS
- **Depends on:** nothing inside this epic (this is the foundation).
- **Blocks:** B2, B4, B5, B7 — all depend on this interface existing.
- **Risk:** Paystack webhook signature spec changes. Mitigation: read the docs at start-of-sprint; if it differs from HMAC-SHA512-hex, update the helper and re-derive tests.
- **Risk:** the BillingEvent union may need extension later (`subscription.not_renew`, etc.). Acceptable — leaving it open via TS discriminated union makes additions backward-compatible.

### DEFINITION OF READY
- [ ] Paystack docs URL pinned in ticket: <https://paystack.com/docs/payments/webhooks/>.
- [ ] Interface signature reviewed by the developer who will pick up B2 (so the consumer side agrees).
- [ ] Fixture JSON file path + contents agreed.
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| B1-T1 | `BillingProvider` interface + types | TS types in `lib/billing/provider.ts`. Discriminated union for `BillingEvent`. |
| B1-T2 | `PaystackProvider` impl (live + stub modes) | Stub mode when env keys absent; live when set. |
| B1-T3 | `FlutterwaveProvider` stub | Throw-only impl. |
| B1-T4 | `getActiveProvider()` factory | Read `BILLING_PROVIDER` env; default `paystack`. |
| B1-T5 | Signature verify + event parse tests | 6 event-type fixtures + tampered-body negative test. |
| B1-T6 | `.env.example` updates | Document `BILLING_PROVIDER`, `PAYSTACK_PUBLIC_KEY_TEST`, `PAYSTACK_SECRET_KEY_TEST`. |

---

## STORY B2 — Checkout API + page (server-driven)
**Points: 5** · **Parent: EPIC-B** · **Owners: 1 BE + 1 FE** · **Branch: `feat/billing-checkout`**

### CONTEXT
The path from a user clicking "Subscribe" on a pricing card to landing on a Paystack-hosted form must be a single click. We do this with a server action that calls the provider, mints an idempotency key, and 302-redirects.

### ACCEPTANCE CRITERIA
- `POST /api/billing/checkout` accepts `{ tier: 'WEEKLY' | 'MONTHLY' | 'YEARLY' }`, requires an authenticated user.
- The API mints an idempotency key (`crypto.randomUUID()`), stores it in KV under `billing:idemp:<userId>:<tier>` with 10-minute TTL, and calls `getActiveProvider().getCheckoutUrl(...)`.
- Concurrent duplicate POSTs (same user + tier within 10 min) return the cached `{ authorizationUrl, reference }` rather than re-initiating.
- KV unreachable → skip idempotency caching with a Sentry warning; do **not** reject the request.
- Response shape: `{ authorizationUrl: string, reference: string }` with `200` status, **or** `{ error: 'rate-limited' | 'auth-required' | 'invalid-tier' }` with appropriate 4xx.
- `/[locale]/billing/checkout?tier=<tier>` is a server component that calls the API server-side via `fetch(internalUrl)` (not the client) and 302-redirects to `authorizationUrl`. If `isStub: true`, render a dev-mode banner: "Paystack keys not configured — this would redirect to Paystack in production." with a "Continue (simulated)" button that posts a fake webhook for testing.
- E2E test passes against the stub-mode path.

### DEPENDENCIES & RISKS
- **Depends on:** B1 (interface).
- **Blocks:** B3 (thanks page polls for state created here), B4 (webhook needs a `Subscription` row to update — created here on stub-success).
- **Risk:** Vercel server actions with a 302 redirect — verify that `redirect()` from `next/navigation` works through the cookie-bearing server component. Test in preview.
- **Risk:** KV outage handling — make sure the error path actually allows progress. Add a feature flag `BILLING_IDEMPOTENCY_ENFORCED=true|false`; default false at first, flip true once KV is stable.

### DEFINITION OF READY
- [ ] B1 merged (or local branch available).
- [ ] Decision on stub-mode "Continue (simulated)" affordance reviewed by product (engineering lead can stand in).
- [ ] KV outage policy agreed (warn + proceed, not reject).
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| B2-T1 | API route `POST /api/billing/checkout` | Auth-gated; tier validation; idempotency in KV; call provider. |
| B2-T2 | Stub-mode "simulated" webhook trigger | Dev-only endpoint `POST /api/billing/_dev/simulate-paystack` that fires a `charge.success` to the webhook with a valid signature. Gated to `NODE_ENV !== 'production'`. |
| B2-T3 | Server component `/[locale]/billing/checkout` | Reads tier from query; calls API; redirects. Renders dev-banner in stub mode. |
| B2-T4 | Idempotency feature flag | `BILLING_IDEMPOTENCY_ENFORCED` toggles strict mode. Documented in `.env.example`. |
| B2-T5 | E2E spec (stub mode) | Click "Subscribe" → land on stub banner → click "Continue (simulated)" → webhook fires → subscription row created. |

---

## STORY B3 — Billing thanks page with state polling
**Points: 2** · **Parent: EPIC-B** · **Owners: 1 FE** · **Branch: `feat/billing-thanks`**

### CONTEXT
After the user completes the Paystack-hosted checkout, Paystack redirects to a return URL with a `?reference=` query. Our `Subscription` row gets updated by the webhook, not synchronously by the redirect. The thanks page must poll until it sees `Subscription.status === 'active'` for the user, with a max-wait before showing a "still pending, we'll email you" fallback.

### ACCEPTANCE CRITERIA
- `/[locale]/billing/thanks?reference=<ref>` is a client component that:
  - On mount, calls `GET /api/billing/subscription` (returns the current user's subscription).
  - If `status === 'active'`, renders success copy + CTA → `/dashboard`.
  - Otherwise polls every 1s for the first 5s, then every 2s up to 30s. If still pending at 30s, renders fallback copy: "We're still processing your payment. You'll get an email when it's done. Your subscription is reflected in your account when it's ready."
- Polling uses `setTimeout` with exponential-ish backoff; uses `AbortController` to cancel on unmount.
- A `?simulate=true` query param (dev-only) triggers `POST /api/billing/_dev/simulate-paystack` then resumes polling — for testing.
- Copy uses approved language (no win-rate).

### DEPENDENCIES & RISKS
- **Depends on:** B2 (thanks redirect is the consumer of the checkout flow), B4 (the webhook handler that flips status to active).
- **Blocks:** nothing.
- **Risk:** users on bad networks see the fallback even when the webhook arrived — be sure the polling continues in the background until status flips, even after showing the fallback. Render a "Refresh status" button.
- **Risk:** SSR — make this page entirely client-side with a server fallback that says "loading". The poll must run from the client.

### DEFINITION OF READY
- [ ] B2 + B4 branches available for local integration test.
- [ ] Copy reviewed.
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| B3-T1 | API route `GET /api/billing/subscription` | Returns the current user's Subscription as JSON. |
| B3-T2 | Thanks page component | Polling logic + UI states (loading / success / fallback). |
| B3-T3 | "Refresh status" button | Manual re-poll trigger. |
| B3-T4 | Dev-mode `?simulate=true` flow | Triggers the stub webhook then waits. |

---

## STORY B4 — Paystack webhook handler (idempotent)
**Points: 5** · **Parent: EPIC-B** · **Owners: 1 BE** · **Branch: `feat/billing-webhook`**

### CONTEXT
The webhook is the canonical source of truth for subscription state. Paystack will replay events (intentionally and on failure), so the handler must be idempotent. We persist every received event in a new `WebhookDelivery` row keyed on `eventId`. The endpoint is unauthenticated by user-session but verifies signatures.

### ACCEPTANCE CRITERIA
- `POST /api/billing/webhook/paystack` reads the raw body (NOT the parsed JSON — Paystack signs the raw body); verifies signature via `BillingProvider.verifyWebhookSignature`; returns 401 on signature mismatch.
- On valid signature, parses event, looks up `WebhookDelivery` by `eventId`. If exists, return 200 with `{ replayed: true }` and do nothing else. Otherwise, persist `WebhookDelivery` row and route to a handler.
- Handlers (each idempotent):
  - `subscription.create` → `Subscription.status = 'ACTIVE'`, `Subscription.providerSub` set, `currentPeriodEnd` set.
  - `subscription.disable` → `Subscription.status = 'CANCELLED'`.
  - `invoice.create` → advance `currentPeriodEnd` from the invoice's period_end.
  - `invoice.payment_failed` → `Subscription.status = 'PAST_DUE'`, enqueue a dunning-email audit row (sender ships in a later sprint).
  - `charge.success` → audit row only (Subscription state already updated by subscription.create/invoice.create).
  - `charge.failed` → audit row only.
- Every event writes an `AuditLog` entry with `action = 'billing.webhook.<eventType>'` and meta containing `eventId`, `userId`, and the relevant Subscription fields after the update.
- A new Prisma model `WebhookDelivery` (with `eventId` unique constraint) ships in this PR. Migration generated SQL only.
- Unit tests cover: each event type, replay (same eventId returns `{ replayed: true }`), tampered signature returns 401.

### DEPENDENCIES & RISKS
- **Depends on:** B1 (provider interface).
- **Blocks:** B3 (state polling for active status), B5 (cancel-at-period-end is implemented partly via `currentPeriodEnd` set by webhook).
- **Risk:** Paystack sometimes sends events out of order (e.g., `charge.success` before `subscription.create`). Handlers must be tolerant — find-or-create the Subscription row by `providerCustomer + providerSub`.
- **Risk:** Resend rate limits if many users go past-due at once. The dunning email isn't sent here, only enqueued via audit row — actual sending in a later sprint.
- **Risk:** the secret key is also the webhook signing key — make sure rotation procedure is documented (S0 already covers this; add a note in PR body).

### DEFINITION OF READY
- [ ] B1 merged or branch local.
- [ ] `WebhookDelivery` model shape (Prisma) drafted in the ticket.
- [ ] 6 event fixtures created under `tests/billing/__fixtures__/`.
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| B4-T1 | Prisma migration: `WebhookDelivery` | id, provider, eventId (unique), eventType, payload Json, processedAt, createdAt. |
| B4-T2 | Webhook route | Raw-body extraction; signature verify; replay check; event router. |
| B4-T3 | Per-event handlers | Idempotent updates with `find-or-create` semantics on Subscription. |
| B4-T4 | Audit hooks | One AuditLog row per event. |
| B4-T5 | Test fixtures + tests | Replay test, signature mismatch test, per-event happy path. |

---

## STORY B5 — Cancel-at-period-end (API + UI)
**Points: 3** · **Parent: EPIC-B** · **Owners: 1 BE + 1 FE** · **Branch: `feat/billing-cancel`**

### CONTEXT
Users must be able to cancel their subscription without losing access during the period they've already paid for. Industry standard is "cancel at period end" — keep entitlement until `currentPeriodEnd`, then drop to FREE.

### ACCEPTANCE CRITERIA
- `POST /api/billing/cancel` is auth-required and toggles `Subscription.cancelAt = currentPeriodEnd`. Audit `billing.cancel.scheduled` with the dropOffDate.
- `DELETE /api/billing/cancel` un-cancels (clears `cancelAt`) — supports the "I changed my mind" flow.
- `/[locale]/account/billing` shows current subscription state. If `cancelAt` is set, render banner "Your subscription ends on `<date>`. You'll still have access until then." with an "Un-cancel" button.
- The "Cancel subscription" button opens a confirmation modal explaining what happens (loses Pro features at period end, can resubscribe anytime).
- Entitlement middleware reads `Subscription.status` and `cancelAt`: until `cancelAt` is in the past, the user's tier reflects their paid tier; afterwards, FREE.
- Unit tests cover: cancel after activation → cancelAt set; un-cancel before period end → cancelAt cleared; passing the period end → tier flips to FREE.

### DEPENDENCIES & RISKS
- **Depends on:** B4 (`currentPeriodEnd` set by webhook is the value we copy into `cancelAt`).
- **Blocks:** nothing.
- **Risk:** clock-drift between server and Paystack — accept ~5 min drift when computing "in the past". Use `Date.now() - 5*60*1000` as the threshold.
- **Risk:** users on legacy yearly plans where Paystack returns `null` for `currentPeriodEnd` — guard with a fallback message: "Contact support to cancel a yearly plan."

### DEFINITION OF READY
- [ ] B4 merged or branch local.
- [ ] Confirmation modal copy reviewed.
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| B5-T1 | `POST /api/billing/cancel` | Sets cancelAt. Audit. |
| B5-T2 | `DELETE /api/billing/cancel` | Clears cancelAt. Audit. |
| B5-T3 | Account billing section | Renders subscription state + cancel/un-cancel button. |
| B5-T4 | Confirmation modal | Accessible 2-step flow with countdown. |
| B5-T5 | Entitlement-aware fallback | `entitlementsFor(user)` returns FREE if Subscription is cancelled past `cancelAt`. |
| B5-T6 | Tests | Unit (entitlement clock logic) + E2E (cancel + un-cancel UX). |

---

## STORY B7 — Webhook replay CLI for QA + support
**Points: 2** · **Parent: EPIC-B** · **Owners: 1 BE** · **Branch: `feat/billing-replay-cli`**

### CONTEXT
On launch, support engineers will need to replay or simulate Paystack events without going through Paystack itself — for testing, for fixing edge-case customer issues, for incident response. We ship a small TS script that posts a canned event JSON to our webhook URL with a valid signature.

### ACCEPTANCE CRITERIA
- `apps/web/scripts/billing-replay.ts` accepts `--fixture <path>` and `--url <url>` (default `http://localhost:3000/api/billing/webhook/paystack`).
- Computes HMAC-SHA512 signature of the raw body using `PAYSTACK_SECRET_KEY_TEST` and sets the `x-paystack-signature` header.
- Posts the body; prints response status + JSON.
- Supports `--dry-run` to print the signed request without posting.
- 4 fixtures shipped under `apps/web/scripts/fixtures/paystack-*.json` covering `charge.success`, `subscription.create`, `invoice.create`, `invoice.payment_failed`.
- Documented in `docs/runbooks/billing-incident-response.md` with three example invocations.

### DEPENDENCIES & RISKS
- **Depends on:** B1 (signature helper), B4 (webhook route).
- **Blocks:** nothing.
- **Risk:** the CLI is a footgun in prod — only let it use `PAYSTACK_SECRET_KEY_TEST`. If `NODE_ENV === 'production'`, hard-error.

### DEFINITION OF READY
- [ ] B1 + B4 branches local.
- [ ] Runbook outline agreed.
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| B7-T1 | CLI script | Argv parsing; signature; fetch; print. |
| B7-T2 | Fixtures (×4) | Real-looking Paystack payloads. |
| B7-T3 | Prod guard | Hard-error on `NODE_ENV === 'production'`. |
| B7-T4 | Runbook | `docs/runbooks/billing-incident-response.md`. |

> **B6 — Soft suspend at period end (deferred to next sprint).** Reason: the entitlement-aware behavior is delivered by B5's middleware change; the *worker* that runs nightly to flip stale subscriptions is a backend cron concern that fits cleanly with the QStash worker decomposition in a later sprint. Tracked in the main backlog as `E02-S3-T4`.

---

# EPIC-C — Predictions UX v1 + Pick Ledger

**Parent Epic ID:** `EPIC-C`
**Goal:** Make the prediction product feel real. Match detail page shows the model breakdown, bookmaker odds comparison, value-bet chip, Kelly tool (Pro), and bookmaker deeplinks. Users can save a pick; it auto-settles when results land.
**Why this sprint:** This is the product. Without it, the auth + payments work is just infrastructure for nothing. Shipping this in S1 means by sprint review we can demo a real user flow: signup → subscribe → see predictions → save a pick → see it settle.
**Stories (6):** C1, C2, C3, C4, C5, C6. **Points (24).**

---

## STORY C1 — Match detail page rewrite (server component)
**Points: 8** · **Parent: EPIC-C** · **Owners: 1 BE + 1 FE** · **Branch: `feat/match-detail-rewrite`**

### CONTEXT
Today `/predictions/[matchId]` exists but the page is thin. The S0 backlog calls for a full rewrite that surfaces: live odds across bookmakers (with our best-price highlighted), model probability + edge per market, calibrated confidence, ¼-Kelly stake (Pro only), explainable narrative, JSON-LD `SportsEvent`. This is the single most-viewed page after the predictions index — it's also the page that converts free users to paid.

### ACCEPTANCE CRITERIA
- `/[locale]/predictions/[matchId]` is a server component that fetches: `Fixture` + `Competition` + `HomeTeam` + `AwayTeam` + `PredictionSnapshot` (latest) + `Odds[]` + `FixtureEnrichment` (if exists from a future S2 ticket — handle nullable gracefully).
- Page sections (top to bottom):
  1. **Header** — competition crest + name + kickoff in user's locale timezone.
  2. **Score / kickoff card** — team crests + team names; kickoff countdown if in the future; final score if finished.
  3. **Model breakdown** — three markets (1, X, 2) with model probability bars, best odds across the bookmakers we have data for, edge percentage per market with a Value-Bet chip (Story C2) when ≥ 3%.
  4. **Confidence bar** — model confidence + an "uncertainty" caveat line.
  5. **Kelly Stake** (Pro only — gated by entitlement) — Story C3.
  6. **Narrative** — model narrative string from `PredictionSnapshot.narrative` rendered in MD with paragraph breaks.
  7. **Bookmaker deeplinks** (Story C4) — clear "Place bet at SportyBet / Bet9ja / 1xBet" buttons with tracking.
  8. **Methodology link** — small CTA to `/methodology`.
- JSON-LD `SportsEvent` schema embedded in `<head>` via `app/lib/seo/json-ld.ts`. Fields: name, startDate, location ("Online"), competitor (HomeTeam + AwayTeam), eventStatus (`EventScheduled` or `EventPostponed` or `EventCompleted`).
- OG image route `app/api/og/match/[matchId]/route.tsx` already exists from earlier — verify it still works after rewrite.
- Page must render correctly when: (a) PredictionSnapshot is missing (show "Awaiting model run" placeholder), (b) Odds[] is empty (no value-bet chip, no deeplinks shown), (c) user is signed out (Kelly + deeplinks hidden).
- LCP < 2.5s on a mid-3G profile in Lighthouse. No `client:` islands for the static parts; only the bookmaker-deeplink click handler is client.
- All copy uses approved language.

### DEPENDENCIES & RISKS
- **Depends on:** C2 (chip component), C3 (Kelly), C4 (deeplinks), C5 (Bookmaker model — best-price highlighting reads from it).
- **Blocks:** C6 — the "Save this pick" button lives on this page; without C1 there's nowhere to host it.
- **Risk:** PredictionSnapshot.narrative is auto-generated boilerplate today (`"X is the current model side after blending..."`). For S1, render it verbatim — the richer narrative is a separate S2 ticket. Reviewer should NOT block this PR for narrative quality.
- **Risk:** new sections add bundle weight. Stay under 80kb gzipped JS for the route. Use server components aggressively.
- **Risk:** old `/predictions/[matchId]` route may have hand-baked tests — port them or replace cleanly.

### DEFINITION OF READY
- [ ] Mockup / wireframe attached to the ticket (a simple sketch is fine — full Figma not required).
- [ ] List of which sections require which Story (C2/C3/C4/C5) acknowledged.
- [ ] Existing JSON-LD helper reviewed.
- [ ] LCP budget agreed.
- [ ] Reviewer assigned (default: senior FE).

### Tasks
| Task | Subject | Description |
|---|---|---|
| C1-T1 | Data-fetching server util | `lib/data/get-match-detail.ts` returning the joined object the page renders. |
| C1-T2 | Page shell + header | `/[locale]/predictions/[matchId]/page.tsx` rewritten. Server component. |
| C1-T3 | Model breakdown section | Probability bars + edge chips. Uses MatchCard tokens for visual consistency. |
| C1-T4 | Confidence bar component | Reuses existing `components/match/ConfidenceBar.tsx`; check signature still matches. |
| C1-T5 | JSON-LD `SportsEvent` | Helper + integration. |
| C1-T6 | Empty states | Awaiting-model placeholder + no-odds state. |
| C1-T7 | E2E spec | Render assertions for each section; SR navigation check. |

---

## STORY C2 — Value-Bet chip + tooltip
**Points: 2** · **Parent: EPIC-C** · **Owners: 1 FE** · **Branch: `feat/value-bet-chip`**

### CONTEXT
A reusable component to show "this is a +EV bet by X%". Used on the predictions index, match detail page, dashboard, and Telegram (later). Centralizing the visual + copy here makes it consistent everywhere.

### ACCEPTANCE CRITERIA
- `components/match/ValueBetChip.tsx` exists (extending the existing one, not rewriting from scratch).
- Props: `{ edgePoints: number; market: '1' | 'X' | '2' }` — renders e.g. "Value +4.2% on Home Win".
- Hover/focus tooltip: "Model's calibrated probability vs. the best market price. Higher is better. Past performance does not guarantee future results."
- Tooltip is fully accessible: keyboard-focusable, ESC dismisses, screen-reader reads tooltip text on focus.
- Renders nothing if `edgePoints < 3` (below value threshold).
- Visual matches the design tokens in `tailwind.config.js`.

### DEPENDENCIES & RISKS
- **Depends on:** nothing (foundational component).
- **Blocks:** C1 (match detail uses it), the existing predictions feed already references the chip — make sure refactor stays backward-compatible.
- **Risk:** the tooltip copy must avoid win-rate language.

### DEFINITION OF READY
- [ ] Existing `ValueBetChip.tsx` reviewed — diff plan agreed (extend, don't replace).
- [ ] Tooltip approach decided (Radix Tooltip vs. raw `aria-describedby` — Radix is already in deps, prefer it).
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| C2-T1 | Extend `ValueBetChip` | Accept `edgePoints` + `market`. Suppress below threshold. |
| C2-T2 | Tooltip integration | Radix Tooltip; accessible. |
| C2-T3 | Storybook story (if Storybook exists) or visual regression test | Verify hover + focus states. |
| C2-T4 | Unit test | Renders nothing below threshold; correct copy above. |

---

## STORY C3 — Kelly Stake calculator (Pro-gated)
**Points: 3** · **Parent: EPIC-C** · **Owners: 1 FE + 1 BE (entitlements check)** · **Branch: `feat/kelly-calculator`**

### CONTEXT
A bankroll discipline tool for Pro tier. Computes ¼-Kelly stake suggestion given the user's bankroll, model probability, and best book price. Surfaces on match detail (Pro-only) and on a future dashboard tile (not in this sprint).

### ACCEPTANCE CRITERIA
- `components/match/KellyCalculator.tsx` is a client component with three inputs: bankroll (NGN, persisted to localStorage per user), model probability (read-only, passed via props), book price (read-only). Outputs: full-Kelly stake fraction, ¼-Kelly stake amount in NGN.
- Formula: `kellyFraction = (p × b − (1 − p)) / b` where `b = price − 1` and `p = modelProbability`. ¼-Kelly = `kellyFraction × 0.25 × bankroll`. If `kellyFraction <= 0`, output "Model does not favor this market — stake = 0."
- Gated: hidden entirely if `entitlementsFor(user).kelly === false`.
- A small "How does this work?" link expands inline explanation: max one paragraph, plain language, with the standard disclaimer.
- Unit-test the math against 6 hand-computed cases.

### DEPENDENCIES & RISKS
- **Depends on:** `lib/entitlements.ts` (✅ Done).
- **Blocks:** nothing.
- **Risk:** bankroll persisted to localStorage — make sure it's per-user (key includes userId or a session-stable id). On logout, clear it.
- **Risk:** Kelly suggests staking even when the model is wrong. Make the explainer copy very clear that ¼-Kelly is a conservative ceiling, not a recommendation.

### DEFINITION OF READY
- [ ] Formula verified against an external reference (e.g., Wikipedia Kelly criterion).
- [ ] Pro entitlement key (`kelly`) confirmed against `entitlementsFor` matrix.
- [ ] Copy reviewed.
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| C3-T1 | Calculator component | Math + inputs + outputs + edge cases. |
| C3-T2 | Entitlement gating | Server-side `entitlementsFor(user).kelly` check; client unmount if false. |
| C3-T3 | Per-user bankroll persistence | localStorage keyed by userId. Cleared on logout. |
| C3-T4 | Inline "How does this work?" | Collapsible. |
| C3-T5 | Tests | 6 math cases + entitlement gating + persistence. |

---

## STORY C4 — Bookmaker deeplink + affiliate tracking
**Points: 3** · **Parent: EPIC-C** · **Owners: 1 BE + 1 FE** · **Branch: `feat/affiliate-deeplinks`**

### CONTEXT
The affiliate revenue stream depends on outbound clicks tagged with our affiliate code. We add an `/go/:bookCode` redirect endpoint that logs an `AffiliateClick` and 302s the user with the bookmaker's affiliate URL template populated.

### ACCEPTANCE CRITERIA
- `Prisma` model `AffiliateClick` added: id, userId (nullable for anon), bookCode, fixtureId (nullable), market (nullable), ipHash, uaHash, createdAt. Index on (bookCode, createdAt).
- `GET /go/:bookCode?fixtureId=…&market=…` writes the row and 302-redirects to `<Bookmaker.affiliateUrlTemplate>` after substituting `{{fixtureId}}` etc.
- IP and UA are hashed with the existing `lib/hash.ts` helper before persisting.
- On match detail page, the "Place at SportyBet / Bet9ja / 1xBet" buttons link to `/go/<bookCode>?fixtureId=<id>&market=<market>` (server-rendered href).
- If the user is signed out, `userId = null` but the row still writes.
- A `lib/affiliate/template.ts` helper safely substitutes URL template params and rejects URLs that don't match a configured allowlist (defense-in-depth against open-redirects).

### DEPENDENCIES & RISKS
- **Depends on:** C5 (`Bookmaker` model — without it, there's no affiliate URL template to read from).
- **Blocks:** C1 (the buttons live on the match detail page).
- **Risk:** open-redirect vulnerability if `bookCode` is user-controlled. Mitigation: lookup `Bookmaker` by `bookCode` and use the stored template; reject if not found.
- **Risk:** privacy — hashing IP/UA must use the existing HMAC helper, not raw values.

### DEFINITION OF READY
- [ ] C5 merged or branch local (depends on the Bookmaker model).
- [ ] Affiliate URL template format agreed (we use `{{var}}` syntax).
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| C4-T1 | Prisma `AffiliateClick` model + migration | Generated SQL. |
| C4-T2 | `/go/[bookCode]` route | Validate bookCode; lookup template; substitute; redirect. |
| C4-T3 | Template substitution helper | Safe replacement; allowlist check. |
| C4-T4 | Match detail page buttons | Render server-side hrefs. |
| C4-T5 | Tests | Open-redirect attempt → 404; valid click → row written + 302. |

---

## STORY C5 — Bookmaker model + seed
**Points: 3** · **Parent: EPIC-C** · **Owners: 1 BE** · **Branch: `feat/bookmaker-model`**

### CONTEXT
Today bookmaker data lives in `apps/web/data/bookmakers.json` — static, no affiliate URL templates, no per-region targeting. We move it to a `Bookmaker` table so editors can update via DB without redeploy and so `AffiliateClick` can reference real rows.

### ACCEPTANCE CRITERIA
- Prisma `Bookmaker` model: id, code (unique slug like `sportybet`, `bet9ja`, `onexbet`, `betking`, `msport`, `pinnacle`), displayName, regions (Json — array of country codes), affiliateUrlTemplate (string with `{{var}}` placeholders), affiliateNetwork (string), defaultUtm (Json), logoUrl, isActive (bool, default true), createdAt, updatedAt.
- Migration ships SQL.
- A seed script `packages/db/seed/bookmakers.ts` populates the 6 above operators with placeholder affiliate URL templates (the real templates land via PR once GTM signs the affiliate deals — that's outside this sprint).
- Existing references to `apps/web/data/bookmakers.json` migrate to a server helper `lib/data/get-bookmakers.ts` that reads from DB with KV caching (60s TTL).
- Delete or empty the `bookmakers.json` (and ensure no remaining imports break).
- API helper `getBookmakersForRegion(region: string)` returns only books active in that region.

### DEPENDENCIES & RISKS
- **Depends on:** nothing (foundational data model).
- **Blocks:** C1 (best-odds rendering reads from this), C4 (affiliate template).
- **Risk:** the existing JSON has shape that components depend on; ensure the DB-backed helper returns a compatible shape so the diff is minimal in the consumer.
- **Risk:** KV unreachable → fall back to a 5-minute in-memory cache; never block the page render.

### DEFINITION OF READY
- [ ] Existing `bookmakers.json` shape reviewed and target schema agreed.
- [ ] Seed list (6 bookmakers + their regions) finalized in the ticket.
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| C5-T1 | Prisma model + migration | Schema + indices on (code, isActive). |
| C5-T2 | Seed script | 6 operators. Idempotent (upsert by code). |
| C5-T3 | `lib/data/get-bookmakers.ts` | DB-backed with KV cache + in-memory fallback. |
| C5-T4 | Migrate consumers | Update components reading `bookmakers.json`. Remove the file. |
| C5-T5 | Tests | Region filter; KV outage fallback; seed idempotency. |

---

## STORY C6 — UserPick CRUD + auto-settle on result
**Points: 5** · **Parent: EPIC-C** · **Owners: 1 BE + 1 FE** · **Branch: `feat/user-picks`**

### CONTEXT
S0 shipped the `UserPick` Prisma model. We now wire the API + UI to create picks from match detail and auto-settle them when `FixtureResult.upsert` runs.

### ACCEPTANCE CRITERIA
- `POST /api/picks` accepts `{ fixtureId, market, stake?, bookCode?, price? }` and creates a `UserPick` with `result = 'PENDING'`. Auth-required. Rate-limited (10/hr/user).
- `GET /api/picks` returns the current user's picks ordered by createdAt desc, paginated 20/page.
- `PATCH /api/picks/[id]` allows updating stake/bookCode/price while result is PENDING. Disallowed once result is WIN/LOSS/VOID.
- `DELETE /api/picks/[id]` only allowed while PENDING. Otherwise 409.
- Auto-settle hook: on `FixtureResult.upsert` (called from the existing `app/api/cron/daily-refresh/route.ts` settlement step), iterate all `PENDING` `UserPick` rows where `fixtureId` matches; compute outcome by comparing the user's `market` to the actual result; flip `result` to `WIN | LOSS | VOID`; set `settledAt`.
- A "Save this pick" button on the match detail page (Story C1) opens a small modal: pre-filled with model's recommended market; user can adjust stake (default ₦1,000); on confirm, calls `POST /api/picks`.
- AuditLog entries: `pick.create`, `pick.update`, `pick.delete`, `pick.settle`.
- E2E spec covers: signed-in user saves a pick from match detail → it appears in `/account/picks` (basic list, no styling yet) → settlement simulation moves it to WIN/LOSS.

### DEPENDENCIES & RISKS
- **Depends on:** S0 `UserPick` model (✅ Done), C1 (match detail page hosts the button).
- **Blocks:** any future dashboard rewrite that displays pick history (deferred).
- **Risk:** the daily-refresh route does a lot in one Vercel function. Adding the settlement loop could push it past `maxDuration`. Mitigation: process at most N picks per fixture per run (N = 1000); if more, log a warning — the worker decomposition in a later sprint will handle scale.
- **Risk:** "void" outcome handling for postponed matches — when `Fixture.status === 'POSTPONED'`, set `UserPick.result = 'VOID'`. Make sure the cron handles this branch.

### DEFINITION OF READY
- [ ] `UserPick` model fields confirmed.
- [ ] Settlement decision tree documented in ticket (WIN/LOSS/VOID outcomes by Fixture.status + result market).
- [ ] Reviewer assigned.

### Tasks
| Task | Subject | Description |
|---|---|---|
| C6-T1 | API routes | Create / list / update / delete with auth + rate-limit + audit. |
| C6-T2 | Settlement hook | Extend daily-refresh route's settlement step to update UserPick rows. |
| C6-T3 | "Save pick" modal on match detail | Pre-filled; submits; toast on success. |
| C6-T4 | Basic picks list `/account/picks` | No styling polish — just a list to verify data flow. Polished dashboard is a later sprint. |
| C6-T5 | E2E spec | End-to-end save + settle simulation. |

---

## Stretch (only if mid-sprint shows headroom)

Not committed at sprint planning. Pull these only if the team is ahead by mid-sprint:

- **D2 — Preferences API** (2 pts) — `User.preferences Json` field + GET/PATCH `/api/account/preferences`. Foundational for an onboarding wizard that lands in a later sprint.
- **D3 — Picks recommendation by preference** (2 pts) — predictions feed filtered by `user.preferences.leagues`. Cheap if D2 is in.

Do not pull stretch work without engineering-lead approval.

---

## Out of scope for this sprint (explicit)

These were considered and deferred:

- **Onboarding wizard (D1, 8 pts)** — needs design pass + 4 routes; doesn't ship without product/design partnership. Move to next sprint.
- **Dashboard rewrite (E05-S2-T3, 5 pts)** — depends on UserPick volume to look real. The C6 settlement is the prerequisite — UI rewrite next sprint.
- **Referrals UI (D4) + grant job (D5)** — defer until we have a clear paid-conversion baseline.
- **Methodology calibration plot (E1/E2/E3)** — depends on real backtest data accumulating, which depends on UserPick ledger maturing. Next sprint.
- **Soft-suspend worker (B6 / E02-S3-T4)** — backend cron concern; pairs with QStash worker decomposition.
- **Google OAuth client REGISTRATION** — human action (PM creates the Google Cloud project + OAuth credentials). The CODE wiring is A5; the keys come from PM.

---

## Story-points capacity check

| Engineer | Approx. capacity | Likely picks |
|---|---|---|
| BE-1 | 14 pts | B1 (3), B4 (5), C6 backend half (3), C5 (3) |
| BE-2 | 14 pts | B2 backend (3), B5 backend (2), C4 backend (2), A3 backend (3), A2 backend (2), B7 (2) |
| FE-1 | 14 pts | C1 (8), C2 (2), C3 (3), A5 (1) |
| FE-2 | 14 pts | C6 FE half (2), B2 FE (2), B3 (2), B5 FE (1), A2 FE (1), A3 FE (2), C4 FE (1), A5 (1) |

Math is approximate — sprint planning will rebalance. The point is: 54 points fits four engineers with PR-review slack.

---

## Sprint review demo plan (Mon 2026-06-22)

The engineering lead walks management through:

1. **Auth + account demo:** create a fresh user, verify email, log in via Google (mocked), view sessions, set advisory cap, simulate self-exclude → see suspended state on /predictions.
2. **Checkout flow:** click "Subscribe Monthly" → land on Paystack stub banner → click "Continue (simulated)" → webhook fires → /billing/thanks resolves to active → entitlement reflects.
3. **Match detail:** open a fixture → see model breakdown, value-bet chip on the strongest market, Kelly tool (signed in as Pro), bookmaker deeplinks (click → see 302 to a placeholder URL), save a pick → see it in `/account/picks`.
4. **Settle simulation:** trigger the daily-refresh manually → see the saved pick flip to WIN/LOSS.

If all four flows pass, the sprint is green.

---

— *Sprint S1 backlog · ApexPredict · Web Forx Global Inc. · 2026-06-07*
