---
title: ApexPredict AI — Sub-project 1 · Foundation + Marketing Rebuild
status: draft
version: 0.1.0
date: 2026-05-21
authors: Claude (assistant) + ocheme
parent_project: ApexPredict AI (by Maralito Labs)
parent_program_decomposition:
  - 1. Foundation + Marketing Rebuild  ← this spec
  - 2. Data Platform
  - 3. Prediction Engine
  - 4. Auth + Accounts
  - 5. Predictions UI + Match Detail + Dashboard
  - 6. Premium + Payments
  - 7. Admin / Agent Ops
  - 8. Compliance, Observability & Launch
---

# Foundation + Marketing Rebuild — Design Spec

## 0. Context

ApexPredict AI is a sports prediction intelligence platform built on an ensemble engine (ELO + Poisson + xG) operated by Maralito Labs. The existing artifact in this repository is only a compiled Vite/React SPA bundle (`app/dist/`) with no source. This sub-project rebuilds the foundation in Next.js 15 with a faithful-in-soul refresh of the existing visual language, ships a deployable waitlist + marketing site with a working canned-data predictions surface, and sets the architectural seams for the seven downstream sub-projects.

The earlier brainstorming session (this conversation) reverse-engineered the original feature surface from the bundle's preserved `code-path` props and locked the major decisions. This spec consolidates those decisions and adds the implementation contract.

## 1. Goals

Ship a deployable, demo-able **v0.1.0** that:

- Renders all 11 landing sections (Hero / Predictions Preview / Methodology / Backtest / Stats / Network / Premium / HowToUse / CTA / Footer / Sidebar) refreshed but faithful in soul to the original.
- Renders a working Predictions feed and Match Detail page from canned JSON fixtures (looks alive without a backend).
- Captures emails into a real waitlist (Postgres + Resend verification + referral tokens).
- Carries the Seedance hero square embed (autoplay, muted by default, unmute affordance, reduced-motion fallback) plus a Playwright script that captures the 8 reel reference stills reproducibly.
- Ships full compliance scaffolding: edge geo-fence, 18+ age gate, RGS banner, GDPR cookie consent, full Legal Modal (Privacy / Terms / Cookies / Disclaimer using the legal copy already drafted in the bundle).
- Ships next-intl i18n with EN populated and ES / YO / HA / ZU stubbed (community translation status flagged in the switcher).
- Lighthouse mobile ≥ 95 across Performance / Accessibility / Best Practices / SEO on landing + match-detail + premium pages.
- Deploys to Vercel from `main` with preview deployments on PR. Pipeline file committed but stubbed for manual activation per the user instruction "don't create a pipeline yet."

## 2. Non-goals (deferred to later sub-projects)

| Capability | Sub-project | Rationale |
|---|---|---|
| Live fixture/odds ingestion | 2 | Needs provider integration + production schema |
| ELO / Poisson / xG model implementations | 3 | Needs worker runtime + backtest harness |
| Real auth + sessions | 4 | NextAuth integration scoped separately |
| Predictions feed wired to live DB | 5 | Depends on 2 + 3 |
| Stripe / PayPal live | 6 | Entitlement engine + webhook reliability |
| Agent dashboard with real heartbeats | 7 | Worker runtime + admin auth |
| Status page, on-call rotation, runbooks | 8 | Operational readiness |
| Native mobile apps | future | Out of MVP entirely |
| Real-time alerts (Telegram / SMS) | 6 | Premium feature |

## 3. Architecture

```
                            ┌─────────────────────────┐
   Visitor ─── Vercel Edge ─┤ Geo-fence middleware    │
                            │ Locale negotiation      │
                            │ Bot / abuse rate limit  │
                            └────────────┬────────────┘
                                         │
                            ┌────────────▼────────────┐
                            │ Next.js 15 (App Router) │
                            │ apps/web                │
                            │ RSC by default          │
                            │ Static where possible   │
                            └──────┬────────┬─────────┘
                                   │        │
                ┌──────────────────┘        └─────────────────┐
                │                                              │
        ┌───────▼───────┐                              ┌───────▼───────┐
        │ Resend        │                              │ Neon Postgres │
        │ verification  │                              │ via Prisma    │
        │ + welcome     │                              │ (waitlist,    │
        └───────────────┘                              │  consent,     │
                                                       │  tokens,      │
                                                       │  geo_block)   │
                                                       └───────────────┘
        ┌──────────────┐         ┌──────────────────┐
        │ Vercel KV    │ ◄─────  │ Static fixtures  │
        │ (rate limit) │         │ apps/web/data/*  │
        └──────────────┘         │ canned matches   │
                                 │ agents, pricing  │
                                 └──────────────────┘
```

Inngest, model packages, payment, and auth are intentionally absent. Interfaces are designed so they slot in without rework.

## 4. Repo layout (monorepo, pnpm + Turborepo)

```
apexpredix/
├── apps/
│   └── web/                          # Next.js 15 (App Router)
│       ├── app/
│       │   ├── [locale]/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx                       # / landing
│       │   │   ├── predictions/page.tsx
│       │   │   ├── predictions/[matchId]/page.tsx
│       │   │   ├── methodology/page.tsx
│       │   │   ├── how-it-works/page.tsx
│       │   │   ├── premium/page.tsx
│       │   │   ├── legal/[doc]/page.tsx           # doc ∈ {privacy,terms,cookies,disclaimer}
│       │   │   ├── blocked/page.tsx
│       │   │   ├── under-age/page.tsx
│       │   │   └── thank-you/page.tsx
│       │   ├── api/
│       │   │   ├── waitlist/route.ts
│       │   │   ├── waitlist/verify/route.ts
│       │   │   ├── waitlist/count/route.ts
│       │   │   ├── consent/route.ts
│       │   │   ├── csp-report/route.ts
│       │   │   └── health/route.ts
│       │   ├── opengraph-image.tsx
│       │   ├── sitemap.ts
│       │   ├── robots.ts
│       │   └── manifest.ts
│       ├── components/
│       │   ├── sections/   (Hero, PredictionsPreview, Methodology, Backtest, Stats, Network, Premium, HowToUse, CTA)
│       │   ├── match/      (MatchCard, MatchDetail, ValueBetChip, ConfidenceBar, OddsCompare, ModelBreakdown)
│       │   ├── nav/        (Sidebar, MobileNav, SettingsPanel, LanguageSwitcher, ThemeToggle, RegionPicker)
│       │   ├── compliance/ (AgeGate, RGSBanner, CookieConsent, GeoBlockedScreen)
│       │   ├── legal/      (LegalModal, LegalPage, MDXComponents)
│       │   └── reel/       (HeroReel)
│       ├── data/
│       │   ├── fixtures.json
│       │   ├── agents.json
│       │   ├── pricing.json
│       │   └── bookmakers.json
│       ├── messages/
│       │   ├── en.json
│       │   ├── es.json
│       │   ├── yo.json
│       │   ├── ha.json
│       │   └── zu.json
│       ├── lib/
│       │   ├── compliance/  (blocklist.ts, age.ts, consent.ts, rgs.ts)
│       │   ├── geo.ts
│       │   ├── locale.ts
│       │   ├── email.ts
│       │   ├── hash.ts
│       │   ├── rate-limit.ts
│       │   ├── analytics.ts
│       │   └── seo.ts
│       ├── middleware.ts
│       ├── playwright.config.ts
│       ├── next.config.mjs
│       └── scripts/capture-reel-stills.ts
├── packages/
│   ├── ui/                  # shadcn primitives + design tokens + Tailwind preset
│   ├── db/                  # Prisma schema + client + migrations
│   ├── email/               # React Email templates
│   ├── config/              # shared eslint, tsconfig, tailwind preset
│   └── types/               # shared domain types: Match, Prediction, Agent, PricingRegion, Bookmaker
├── docs/
│   ├── superpowers/
│   │   ├── specs/
│   │   │   └── 2026-05-21-foundation-marketing-rebuild-design.md
│   │   └── plans/           (filled in writing-plans step)
│   ├── compliance/
│   │   └── blocklist-history.md
│   └── runbooks/            (added in sub-project 8)
├── .changeset/
├── .github/workflows/
│   └── ci.yml               # committed, stubbed (workflow_dispatch only) until activation
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

## 5. Routing and i18n

### 5.1 Routes

| Path | Render | Notes |
|---|---|---|
| `/[locale]` | Static (RSC) | Landing — 11 sections, below-fold lazy-mounted |
| `/[locale]/predictions` | ISR 60s | Full feed from `data/fixtures.json` |
| `/[locale]/predictions/[matchId]` | ISR 60s + `generateStaticParams` | Match detail |
| `/[locale]/methodology` | Static | Standalone deep page |
| `/[locale]/how-it-works` | Static | Standalone |
| `/[locale]/premium` | Static | Standalone |
| `/[locale]/legal/[doc]` | Static MDX | `doc ∈ {privacy, terms, cookies, disclaimer}` |
| `/[locale]/blocked` | Static | Geo-fence landing |
| `/[locale]/under-age` | Static | Age-gate "under 18" landing |
| `/[locale]/thank-you` | Static | Post-verification confirmation |
| `/api/waitlist` | Edge POST | Validates + rate-limits + persists + emails |
| `/api/waitlist/verify` | Edge GET | Confirms token + redirects |
| `/api/waitlist/count` | Edge GET | Verified-only count, ISR-cached 5min |
| `/api/consent` | Edge POST/GET | Upsert + retrieve cookie consent |
| `/api/csp-report` | Edge POST | CSP violation sink |
| `/api/health` | Edge GET | `{ ok, build, time }` |
| `/sitemap.xml` | Dynamic | Locale × route × matchId |
| `/robots.txt` | Static | Allow all except `/api/*`, `/blocked`, `/under-age`, `/dev/*` |

### 5.2 Locale strategy

- Library: **next-intl** (best Next 15 App Router story; native RSC; no client cost for static dictionaries).
- All 5 locales prefixed in URL for SEO clarity (`/en/`, `/es/`, `/yo/`, `/ha/`, `/zu/`).
- `/` 308-redirects to negotiated locale.
- Middleware negotiation order: `apexpredix-language` cookie → `Accept-Language` header → Vercel `request.geo` region heuristic → fallback `en`.
- Dictionaries: `apps/web/messages/<locale>.json`. EN fully populated. Others machine-translated stubs flagged via `_meta.status = "beta"` and rendered with a "Community translation in progress — improve this →" footer chip linking to CONTRIBUTING.
- Persistence: `apexpredix-language` cookie (1y) + localStorage mirror (matches original key).
- Formatting: `Intl.DateTimeFormat` / `Intl.NumberFormat` keyed off locale + region (region drives currency, locale drives language — kept independent because Nigerian-EN is a real audience).
- No RTL needed in v1.

## 6. Sections

### 6.1 Hero
`<HeroReel>` square on the right at `≥md`, below copy at mobile. Headline "Built on Mathematical Edge" / sub "AI Sports Intelligence — built on ELO + Poisson + xG ensemble." Live pill `● 14 agents active • 2.4M events/hr` with animated count. Primary CTA "Reserve Premium Seat" → scrolls to CTA section; secondary "See Live Predictions" → `#predictions`.

### 6.2 Predictions Preview
3-col grid (desktop) / horizontal snap-scroll (mobile). 6 cards from fixtures flagged `featured`. Card: teams, league, kickoff (locale-formatted), confidence bar, top pick chip, value-bet amber chip if `valueBet`, model-version footer `Poisson-xG v3.2`. Click → match detail. Footer link "Open Full Predictions →" to `/predictions`.

### 6.3 Methodology
Three glass cards (ELO / Poisson / xG) → light-beam merge into "Ensemble" badge. Kelly card: `b = odds-1, p = probability, q = 1-p — we use ¼ Kelly for safety`. Read-more link → `/methodology`.

### 6.4 Backtest
Sparkline + numbers grid (Total Staked / Total Returned / Net Profit / ROI / Win Rate / Active Streak). Toggle `Flat $10` vs `¼ Kelly`. Canned 200-event dataset. Disclaimer: "Simulates $10 flat stake on each of 10 historical matches • Past performance ≠ future."

### 6.5 Stats — "Numbers That Speak"
Count-up tiles on viewport entry: 89.3% Accuracy / 14 Leagues / 7 Sports / 2.4M events/hr / +8.5% ROI / Last 200 events.

### 6.6 Network (Live Intelligence Grid)
4-col responsive grid of 14 agent tiles from `agents.json`. Each tile: name, capability one-liner, status dot (live = pulsing green), last heartbeat ("±5s ago" recomputed on render for liveness), 7-point sparkline. Footer: "Agents self-update every 2 hours. No human intervention needed."

Agent roster (the 14):
1. Fixture-Sync — pulls fixtures from provider
2. Odds-Ingest — pulls odds per book per market
3. Team-Stats — refreshes xG / form / injuries
4. ELO-Updater — post-match ELO recompute
5. Poisson-Predictor — score-line probabilities
6. xG-Modeler — expected goals model
7. Ensemble-Aggregator — blends 4/5/6 → confidence
8. Value-Hunter — Kelly-sized value bets
9. Line-Movement — odds drift / steam detection
10. Settlement — post-match outcome resolution
11. Bankroll-Tracker — per-user ROI / streaks
12. Backtest — nightly rolling sim
13. Heartbeat / Self-Healer — 2h health checks + retries
14. Content-Localizer — per-locale write-ups

These names + capabilities populate `data/agents.json` and are the implementation contract that sub-projects 2 and 3 must honour.

### 6.7 Premium Features
Free-vs-Premium comparison table (4 vs 10 predictions/day, basic vs deep analysis, no vs value-bet alerts, no vs Kelly calc, no vs Telegram alerts). Pricing card with region selector sourced from middleware geo header, user-overridable: NGN -85% via PPP, USD base, GBP, EUR, ZAR, KES. CTAs: "Start Free" (waitlist) / "Reserve Premium Seat" (waitlist + `premiumIntent=true` tag).

### 6.8 How To Use
4 numbered steps with custom icons: Pick region → Browse predictions → See value bets → Stake responsibly. No scroll-jacking.

### 6.9 CTA / Waitlist
Hero-strip background. Headline "Join the Inner Circle." Live counter "<count> analysts and bettors are on the waitlist" — DB-backed via `/api/waitlist/count`, ISR 5min, baseline 14,203 seeded. Email input + region pre-filled from geo + 18+ checkbox + Turnstile + honeypot. POST `/api/waitlist` → confirmation modal + Resend transactional + share-link with referral token.

### 6.10 Footer
4 columns (Product / Methodology / Legal / Company), language switcher mirror, currency switcher mirror, social links, "Powered by Maralito Labs", 18+ badge, RGS partner links (BeGambleAware, GamCare, ConnexOntario).

### 6.11 Sidebar / Top nav
Sticky left rail at `≥lg`; top bar + hamburger at `<lg`. Items: Predictions, Methodology, Backtest, Network, **Dashboard** (locked, badge "Sign in"), Premium, How to Use, Help. `<SettingsPanel>` slide-in: theme / language / region / cookie prefs / clear consent.

### 6.12 Match Detail page (`/predictions/[matchId]`)
- Header strip: teams + league badge + kickoff (locale-formatted)
- **Ensemble verdict card**: top pick + confidence + value-bet flag
- **Odds comparison strip**: 3–5 bookmakers; "Best Odds: Pinnacle 1.65" highlighted; `<BettingLinks>` filtered to books licensed in the visitor's region
- **Model breakdown**: ELO contribution bar + Poisson scoreline heatmap + xG split
- **Narrative**: "Why Under 2.5 Hits" canned per match in v1
- **Track this pick** button — locked, opens waitlist modal
- Persistent RGS banner
- JSON-LD `SportsEvent` + `BreadcrumbList` in head

### 6.13 Legal pages
Privacy / Terms / Cookies / Disclaimer. Rendered both as standalone `/legal/<doc>` pages (SEO) and inside `<LegalModal>` triggered from the footer. Copy lifted verbatim from the bundle, where it was already drafted by counsel — see `docs/compliance/blocklist-history.md` for any future changes. MDX with left-side table-of-contents on desktop.

### 6.14 Static data files (v1)

| File | Shape | Approx size |
|---|---|---|
| `data/fixtures.json` | ~30 matches (EPL / LaLiga / Bundesliga / NBA / ATP) — `{id, sport, league, home, away, kickoff, odds:{bookCode:price}[], model:{elo,poisson,xg,ensemble,confidence}, topPick, valueBet, narrative}` | ~50 KB |
| `data/agents.json` | 14 agents per roster above — `{id, name, capability, heartbeatJitterSec, sparkline:number[7]}` | ~3 KB |
| `data/pricing.json` | region → `{currency, monthly, yearly, pctOffBase}` | ~1 KB |
| `data/bookmakers.json` | book code → `{name, regions, deeplink, logoUrl}` | ~2 KB |

Authoritative types live in `packages/types` so sub-project 2 can swap JSON for live DB without component churn.

## 7. Compliance

### 7.1 Edge geo-fence

- `apps/web/middleware.ts` reads `request.geo.country` and `request.geo.region` (Vercel).
- Matches against `apps/web/lib/compliance/blocklist.ts`:
  ```ts
  export const BLOCKLIST = {
    countries: ['CN','KP','IR','CU','SA','AE','SG','FR'],
    usStates:  ['WA','ID','CT','TN','HI'],
  } as const;
  ```
- Blocked → middleware **rewrites** to `/[locale]/blocked` (URL stays the same as requested) and sets response status to **451 Unavailable For Legal Reasons**. Page body shows the reason code and counsel contact. No HTTP redirect — rewrites preserve the original URL for bookmark/referrer fidelity and avoid leaking the existence of the blocked page as a separate route.
- Flag: `COMPLIANCE_GEOFENCE_ENABLED` (env). Bump `COMPLIANCE_BLOCKLIST_VERSION` to invalidate edge cache after legal updates.
- Each block writes a row to `GeoBlockEvent` (ipHash-only) for telemetry.

### 7.2 18+ Age Gate

- `<AgeGate>` first-visit-per-device modal. Cookie `apexpredix-age-confirmed=1` (30d).
- Buttons: "I am 18 or older" → close; "I am under 18" → `/[locale]/under-age` with help resources.
- Focus-trapped, `aria-modal="true"`, ESC disabled (regulated content), full keyboard navigation.
- DOB field deferred to premium signup in sub-project 6. v1 is checkbox attestation only.

### 7.3 RGS banner

- `<RGSBanner>` slim persistent banner on prediction surfaces only (not on legal / blocked / under-age / age-gate).
- Per-region copy and helpline:

| Region | Helpline |
|---|---|
| UK | BeGambleAware 0808 8020 133 |
| US | 1-800-GAMBLER |
| NG | Nigerian Gambling Regulatory Helpline |
| ZA | National Responsible Gambling Programme 0800 006 008 |
| KE | BCLB Helpline |
| EU (other) | BeGambleAware fallback |

- Dismiss-for-session button; banner re-appears next session.

### 7.4 GDPR cookie consent

- `<CookieConsent>` banner on first load: **Accept All / Reject All / Customize**.
- Categories: Essential (always on), Analytics, Preferences (theme/lang/region), Marketing (placeholder bucket, empty in v1).
- Stored in `CookieConsent` table + cookie `cookie-consent` (13mo per ICO) — value is base64 JSON of choices.
- Vercel Analytics + Speed Insights mount **only after Analytics consent**, via a client gate.
- "Manage cookies" link in footer + SettingsPanel reopens the banner.
- `POST /api/consent` writes; `GET /api/consent` reads for SSR rehydration.

### 7.5 Anti-abuse on waitlist

- Vercel KV sliding-window: 5 req / IP / hour, 50 req / IP / day on `/api/waitlist`.
- Hidden honeypot input + Cloudflare Turnstile token, both required to pass server validation.
- Disposable-email-domain check (embedded list, ~5 KB) — soft reject with friendly error message.
- Email verification required before signup counts toward the public counter (prevents bot inflation).

## 8. SEO

- Next 15 Metadata API per route: unique title (≤60ch), description (150–160ch), canonical, OG, Twitter `summary_large_image`.
- `hreflang` for all 5 locales + `x-default → /en`.
- Dynamic OG: `opengraph-image.tsx` per segment; match-detail OG renders the actual confidence card to PNG (CTR win).
- JSON-LD:
  - `Organization` (root layout): name "ApexPredict AI", parent "Maralito Labs", logo, sameAs socials, contactPoints `help@`/`billing@`/`legal@`/`privacy@apexpredix.ai`
  - `WebSite` + `SearchAction` (predictions search)
  - `BreadcrumbList` per inner page
  - `SportsEvent` per `/predictions/[matchId]`
  - `FAQPage` on `/how-it-works`
  - `Article` on `/methodology`
- `sitemap.ts`: dynamic, locale × route × matchId from fixtures.
- `robots.ts`: allow all, block `/api/*`, `/blocked`, `/under-age`, `/dev/*`. Sitemap referenced.
- `manifest.ts`: PWA-ready, theme `#0A0A0A`, name "ApexPredict AI", icons 192 / 512 / maskable.

## 9. Performance budget

| Metric | Target |
|---|---|
| Lighthouse mobile (Perf / A11y / Best / SEO) | ≥ 95 |
| LCP | < 2.0 s |
| INP | < 200 ms |
| CLS | < 0.05 |
| Route JS gzipped | ≤ 90 KB per route |
| Total transferred at first paint (landing) | ≤ 350 KB excluding hero MP4 |

Tactics:
- Fonts via `next/font` (Inter variable), `display: swap`, subset Latin + a few extended glyphs for ES / YO / HA / ZU.
- Images: `next/image` AVIF→WebP→JPEG with explicit width/height. `priority` only on Hero illustration (not the video).
- Hero MP4: `<video preload="metadata">` + ~12 KB AVIF poster; defers the heavy bytes from LCP.
- Framer Motion: `LazyMotion` + `domAnimation` (saves ~30 KB) + `useReducedMotion` on every animated component.
- RSC by default. `'use client'` only on: `HeroReel, SettingsPanel, CookieConsent, AgeGate, LanguageSwitcher, ThemeToggle, WaitlistForm, BettingLinks`.
- Edge cache static; ISR 60s for fixture-driven; HTML compression on.
- `@next/bundle-analyzer` CI gate: any route bundle >10% larger PR-over-PR fails the build.

## 10. Accessibility — WCAG 2.2 AA

- **Fix the bundle's viewport bug**: replace `maximum-scale=1.0, user-scalable=no` with `width=device-width, initial-scale=1, viewport-fit=cover`.
- Semantic landmarks: `<header> <nav> <main> <aside> <footer>`; skip-to-content link first focusable.
- Contrast verified: cyan `#22d3ee` on `#0A0A0A` = 9.4:1 (AAA); amber accents pass AA.
- Focus-visible ring on every interactive: cyan, 2px solid, 2px offset.
- Keyboard: full nav; ESC closes modals (except age gate, regulated); tab order documented in `docs/accessibility/keyboard-map.md`.
- ARIA: `aria-label` on icon-only buttons; `role="status"` + `aria-live="polite"` on agent heartbeat updates; `aria-current` on active nav.
- `prefers-reduced-motion`: HeroReel shows poster + visible play button; Framer animations disabled.
- Forms: `<label>` per input; `aria-describedby` for help and errors; top-of-form error summary with `role="alert"`.
- Manual screen-reader sweep before merge: VoiceOver (iOS Safari) + NVDA (Win Firefox).
- Color never the sole signal (value-bet chip is amber + ⚡ icon + "Value Bet" text).

## 11. Seedance hero asset

- **File:** `apps/web/public/media/apexpredix-reel.mp4` — H.264 high-profile, 1080×1080, 30 fps, AAC 96 kbps, target ≤ **1.8 MB**.
- **Encode command (run after Seedance render):**
  ```
  ffmpeg -i seedance-raw.mp4 \
    -c:v libx264 -crf 23 -preset slow -profile:v high -pix_fmt yuv420p \
    -c:a aac -b:a 96k -ac 2 \
    -movflags +faststart -t 10 \
    apexpredix-reel.mp4
  ```
- **Poster:** `apexpredix-reel-poster.avif` ≈ 12 KB (frame 0 via `sharp`).
- **Captions:** `apexpredix-reel.vtt` describing audio cues for deaf/HoH (`[soft synth pad rises]`, `[cash-register chime]`) — served via `<track kind="captions" srclang="en">`.
- **Reduced-motion behavior:** poster only + visible play button; no autoplay.
- **Browser policy compliance:** `muted` + `playsInline` + `autoplay` + `loop` on the `<video>` (iOS / Chrome autoplay rules).
- **Mute toggle** owned by `<HeroReel>`; focus-visible; `aria-label` flips between Mute / Unmute.

### 11.1 Seedance prompt (10s, 1:1, with audio)

> A premium 10-second cinematic product reel for ApexPredict AI, a sports prediction intelligence platform. Square 1:1, 1080×1080, 30 fps, deep-black background (#0A0A0A), glowing electric-cyan and amber accents.
>
> 0.0–1.5s — black screen, a single pulsing cyan dot in the center; soft sub-bass hit; the dot expands into a holographic globe with thin lat/long lines and tiny golden nodes lighting up across Africa, Europe, the Americas; whisper-soft synth pad rises.
>
> 1.5–3.0s — camera dollies in through the globe into a dark UI; a "Live Intelligence Grid" panel materializes — 14 agent tiles snapping into place in a 4-column grid, each with a green "● Live" dot pulsing in sync; faint mechanical click per snap.
>
> 3.0–4.5s — a match card slides in: "Team A vs Team B", "ELO +120", "xG 2.4", a confidence bar fills to "89.3%" with a satisfying tick; subtle UI whoosh.
>
> 4.5–6.0s — three model layers stack like cards behind it labeled "ELO", "Poisson", "xG"; a beam of light merges them into a single glowing "Ensemble" badge; warm thump on merge.
>
> 6.0–7.5s — a "Value Bet Detected" chip flashes amber; a small ROI line chart sweeps upward to "+8.5% Edge"; cash-register-soft chime.
>
> 7.5–9.0s — interface zooms out into a phone-sized dashboard with "Win Rate 89.3%", "ROI +8.5%", three predictions ticking from Pending → Win with green check marks; rising tonal scale.
>
> 9.0–10.0s — wordmark "ApexPredict AI" types in (cyan glow), tagline "Built on Mathematical Edge" fades under it; final low cinematic boom + sub-bass tail.
>
> Style: dark fintech meets sports broadcast, glass and neon, motion-design feel like Stripe / Linear / Apple keynote reels. No human faces. No real team logos — use "Team A vs Team B" if any text rendering risk. UI text in clean sans (Inter / SF Pro). Sound mix: cinematic synth pad bed, two impact hits at 0.0s and 9.5s, soft UI ticks, no voiceover.

### 11.2 Reel-stills capture script
| 06 | `backtest-chart` | `<BacktestSection>` |
| 07 | `dashboard-mobile` | `<DashboardPreview>` (mobile viewport 390×844 → upscale crop) |
| 08 | `wordmark-end` | `<WordmarkFrame>` (dev-only component) |

Output is gitignored except `reel-stills/manifest.json` for reproducibility.

### 11.3 HeroReel embed component

```tsx
// apps/web/components/reel/HeroReel.tsx
'use client';
import { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';

type Props = {
  src?: string;
  poster?: string;
  captionsSrc?: string;
};

export function HeroReel({
  src = '/media/apexpredix-reel.mp4',
  poster = '/media/apexpredix-reel-poster.avif',
  captionsSrc = '/media/apexpredix-reel.vtt',
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(m.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  return (
    <div
      className="relative aspect-square w-full max-w-[520px] overflow-hidden rounded-2xl
                 bg-[#0A0A0A] ring-1 ring-white/10
                 shadow-[0_30px_120px_-30px_rgba(34,211,238,0.35)]"
    >
      {reducedMotion && !playing ? (
        <>
          <img src={poster} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="Play ApexPredict AI product preview"
            onClick={() => {
              setPlaying(true);
              videoRef.current?.play();
            }}
            className="absolute inset-0 grid place-items-center"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-black/60 ring-1 ring-white/20 backdrop-blur">
              <Play size={28} />
            </span>
          </button>
        </>
      ) : (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          muted={muted}
          loop
          playsInline
          preload="metadata"
          aria-label="ApexPredict AI product preview"
          className="h-full w-full object-cover"
        >
          <track kind="captions" srcLang="en" src={captionsSrc} default />
        </video>
      )}

      <button
        type="button"
        aria-label={muted ? 'Unmute video' : 'Mute video'}
        onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          v.muted = !v.muted;
          setMuted(v.muted);
        }}
        className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center
                   rounded-full bg-black/55 text-white backdrop-blur ring-1 ring-white/15
                   transition hover:bg-black/75
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
    </div>
  );
}
```

## 12. Data model (Prisma → Neon Postgres)

```prisma
model WaitlistSignup {
  id              String   @id @default(cuid())
  email           String   @unique  @db.Citext
  region          String?            // ISO-3166 alpha-2
  locale          String             // en | es | yo | ha | zu
  premiumIntent   Boolean  @default(false)
  referralToken   String   @unique @default(cuid())
  referredByToken String?
  verifiedAt      DateTime?
  ipHash          String             // HMAC-SHA256(secret, ip)
  uaHash          String
  createdAt       DateTime @default(now())
  @@index([verifiedAt])
  @@index([referredByToken])
}

model CookieConsent {
  id            String   @id @default(cuid())
  anonDeviceId  String   @unique
  ipHash        String
  choices       Json     // { essential, analytics, prefs, marketing }
  version       Int
  createdAt     DateTime @default(now())
  expiresAt     DateTime
}

model VerificationToken {
  id         String   @id @default(cuid())
  email      String
  tokenHash  String   @unique
  expiresAt  DateTime
  usedAt     DateTime?
  @@index([email])
}

model GeoBlockEvent {
  id        String   @id @default(cuid())
  country   String
  region    String?
  ipHash    String
  uaHash    String
  createdAt DateTime @default(now())
  @@index([country, createdAt])
}
```

PII minimization: IP / UA always HMAC-hashed at the edge with `HASH_SECRET_PRIMARY` (rotated quarterly; `HASH_SECRET_SECONDARY` for the grace window). Emails normalized + lowercased. No raw IP in logs or DB ever.

## 13. APIs

| Method | Route | Behavior |
|---|---|---|
| POST | `/api/waitlist` | Zod validate → Turnstile verify → honeypot check → disposable-domain filter → KV rate limit → insert pending row + generate referral token → send Resend verification mail → **always 202** (anti-enumeration) |
| GET | `/api/waitlist/verify?token=…` | Token redeem → set `verifiedAt` → redirect `/thank-you` |
| GET | `/api/waitlist/count` | Verified-only count, ISR-cached 5 min via Next data cache |
| POST | `/api/consent` | Upsert choices → set cookie → 204 |
| GET | `/api/consent` | Return current choices for SSR rehydration |
| POST | `/api/csp-report` | CSP violation sink → Sentry |
| GET | `/api/health` | `{ ok: true, build: <sha>, time }` for uptime probes |

Error envelope: `{ ok: false, code, message }`. No stack traces in prod responses. CORS same-origin only (except OG image + sitemap). Pino structured JSON logs.

## 14. Email (Resend)

- Domain: `mail.apexpredix.ai` with SPF + DKIM + DMARC configured.
- React Email templates in `packages/email/templates/`: `WaitlistVerify`, `WaitlistWelcome`.
- Unsubscribe token per send.
- `apps/web/lib/email.ts` wrapper with retry + dead-letter logging into Sentry.

## 15. Analytics (post-consent only)

- Vercel Analytics + Vercel Speed Insights — mounted via a client gate that reads consent.
- PostHog scaffolded but `POSTHOG_ENABLED=false` in v1.
- Event taxonomy:
  `landing.view`, `predictions.preview.click`, `match.detail.view`, `waitlist.submit.attempt`, `waitlist.submit.success`, `waitlist.verify.success`, `consent.choose`, `age.confirm`, `geo.blocked.view`, `seedance.unmute`, `region.change`, `locale.change`
- All client events debounced, batched, `navigator.sendBeacon`.

## 16. Deployment + security headers + env

- Vercel project; three environments: `production` (apexpredix.ai) / `preview` (Neon DB branch per PR) / `development`.
- Custom domain: apex + `www` 308-redirect to apex. TLS Vercel-managed.
- Security headers via `next.config.mjs`:
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Content-Security-Policy: <nonce-based, strict-dynamic>
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-site
  ```
- Env template `apps/web/.env.example`:
  ```
  DATABASE_URL
  DIRECT_URL
  RESEND_API_KEY
  RESEND_FROM_ADDRESS
  TURNSTILE_SITE_KEY
  TURNSTILE_SECRET_KEY
  KV_REST_API_URL
  KV_REST_API_TOKEN
  SENTRY_DSN
  COMPLIANCE_GEOFENCE_ENABLED
  COMPLIANCE_BLOCKLIST_VERSION
  NEXT_PUBLIC_SITE_URL
  HASH_SECRET_PRIMARY
  HASH_SECRET_SECONDARY
  POSTHOG_ENABLED
  ```
- CI workflow file committed at `.github/workflows/ci.yml` but stubbed (`on: workflow_dispatch` only) until push + activation.

## 17. Observability

- Sentry client + server + edge SDKs. Release tag = `VERCEL_GIT_COMMIT_SHA`. PII scrubbing on.
- Vercel Log Drains wired (destination TBD; deferred to sub-project 8).
- Pino structured JSON server-side.
- Sentry tags: `locale`, `region`, `route`, `featureFlag.geofence`.

## 18. Testing strategy

- **Unit (Vitest)**: geo-fence matcher, locale negotiator, disposable-email check, currency formatter, hash util.
- **Component (Vitest + Testing Library)**: `<WaitlistForm>`, `<AgeGate>`, `<CookieConsent>`, `<HeroReel>`, `<MatchCard>`.
- **E2E (Playwright)** in `apps/web/e2e/`:
  1. Cold landing → cookie banner → accept all → age gate → confirm → analytics mounts (visible in network).
  2. Locale switch persists across nav.
  3. Region switch updates pricing display and bookmaker filter.
  4. Waitlist happy path: submit → 202 → email link → verify → counter increments.
  5. Abuse: 6th submit within an hour → 429.
  6. Geo-fence: header override `x-vercel-ip-country: CN` → `/blocked`.
  7. Match detail emits `SportsEvent` JSON-LD.
  8. Reduced-motion: HeroReel shows poster + play button; no autoplay.
  9. Keyboard-only nav: Sidebar → Sections → Footer with focus-visible rings.
- **Visual regression**: Playwright screenshot diffs on `/`, `/predictions/[matchId]`, `/premium` at 390 / 768 / 1440.
- **Lighthouse CI**: gates PR at ≥95 on Perf / A11y / Best / SEO.
- **Type-check + ESLint + Prisma migration dry-run** in CI.

## 19. Definition of Done (evidence required per item)

| # | Item | Required proof |
|---|---|---|
| 1 | `pnpm build` zero warnings | Tail of build output pasted in PR |
| 2 | `pnpm typecheck` clean | CI green |
| 3 | `pnpm lint` clean | CI green |
| 4 | All 9 Playwright E2E flows pass against local prod build | Playwright trace artifact uploaded |
| 5 | Lighthouse mobile ≥ 95 on `/, /predictions/[matchId], /premium` | LHCI report attached |
| 6 | axe-core 0 violations on those 3 pages | axe report |
| 7 | All 5 locales render with no missing-key warnings | Dictionary-coverage unit test passes |
| 8 | HeroReel autoplays muted in Chrome / Safari / Firefox; unmute works; reduced-motion respected | Playwright trace |
| 9 | Cookie banner gates Vercel Analytics mount | Network panel screenshot before/after consent |
| 10 | Geo-fence blocks `x-vercel-ip-country: CN` | Playwright trace |
| 11 | Age-gate cookie persists 30d | Playwright cookie inspection |
| 12 | Waitlist happy path + Resend sandbox delivery | Resend dashboard log linked |
| 13 | Rate-limit 429 on 6th request | Playwright trace |
| 14 | `sitemap.xml` includes every locale × route × match | Snapshot test |
| 15 | OG image renders for `/`, `/predictions/[matchId]`, `/premium` | Screenshot artifact |
| 16 | No `console.error` in prod build | Playwright assertion |
| 17 | Sentry receives test errors from client / server / edge | Sentry event links |
| 18 | `pnpm capture:stills` produces 8 PNGs + manifest | Artifact upload |
| 19 | All env vars present in `.env.example` | CI diff check |
| 20 | CSP report endpoint receives synthetic event | Sentry event link |
| 21 | CHANGELOG entry + README onboarding tested on a fresh clone | Checklist signed |

## 20. Open risks

- **Legal blocklist accuracy** — the v1 country/state list is a defensive starting point, not legal advice. Counsel must sign off before public launch (sub-project 8 ships the formal review checklist).
- **Translation quality of stubbed locales** — machine-translated YO/HA/ZU/ES may carry awkwardness. Mitigated by the "community translation in progress" badge and a public contribution link.
- **Seedance render variance** — the prompt is opinionated but generative AI output drifts. If the first render misses the brief, we iterate on the prompt and re-encode. The capture-stills script is independent of Seedance so it does not block.
- **Vercel KV cost** — at very high block-event volume the geo telemetry write could become noisy. Mitigated by sampling once per `(country, ipHash)` per day.
- **Email deliverability ramp** — fresh `mail.apexpredix.ai` domain warms up slowly. Mitigated by Resend's shared-IP warmup for the first 30 days.

## 21. Decisions captured

| # | Decision | Rationale |
|---|---|---|
| 1 | Rebuild from scratch, use bundle as visual reference | Original source is missing; minified bundle can't be safely modified. |
| 2 | Visual fidelity = refresh inspired by the bundle | Best UX outcome, best maintainability, best SEO/perf outcome. |
| 3 | v1 ship = landing + waitlist + canned predictions surface | Demo-able + monetizable as "reserve your seat" without depending on later sub-projects. |
| 4 | Stack = Next.js 15 + TS + Tailwind + shadcn + Framer Motion + Postgres (Neon) + Inngest (later) + Stripe (later) + PayPal (later) | Vercel-native, fast to deploy, matches original look, durable seams for later sub-projects. |
| 5 | Monorepo (pnpm + Turborepo) with `apps/*` + `packages/*` | Saves a painful re-org when sub-projects 2-8 land. |
| 6 | i18n v1: EN live + ES / YO / HA / ZU stubbed via next-intl | Polished i18n shell without delaying ship on human translation. |
| 7 | Compliance posture: strong default (edge geo-fence + 18+ age gate + RGS banner + GDPR consent) | Sports prediction sites are high-regulatory-risk; "premium" positioning demands strong defensibility. |
| 8 | Seedance reel stills generated via Playwright from rebuilt landing | Reproducible, version-controlled, no throwaway design work. |

## 22. Next step

Hand this spec to the user for review. On approval, transition to `superpowers:writing-plans` to produce the executable implementation plan.
