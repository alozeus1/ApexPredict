# Sprint S1 Kickoff — Agenda

**When:** Monday 2026-06-29 · 10:00 → 11:30 WAT (90 minutes)
**Where:** Conference room + Google Meet for any remote attendees
**Facilitator:** Engineering Lead
**Scribe:** PM
**Attendees:** 2 BE + 2 FE engineers · PM · Engineering Lead · CTO (optional)

**Sprint window:** Mon 2026-06-29 → Fri 2026-07-10 (10 working days)
**Sprint goal in one sentence:** *By Friday Jul 10 demo, a real user can sign up, log in, manage account + RG preferences, subscribe via Paystack (test mode), and view a per-fixture page with bookmaker odds comparison + save a pick that auto-settles when the result lands.*

---

## Pre-read (mandatory, sent Friday Jun 26)

Engineers must arrive having read:

- `docs/strategy/2026-06-07-sprint-s1-engineering-backlog.md` — the 15 stories you'll be claiming.
- The team brief (paste from PM's Slack message of 2026-06-24).
- The CHANGELOG `[Unreleased]` section to see what just shipped.

If anyone arrives without reading the backlog, reschedule them out — the meeting is not a substitute for the reading.

---

## Agenda

### 0:00 → 0:05 · Welcome + sprint goal (5 min)
**Facilitator:** Engineering Lead
- Read the sprint goal aloud.
- Confirm attendance + roles.
- Confirm the demo date (Fri Jul 10, 2pm WAT).

### 0:05 → 0:15 · Foundation recap (10 min)
**Facilitator:** CTO or Lead

Walk through what shipped in S0 + the agent's S1 run that engineers will build on:

- Auth.js v5 + database tables for users, subscriptions, picks, audit.
- Entitlement matrix in `lib/entitlements.ts`.
- Audit helper in `lib/audit.ts`.
- Paystack scaffold in `lib/billing/*` (stub mode).
- Self-exclusion API + modal.
- Provider failover in `lib/providers/failover.ts`.
- SEO route catalog in `lib/seo/routes.ts`.

**Action:** Each engineer opens these files on their laptop during the recap.

### 0:15 → 1:10 · Story walkthrough by epic (55 min, ~18 min per epic)

For every story:

1. Lead reads the story title + points aloud.
2. Engineer who picks it walks through Definition of Ready out loud.
3. If any DoR item is unchecked, decide: resolve now, defer story, or split.
4. Engineer commits owner + finishing-by date.
5. Move on. **Hard cap: 4 minutes per story.**

#### Epic A — Account & Identity Polish (10 points, 3 stories)
- **A2** — Sessions list with revoke · 3 pts · *1 BE + 1 FE*
- **A3** — RG controls UI · 5 pts · *1 BE + 1 FE* — depends on counsel-reviewed copy by Tue Jun 30
- **A5** — Google login button · 2 pts · *1 FE* — gated on Google OAuth client registration (PM action by Wed Jul 1)

#### Epic B — Subscription Checkout & Lifecycle (20 points, 6 stories)
- **B1** — Provider adapter interface · 3 pts · *1 BE* — pull this first; B2/B4/B5 depend on it
- **B2** — Checkout API + page · 5 pts · *1 BE + 1 FE*
- **B3** — Billing thanks page · 2 pts · *1 FE*
- **B4** — Paystack webhook handler · 5 pts · *1 BE*
- **B5** — Cancel-at-period-end · 3 pts · *1 BE + 1 FE*
- **B7** — Replay CLI · 2 pts · *1 BE*

#### Epic C — Predictions UX v1 + Pick Ledger (24 points, 6 stories)
- **C5** — Bookmaker model + seed · 3 pts · *1 BE* — pull first; C1 and C4 depend on it
- **C1** — Match detail rewrite · 8 pts · *1 BE + 1 FE* — biggest story; chunk it
- **C2** — Value-bet chip + tooltip · 2 pts · *1 FE*
- **C3** — Kelly calculator (Pro-gated) · 3 pts · *1 FE*
- **C4** — Bookmaker deeplink + affiliate tracking · 3 pts · *1 BE + 1 FE*
- **C6** — UserPick CRUD + auto-settle · 5 pts · *1 BE + 1 FE*

**Suggested dependency order to discuss:** B1 → B2/B4 → B5 → B3 (Epic B chain); C5 → C1/C4 → C6 → C2/C3 (Epic C chain). Stretch stories `D2` and `D3` only after the team is ≥ 80% of the way through committed work.

### 1:10 → 1:20 · Logistics + commitments (10 min)
**Facilitator:** PM

- **Daily standup** — 09:00 WAT every weekday in Slack huddle. 15 minutes hard cap. Format: yesterday / today / blockers.
- **PR review SLA** — 24 hours from the moment "review requested" is tagged. Late reviews surface in standup.
- **Branching** — every feature off `develop`. No direct push to `develop` or `main`. PR title in Conventional Commits style (`feat(billing): …`, `fix(auth): …`).
- **Quality gate per PR** — typecheck + lint + test + e2e smoke. Paste output into the PR body.
- **Merge cadence** — open PRs early (draft is fine). Avoid Friday-evening merges unless you'll be on-call through the weekend.
- **Mid-sprint check-in** — Wed Jul 3, 09:30 WAT, 30 minutes. Re-baseline if any story is behind.
- **Demo prep** — Thu Jul 9 EOD, dry-run with PM. Anything not in `develop` by Thu noon misses the demo.
- **Demo** — Fri Jul 10, 14:00 WAT. Attendance: full team + management observers welcome.
- **Retrospective** — Fri Jul 10, 15:30 WAT after demo. 45 minutes.

### 1:20 → 1:25 · Risks + asks (5 min)
**Facilitator:** Lead

Read the top three risks aloud and confirm an owner for each:
1. **Vendor keys not in vault by Mon Jul 6** (blocks E2E demo) — owner: PM
2. **Counsel-reviewed RG copy not ready by Tue Jun 30** (blocks A3 merge) — owner: PM
3. **Neon migrations from PR #11 not applied by EOD Mon** (blocks B2/B4 E2E) — owner: SRE / Engineering Lead

### 1:25 → 1:30 · Sprint commitment (5 min)
**Facilitator:** Lead

- Lead reads the committed story list back to the team.
- Each engineer says "committed" or names the specific story they're hesitant on.
- PM updates the board, sets the sprint to "in progress", sends a recap in Slack within 1 hour.

---

## Definition of Done (per story)

- All acceptance criteria pass.
- Quality gate green on the PR.
- One peer reviewer approved.
- Merged to `develop`.
- Story moved to Done on the board with the merge SHA in the comment.

## Definition of Ready (per story — pulled into the sprint)

- AC reviewed and unambiguous.
- Designs / wireframes linked (where UI is involved).
- Required env vars listed.
- Dependencies identified and either resolved or scoped out.
- Owner assigned.
- Reviewer assigned.

(Each story in the backlog has its own DoR checklist below the AC — tick during walkthrough.)

---

## Velocity check

| Engineer | Capacity (pts) | Committed |
|---|---|---|
| BE-1 | 14 | _to fill during meeting_ |
| BE-2 | 14 | _to fill during meeting_ |
| FE-1 | 14 | _to fill during meeting_ |
| FE-2 | 14 | _to fill during meeting_ |
| **Total** | **56** | **54 committed (96% utilisation)** |

If commitments exceed 60 pts → drop the lowest-priority story before signing off.

---

## Sprint demo dry-run agenda (Thu Jul 9, 15:00 WAT)

A short rehearsal with PM acting as management. ~30 minutes. Each demo leg below has a named owner:

1. **Auth + account** — signup → verify → login (Google mocked) → sessions list → revoke → advisory cap → self-exclude → suspended banner. *Owner: FE-2.*
2. **Checkout flow** — subscribe Monthly → stub banner → simulate webhook → thanks page resolves to active → entitlement visible. *Owner: BE-2.*
3. **Match detail** — open a fixture → model breakdown + value-bet chip + Kelly tool + bookmaker deeplinks → save pick. *Owner: FE-1.*
4. **Settle simulation** — trigger daily-refresh manually → saved pick flips WIN/LOSS. *Owner: BE-1.*

If any of the four is red at dry-run, all hands until it's green by Fri morning.

---

## Out of scope this sprint (don't pull from these)

- Onboarding wizard (D1)
- Dashboard rewrite (E05-S2-T3)
- Methodology calibration plot
- Referrals UI + grant job
- Soft-suspend worker
- ML training (Modal endpoint, XGBoost)
- Programmatic SEO leaf pages (`/free-tips/...` actual rendering)
- Telegram bot wiring
- Push notifications
- WhatsApp Business

These land in S2/S3. Resist scope creep.

---

## What I (PM) commit to during the sprint

- Vendor keys (Paystack test, Upstash, Sportmonks, The Odds API, Resend) in the vault by EOD Mon Jul 6.
- Counsel-reviewed RG copy delivered by Tue Jun 30 EOD.
- Standup attendance, blocker chasing, mid-sprint check-in.
- Demo invites + management observers confirmed by Wed Jul 8.

---

*Print this page. Bring it to the meeting. Tick the boxes live. Send the recap in Slack within an hour of the meeting ending.*

— *Sprint S1 Kickoff Agenda · ApexPredict · 2026-06-24 draft*
