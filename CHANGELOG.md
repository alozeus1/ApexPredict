# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Sprint S0 foundation (PRs branched off `develop`)

#### CI / security (`chore/ci-cd-and-scanners`)
- Real CI pipeline on PR + push to `main`/`develop`: install → generate → typecheck → lint → test → build → e2e smoke, plus parallel CodeQL (fails on high/critical) and gitleaks
- Forgejo CI mirror (`.forgejo/workflows/ci.yaml`); `.gitleaks.toml`; `e2e/00-smoke.spec.ts` + `e2e:smoke` script; PR template; `CONTRIBUTING.md`

#### Auth & identity (`feat/identity-foundation`)
- Auth.js v5 (Credentials + Resend email + Google), Prisma adapter, database sessions, argon2id passwords
- Prisma models: `User`, `Account`, `Session`, `VerificationToken`, `Subscription`, `AuditLog` (+ enums); waitlist token renamed to `WaitlistVerificationToken` (data preserved)
- Auth pages (signup, login, verify-email, forgot/reset-password, account); signup with anti-enumeration + lockout; `lib/audit.ts`, `lib/entitlements.ts` (Zod-validated matrix), `lib/auth-guards.tsx`

#### Data & prediction scaffolds (`feat/data-and-prediction-scaffolds`)
- `FixturesProvider` / `OddsProvider` interfaces (FootballData live; Sportmonks / TheOddsApi stubs); `runWorker` + heartbeat helpers
- Widened market set + Zod `MarketSchema`; `UserPick` model + read helpers; synthetic model prices (`MODEL_FAIR_PRICE`) never persisted

### Changed
- Repositioned all marketing/UI copy as a calibrated value-bet signal service (`feat/copy-repositioning`); removed fabricated waitlist count and demo dashboard KPIs (`chore/repo-hygiene`)
- Locale gate: removed `es`/`zu`, added `ig` (English fallback), gated `yo`/`ha`/`ig` behind env flags — English-only at launch (`chore/repo-hygiene`)
- `HASH_SECRET_SECONDARY` verify-on-read rotation in `lib/hash.ts`; added `/api/health/deep` (`chore/repo-hygiene`)

### Security
- `.gitignore` now excludes `apps/web/.vercelrc.json` and `docs/strategy/*.{docx,pptx,pdf}`

## [0.1.0] - 2026-05-21

### Added — Foundation + Marketing Rebuild (sub-project 1 of 8)

#### Infrastructure
- pnpm + Turborepo monorepo with 5 shared packages: `@apexpredix/config`, `@apexpredix/types`, `@apexpredix/db`, `@apexpredix/ui`, `@apexpredix/email`
- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn primitives
- Security headers via `next.config.mjs` (HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- Stubbed `.github/workflows/ci.yml` (workflow_dispatch only — activation deferred to user)
- `/api/health` edge route

#### Landing
- 9 sections: Hero, PredictionsPreview, Methodology, Backtest, Stats, Network, Premium, HowToUse, CTA
- Sidebar (`≥lg`) + MobileNav (`<lg`) + Footer + SkipToContent
- HeroReel (autoplay-muted with unmute toggle, reduced-motion poster fallback, captions track)

#### Internationalization
- `next-intl` with always-prefixed locale routing (`/en`, `/es`, `/yo`, `/ha`, `/zu`)
- Full EN dictionary; ES/YO/HA/ZU machine-baseline stubs flagged "beta"
- Geo + locale negotiation middleware
- Region picker, language switcher, theme toggle (FOUC-prevention script), SettingsPanel slide-in

#### Data + Match Detail
- 30 canned fixtures across 6 sports / 9 leagues (Zod-validated)
- 14 autonomous agents from spec roster
- 6 regional pricing tiers (NG -85% PPP, ZA/KE -60%)
- 13 bookmakers across 6 regions with region-aware filtering
- `/predictions` feed + `/predictions/[matchId]` detail (150 SSG paths)
- MatchCard / ConfidenceBar / ValueBetChip / OddsCompare / ModelBreakdown
- Live agent heartbeat ticker in Network grid

#### Compliance
- Edge geo-fence (rewrite-to-451) with centralized blocklist module + history doc
- 18+ AgeGate modal (30-day cookie attestation)
- Region-aware RGS banner with per-region helplines
- GDPR cookie consent banner with 4 categories + 13-month cookie + `/api/consent` route
- HMAC-SHA256 PII hashing for IPs/UAs
- KV-backed sliding-window rate limiter (5/hr, 50/day per IP on waitlist)
- Disposable email domain check
- MDX-rendered legal pages: Privacy, Terms, Cookies, Disclaimer (20 SSG paths)

#### Waitlist
- `POST /api/waitlist` with Zod validation + Turnstile + honeypot + rate limit + disposable filter
- `GET /api/waitlist/verify` with token redemption + welcome email
- `GET /api/waitlist/count` (5 min ISR)
- `WaitlistForm` with Cloudflare Turnstile widget
- Resend integration with React Email templates (WaitlistVerify, WaitlistWelcome)
- `/thank-you` page with referral link

#### SEO
- Next 15 Metadata API with hreflang for all 5 locales + `x-default`
- JSON-LD: Organization, WebSite, SportsEvent (per match), BreadcrumbList
- Dynamic OG image generation at edge (root + per-match)
- `/sitemap.xml` (240 URLs: 9 routes × 5 locales + 30 matches × 5 locales)
- `/robots.txt` and `/manifest.webmanifest`

#### Observability + Security
- Nonce-based CSP via middleware + `/api/csp-report` sink
- Sentry SDKs (client/server/edge) with env-gated init
- ConsentedAnalytics wrapper (Vercel Analytics + Speed Insights) gated by cookie consent
- `lib/analytics.ts` with event taxonomy + `sendBeacon`

#### Reel + dev tooling
- `/dev/stills/[id]` route renders 8 reference frames for Seedance
- `apps/web/scripts/capture-reel-stills.ts` Playwright script
- VTT captions for hero reel audio cues

#### Testing
- 47 Vitest unit tests across 25 files
- 9 Playwright E2E specs (consent/age/analytics, locale, region, waitlist, rate limit, geo-fence, JSON-LD, reduced-motion, axe + keyboard)
- Lighthouse CI config gating Perf/A11y/Best/SEO ≥ 0.95 on mobile

#### Documentation
- `README.md` with full onboarding, repo layout, scripts, deployment steps
- Design spec at `docs/superpowers/specs/2026-05-21-foundation-marketing-rebuild-design.md`
- Implementation plan at `docs/superpowers/plans/2026-05-21-foundation-marketing-rebuild-plan.md` (71 atomic tasks)
- DoD evidence template at `docs/superpowers/dod/2026-05-21-foundation-marketing-rebuild-evidence.md`
- Compliance blocklist history at `docs/compliance/blocklist-history.md`

### Known follow-ups carried forward
- Sub-project 2: Data Platform (live odds + fixture ingestion)
- Sub-project 3: Prediction Engine (real ELO + Poisson + xG models)
- Sub-project 4: Auth + Accounts (NextAuth)
- Sub-project 5: Predictions UI wired to live DB
- Sub-project 6: Stripe + PayPal payments
- Sub-project 7: Admin / Agent Ops
- Sub-project 8: Compliance, Observability & Launch (counsel review, status page, runbooks)

### External prerequisites for public deploy
- Render Seedance MP4 + drop into `apps/web/public/media/`
- Provision Neon Postgres + apply Prisma migrations
- Set up Resend `mail.apexpredix.ai` with SPF/DKIM/DMARC
- Cloudflare Turnstile site + secret key
- Vercel KV instance
- Sentry project DSN
- Legal counsel review of blocklist + MDX legal pages
- GitHub remote + Vercel project + DNS for `apexpredix.ai`
