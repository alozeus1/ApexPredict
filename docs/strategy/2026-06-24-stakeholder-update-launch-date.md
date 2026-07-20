# ApexPredict — Stakeholder Update

**To:** Executive Management, Web Forx Global Inc.
**From:** CTO Office
**Date:** 2026-06-24
**Re:** Sprint S0 + S1 foundation status · revised launch date · three decisions requested
**Status:** Action required — please respond by Friday 2026-06-26

---

## TL;DR

In the 20 days since we approved the 60-day plan, we shipped two full waves of foundation work — **47 of 177 backlog items now complete**, zero critical blockers, no security findings. We are requesting a **20-day slip on public launch from Monday 2026-08-04 to Monday 2026-08-24** to give the human engineering team the time the original calendar did not allow for. With the three approvals below, confidence in the new date is **high**.

---

## Where we are

| Wave | Window | Status |
|---|---|---|
| Sprint S0 — Foundation (CI, auth, payments scaffold, repositioning, locale gate) | Jun 5 → Jun 7 | **Shipped.** Merged to `develop` and `main` on Forgejo. |
| Sprint S1 — Autonomous-agent scaffolds (Paystack flow, self-exclusion, provider failover, SEO, admin tools) | Jun 24 | **Shipped today.** Six PRs merged. |
| Sprint S1 — Human engineering (account UX, billing UX, match-detail rewrite, user-pick ledger) | Jun 29 → Jul 10 | **Kicks off Monday.** |

**Backlog status:** 47 Done · 15 awaiting human action · 117 not started.

---

## What's now in production-ready code

- Real authentication (signup, login, password reset, Google login wired) with audit logging and session management.
- Database schema for users, subscriptions, picks, audit log, webhook deliveries.
- Paystack subscription flow scaffolded — checkout endpoint, webhook handler with signature verification, cancel logic. Runs in stub mode without live keys; engineers will wire live mode in Sprint S1.
- Functional responsible-gaming self-exclusion (regulatory-grade — required by NLRC posture).
- Provider failover system (when a data provider goes down, the system auto-switches).
- SEO foundation (route catalog, DB-driven sitemap).
- CI pipeline running on every PR — typecheck, lint, unit tests, end-to-end smoke, security scanning, secret-leak detection.
- All marketing copy repositioned as a "calibrated value-bet signal service" (not a win-rate oracle) — compliant with NLRC advertising standards.

---

## What slipped and why

The original plan assumed human engineering work would start Tuesday 2026-06-09. Two factors pushed that to Monday 2026-06-29:

1. **Procurement lead time** — Paystack live keys, Smile ID sandbox, Sportmonks, The Odds API, and Upstash all required corporate sign-ups. We staged them but they're not all in hand yet. Without them, engineers can build the scaffolding but can't demo end-to-end.
2. **Engineering team availability** — confirming the four-engineer team (2 backend, 2 frontend) ran into normal availability slippage.

Net result: human Sprint S1 starts 20 days later than planned. The foundation work done by the autonomous agent in that window was real — it bought back roughly 12 of those 20 days in compressed scope downstream — but the launch date still moves.

---

## Revised calendar

| Sprint | Dates | Theme |
|---|---|---|
| **S1 (human)** | Mon Jun 29 → Fri Jul 10 | Account UX, billing UX, match-detail rewrite, user-pick ledger |
| **S2** | Mon Jul 13 → Fri Jul 24 | Live odds integration, QStash worker decomposition, real Paystack flow |
| **S3** | Mon Jul 27 → Fri Aug 7 | Onboarding, dashboard rewrite, programmatic SEO leaf pages, Telegram bot |
| **S4** | Mon Aug 10 → Fri Aug 21 | Smile ID KYC, pen-test, load test, hardening, soft launch (1k closed beta) |
| **Public NG launch** | **Mon Aug 24** | PR coordinated with Punch, BusinessDay, TechCabal |

Holiday-period factor: none in scope. AFCON / Premier League pre-season traffic is the upside.

---

## Three decisions requested (by Fri Jun 26)

1. **Approve the revised launch date of Monday 2026-08-24.** A 20-day slip from the original Monday 2026-08-04.
2. **Greenlight the vendor budget.** Build phase is ≤ **$50/month** through Jul 20. Production run-rate at launch is ~**$600/month** plus Paystack fees (1.5% capped at ₦2,000 per transaction). Itemised plan in `docs/strategy/2026-06-04-apexpredict-lean-infra.md`.
3. **Sign the Nigerian gaming counsel retainer.** Required for the NLRC opinion letter and ongoing advertising-standards review. We have three firm shortlist; recommended choice + retainer terms attached separately.

---

## Top three risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | NLRC reclassifies prediction analytics as a licensed activity | Medium | High | Counsel retained; permit packet ready as a fallback. Latest status: opinion-letter brief filed; awaiting response. |
| 2 | Paystack live-mode corporate KYC delay for Web Forx Technology Limited | Medium | Medium | PM owns submission by Jul 5; one-week buffer built into S2. |
| 3 | Key-engineer departure during the four-week push | Low | High | Pair on critical paths; runbooks per module; cross-training in week 1. |

---

## What's going well

- Zero critical security findings from CI (CodeQL + gitleaks running on every PR).
- 100% of agent-shipped code passed local quality gates before merge — no regressions.
- The "value-bet signal service" repositioning de-risks the regulatory posture meaningfully — counsel's preliminary read is favourable.
- The codebase is now mature enough that bringing a new engineer up takes about a day, not a week.

---

## What I need from you specifically

- **CEO** — sign the gaming counsel retainer (decision #3).
- **CFO** — approve the vendor budget envelope (decision #2).
- **Operations** — confirm the launch date works against the Q3 marketing-spend window (decision #1).

I'll send a Calendly link for a 30-minute review on Thursday or Friday if you'd prefer to discuss live. Otherwise, an email "approved" against each of the three decisions is fine.

---

*Confidence in the revised 2026-08-24 launch date: **HIGH** with the three approvals above. Without them, the date slips further — likely into early September.*

— *CTO Office · Web Forx Global Inc. · 2026-06-24*
