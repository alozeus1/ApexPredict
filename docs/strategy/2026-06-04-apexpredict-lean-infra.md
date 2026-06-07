# ApexPredict — Lean Infrastructure & Cost Plan

**Version:** v1.0 · 2026-06-04
**Owner:** SRE + CTO
**Rule:** Free / dev tier during build (S0–S3). Upgrade per component only at the documented trigger. Full production stack switches on at S4 cutover.

---

## Two-tier model

| Phase | Calendar window | Target run-rate | Posture |
|---|---|---|---|
| **Build** | S0 → end of S3 (2026-06-05 → 2026-07-20) | **≤ US$50 / mo** | Free / hobby tiers; test-mode billing; sandbox KYC; preview deploys |
| **Pre-launch hardening** | S4 (2026-07-21 → 2026-08-03) | **~US$200 / mo** | Selective upgrades for load test + pen-test + soft beta |
| **Production** | from launch 2026-08-04 | **~US$600 / mo** at launch traffic | Full stack |

---

## Component-by-component plan

### Hosting & functions

| Component | Build phase | Upgrade trigger | Production |
|---|---|---|---|
| **Vercel** | Hobby (free) — preview + dev only. **Important:** Hobby allows only 1 cron / day; this is fine because S2 moves cron logic to QStash workers triggered by HTTPS. | (a) Launch day; (b) `bandwidth > 80 GB/mo`; (c) team members > 1 (Hobby is single-seat); (d) custom domain on prod | **Pro** (~$20 base + usage; budget ~$150/mo) |
| **DNS / WAF / CDN** | Cloudflare Free | (a) WAF custom rules needed (S4); (b) bot fight mode + advanced rate limiting | Cloudflare Free remains (Free tier covers WAF managed rules + bot fight mode); upgrade to Pro ($25/mo) only if image optimization / Polish is required |

### Database & cache

| Component | Build phase | Upgrade trigger | Production |
|---|---|---|---|
| **Neon Postgres** | Free tier (0.5 GB storage, 1 read replica, autopause). Single shared dev branch in S0; per-engineer branches from S1. | (a) Storage > 0.4 GB; (b) connection-limit issues with serverless; (c) need for non-autopause prod compute | **Scale** plan (~$70/mo at launch sizing) with always-on prod compute + replica |
| **Upstash Redis** | Free (10k req/day, 256 MB). Holds rate limits + cached fixtures payloads. | (a) > 7k req/day sustained; (b) need persistence > 256 MB | **Pay-as-you-go** (~$10–20/mo) |
| **Upstash QStash** | Free (500 msg/day). Workers are scheduled at low-frequency: fixture-sync 1× / 6h, odds-ingest 1× / 30 min during match windows, prediction 1× / 2h, settlement 1× / 1h, backtest 1× / day, notify 1× / day digest + on-demand alerts. Estimated msg/day during build: ~150. | (a) > 400 msg/day; (b) need scheduled tasks every minute | **Pay-as-you-go** (~$20–30/mo at launch) |

### Data providers

| Component | Build phase | Upgrade trigger | Production |
|---|---|---|---|
| **Football-Data.org** | Free (10 req/min, ~6 competitions). | Hard rate-limit hit (429s persist > 1h) | **Tier One** (£18/mo ≈ $23) — increases to 30 req/min |
| **Sportmonks** | **Free trial** (Bronze) for first 14 days — DO NOT use beyond that in build. Use as the failover only when Football-Data is down. | (a) Trial ends; (b) NPFL or AFCON coverage gap forces it | **Bronze** ($50/mo) or **Silver** (~$200/mo) at launch |
| **The Odds API** | Free (500 req/mo). Just enough for daily snapshot of NG-relevant fixtures during build. | (a) > 400 req/mo; (b) need pre-match + in-play feeds at launch | **Starter** ($30/mo, 20k req) |
| **OpenWeather** | Free (60 calls/min, 1M/mo). Plenty. | No upgrade needed for MVP | Free |
| **Injury feed** | Manual curated JSON for top leagues during build. RotoWire-lite trial in S2. | Coverage required for ≥ 6 leagues | **RotoWire-lite** or equivalent (~$50/mo) at launch |
| **NPFL odds** | Manual CSV upload via `/api/admin/odds/upload`. | Volume > 10 uploads/wk justifies a contractor scraper | Manual at launch; revisit v1.1 |

### Identity / KYC / Payments

| Component | Build phase | Upgrade trigger | Production |
|---|---|---|---|
| **Paystack** | Test mode (free). No real charges. | Cutover before first paying user | Live mode (1.5% capped at ₦2,000/txn — pay-as-you-go, no monthly) |
| **Flutterwave** | Test mode (free). | Same as Paystack | Live mode (pay-as-you-go) |
| **Smile ID** | Sandbox (free test calls). | First paying user requiring KYC | Pay-per-verification (~$0.50; budget ~$200/mo at launch) |

### Email / Notifications / Chat

| Component | Build phase | Upgrade trigger | Production |
|---|---|---|---|
| **Resend** | Free (100 emails/day, 3k/mo). | (a) > 80/day sustained; (b) dedicated IP for deliverability | **Pro** ($20/mo, 50k/mo, dedicated sub-IP) |
| **Telegram Bot** | Free (Bot API). No upgrade. | n/a | Free |
| **WhatsApp Business** | **Deferred to v1.1.** Collect opt-in only. | n/a | Defer |

### Observability

| Component | Build phase | Upgrade trigger | Production |
|---|---|---|---|
| **Sentry** | Developer (free) — 5k errors/mo, 7d retention. | (a) > 4k errors/mo (means we have a bug, not a scale issue); (b) > 7d retention required by counsel | **Team** ($26/mo) |
| **Axiom logs** | Free (0.5 GB/mo, 30d retention). | > 0.4 GB/mo | **Pro** ($25/mo) |
| **PostHog** | Free (1M events/mo). | Unlikely to exceed | Free |
| **Status page** | Better Uptime Free or Statuspage Hobby ($29/mo). | Launch day requires public status | Statuspage Hobby ($29/mo) |

### Storage

| Component | Build phase | Upgrade trigger | Production |
|---|---|---|---|
| **Cloudflare R2** | Free (10 GB storage, 1M class-A/mo, 10M class-B/mo). Hosts model pickles + OG image cache + audit-log cold export. | > 8 GB | Pay-as-you-go (~$5/mo at launch sizing) |

### Vault / secrets

| Component | Build phase | Upgrade trigger | Production |
|---|---|---|---|
| **1Password** Teams Starter ($19.95/mo, 10 users) **or** Doppler Free (3 users, 1 project) | **Doppler Free** during S0 → S1 (3 engineers); switch to 1Password Teams when team grows to 4+ | Team size > 3 | 1Password Teams (~$20/mo) |

### ML compute

| Component | Build phase | Upgrade trigger | Production |
|---|---|---|---|
| **Modal** (model serving) | Free tier ($30/mo credit). Stateless XGBoost endpoint loaded from R2. | Cold-start latency > 1s on warm; or > $30 credit/mo burn | Pay-as-you-go (~$20–50/mo) |
| **Local training** | Engineer's machine + GitHub Actions free runners for nightly retrain in S3+. | Retrain time > 30 min on Actions | Replicate or Modal training (~$20/mo) |

### Pen-test

| Component | Build phase | Production |
|---|---|---|
| External pen-test | n/a — book in S4 | One-off **$2,500–$5,000** in S4 (TIM Group, e-Watch, or HackerOne Managed). Budget separately from monthly run-rate. |

---

## Build-phase summary (target ≤ $50/mo)

| Item | Cost (USD/mo) |
|---|---|
| Vercel Hobby | $0 |
| Neon Free | $0 |
| Upstash Redis + QStash Free | $0 |
| Football-Data Free | $0 |
| The Odds API Free | $0 |
| OpenWeather Free | $0 |
| Sportmonks (14-day trial, then disabled) | $0 |
| Smile ID Sandbox | $0 |
| Paystack Test | $0 |
| Resend Free | $0 |
| Sentry Dev | $0 |
| Axiom Free | $0 |
| PostHog Free | $0 |
| Cloudflare Free | $0 |
| R2 Free | $0 |
| Doppler Free | $0 |
| Modal Free credit | $0 |
| **Misc buffer (domain renewal, fonts, etc.)** | ~$5–15 |
| **Build-phase total** | **~$5–15 / mo** |

The conservative budget cap of $50/mo gives us headroom for unexpected upgrades during S2 (e.g., Football-Data Tier One if rate-limits bite earlier than expected, ~$23/mo).

## Pre-launch hardening (S4, ~$200/mo)

Add: Statuspage Hobby ($29), Vercel Pro ($20), Resend Pro ($20), Sentry Team ($26), Axiom Pro ($25), Football-Data Tier One ($23), The Odds API Starter ($30). Pen-test is a separate one-off line item.

## Production launch (~$600/mo at launch traffic)

Per the original strategy doc, §7. Re-evaluate at month 1 against actual usage.

---

## Cost discipline rules

1. **No upgrade without a recorded trigger event.** Each upgrade must reference the trigger row in this doc. SRE files a one-line entry in `docs/runbooks/cost-upgrades.md` per upgrade.
2. **Hard caps where vendors offer them.** Set spend caps at 1.5× expected ceiling per service to prevent runaway bills.
3. **Bill-shock alerts to `cto@webforx.global` AND `sre@webforx.global`** at 80% of budget per service per month.
4. **Monthly cost review** on the first Tuesday — actuals vs. plan, attribution per epic.
5. **Free-tier kill rule** — if a vendor degrades their free tier, evaluate replacement before paying.
