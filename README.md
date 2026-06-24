# ApexPredict AI

Sports prediction intelligence platform by Maralito Labs.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · shadcn primitives · Framer Motion · next-intl · Prisma · Neon Postgres · Resend · Cloudflare Turnstile · Vercel KV · Sentry · Vitest · Playwright · pnpm + Turborepo.

## Quickstart

```bash
nvm use            # Node 22 (engines: >=20.18.1)
corepack enable && corepack prepare pnpm@9.12.0 --activate
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Fill in DATABASE_URL, DIRECT_URL, RESEND_API_KEY or SMTP_URL,
# NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY,
# KV_REST_API_URL, KV_REST_API_TOKEN, NEXT_PUBLIC_SITE_URL,
# HASH_SECRET_PRIMARY (any 32+ char random string), CRON_SECRET,
# FOOTBALL_DATA_API_TOKEN, SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN (optional in dev).
pnpm -F @apexpredix/db generate
pnpm -F @apexpredix/db migrate:dev    # only if a Neon DB is configured
pnpm dev
```

Open http://localhost:3000 — it 307-redirects to `/en` and renders the full landing.

## Engineer Local Deploy

Use this when you need a local production-style check before pushing to any remote repository:

```bash
nvm use
corepack enable && corepack prepare pnpm@9.12.0 --activate
pnpm install
cp apps/web/.env.example apps/web/.env.local
```

Set the local env values in `apps/web/.env.local`, then run:

```bash
pnpm -F @apexpredix/db generate
pnpm -F @apexpredix/db migrate:dev
pnpm -F @apexpredix/web typecheck
pnpm -F @apexpredix/web test
pnpm -F @apexpredix/web build
pnpm -F @apexpredix/web start
```

For Vercel parity in local testing, use:

```bash
vercel dev
```

Smoke-test the deployed endpoints locally before handing work off:

```bash
curl -I http://localhost:3000/en
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/waitlist/count
```

## Repository layout

```
apexpredix/
├── apps/web/                Next.js 15 App Router app
│   ├── app/
│   │   ├── [locale]/        landing, predictions, premium, legal, blocked, etc.
│   │   ├── api/             health, waitlist, consent, cron, csp-report, og/match
│   │   ├── opengraph-image.tsx
│   │   ├── sitemap.ts, robots.ts, manifest.ts
│   │   └── layout.tsx       minimal root shell
│   ├── components/
│   │   ├── sections/        Hero, PredictionsPreview, Methodology, Backtest,
│   │   │                    Stats, Network, Premium, HowToUse, CTA,
│   │   │                    WaitlistForm, AgentTile
│   │   ├── match/           MatchCard, MatchDetail, OddsCompare, ModelBreakdown,
│   │   │                    ConfidenceBar, ValueBetChip
│   │   ├── nav/             Sidebar, MobileNav, SkipToContent, SettingsPanel,
│   │   │                    LanguageSwitcher, ThemeToggle, RegionPicker
│   │   ├── compliance/      AgeGate, RGSBanner, CookieConsent, GeoBlockedScreen
│   │   ├── reel/            HeroReel, StillFrame, WordmarkFrame
│   │   ├── seo/             JsonLd
│   │   ├── analytics/       ConsentedAnalytics
│   │   ├── motion/          MotionProvider
│   │   └── Footer.tsx
│   ├── data/                fixtures, agents, pricing, bookmakers (Zod-schemad)
│   ├── messages/            en/es/yo/ha/zu.json
│   ├── content/legal/       privacy/terms/cookies/disclaimer .mdx
│   ├── lib/                 hash, rate-limit, disposable-email, geo, seo, email,
│   │                        analytics, live-data, data, compliance/{blocklist,rgs,consent}
│   ├── i18n/                routing.ts, request.ts, locales.ts
│   ├── middleware.ts        geo-fence + locale negotiation + CSP nonce
│   ├── scripts/             capture-reel-stills.ts
│   └── e2e/                 9 Playwright spec files + axe helper
├── packages/
│   ├── config/              shared tsconfig + eslint + tailwind preset + prettier
│   ├── types/               Match, Agent, PricingRegion, Bookmaker, Locale,
│   │                        RegionCode, ConsentChoices, CONSENT_VERSION
│   ├── db/                  Prisma schema + client singleton
│   ├── ui/                  Button (asChild), Input, cn util
│   └── email/               WaitlistVerify + WaitlistWelcome React Email templates
├── .github/workflows/ci.yml stub (workflow_dispatch only; activate when ready)
├── docs/
│   ├── superpowers/
│   │   ├── specs/           design spec for v0.1.0
│   │   ├── plans/           71-task implementation plan
│   │   └── dod/             DoD evidence template
│   └── compliance/          blocklist-history.md
└── turbo.json, pnpm-workspace.yaml, package.json
```

## Common scripts

```bash
pnpm dev                                    # all apps in dev
pnpm build                                  # production build
pnpm typecheck && pnpm lint && pnpm test    # CI suite
pnpm -F @apexpredix/web e2e                 # Playwright (needs `pnpm exec playwright install`)
pnpm -F @apexpredix/web lhci                # Lighthouse CI
pnpm -F @apexpredix/web capture:stills      # Seedance reel-stills capture (needs dev server)
pnpm -F @apexpredix/db generate             # Prisma client
pnpm -F @apexpredix/db migrate:dev          # apply migrations
```

## Architecture

See `docs/superpowers/specs/2026-05-21-foundation-marketing-rebuild-design.md`.

## Live prediction refresh

The web app reads live fixtures from Prisma first and falls back to `apps/web/data/fixtures.json` when the DB is empty or unavailable. Production refresh is handled by `GET /api/cron/daily-refresh`, protected by `Authorization: Bearer $CRON_SECRET`.

Each daily refresh now runs the full feedback loop:

- Sync upcoming fixtures and standings from Football-Data.
- Generate calibrated 1/X/2 prediction snapshots with market, probability, confidence, and edge.
- Settle finished fixtures when provider results are available.
- Evaluate settled predictions with flat-stake profit/loss, Brier score, and log loss.
- Persist rolling backtest metrics and calibration buckets for hit-rate, ROI, and probability calibration tracking.

The cron currently runs daily at `06:00 UTC` via `vercel.json`. That cadence is compatible with Vercel Hobby. For sub-daily refreshes, move the project to Vercel Pro and split the single daily route into smaller fixture, results, stats, backtest, and heartbeat cron routes.

Required production env vars:

```bash
DATABASE_URL=...
DIRECT_URL=...
CRON_SECRET=...
FOOTBALL_DATA_API_TOKEN=...
FOOTBALL_DATA_COMPETITIONS=PL,PD,BL1,SA,FL1,CL
NEXT_PUBLIC_SITE_URL=...
HASH_SECRET_PRIMARY=...
TURNSTILE_SECRET_KEY=...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
RESEND_API_KEY=...        # or SMTP_URL / SMTP_HOST / SMTP_USER / SMTP_PASS
RESEND_FROM_ADDRESS=...
SMTP_FROM_ADDRESS=...
```

## Implementation plan

See `docs/superpowers/plans/2026-05-21-foundation-marketing-rebuild-plan.md` — 71 atomic tasks across 8 phases.

## Definition of Done

Track in `docs/superpowers/dod/2026-05-21-foundation-marketing-rebuild-evidence.md`.

## Deployment

To deploy:

1. Push `main` to GitHub.
2. Import into Vercel with `apps/web` as the root directory.
3. Set env vars in Vercel dashboard (mirror `apps/web/.env.example`)
4. Provision Neon Postgres + apply Prisma migration (`pnpm -F @apexpredix/db migrate:deploy`)
5. Activate `.github/workflows/ci.yml` — change `workflow_dispatch: {}` to include `pull_request` / `push` triggers
6. Render Seedance reel + drop `apexpredix-reel.mp4` / `apexpredix-reel-poster.avif` into `apps/web/public/media/`
7. Run DoD verification — see `docs/superpowers/dod/2026-05-21-foundation-marketing-rebuild-evidence.md`

If you are mirroring the repo to a WebForx-owned Forgejo remote, keep the personal GitHub remote as `origin` and add the WebForx remote under a separate name such as `webforx`. That avoids breaking the existing personal repo history while still giving the company its own source of truth.

### Forgejo -> Vercel deploy

The company repo now includes `.forgejo/workflows/deploy.yaml`. It assumes these Forgejo secrets exist:

```bash
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...
```

The app still needs its runtime Vercel env vars set in the WebForx Vercel project:

```bash
DATABASE_URL=...
DIRECT_URL=...
CRON_SECRET=...
FOOTBALL_DATA_API_TOKEN=...
FOOTBALL_DATA_COMPETITIONS=PL,PD,BL1,SA,FL1,CL
NEXT_PUBLIC_SITE_URL=...
HASH_SECRET_PRIMARY=...
TURNSTILE_SECRET_KEY=...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
RESEND_API_KEY=... or SMTP_URL / SMTP_HOST / SMTP_USER / SMTP_PASS
RESEND_FROM_ADDRESS=...
SMTP_FROM_ADDRESS=...
```

`apps/web/.vercelrc.json` and `.env.local` are ignored by git on purpose. They are local-only bootstrap files for CLI work and must not be committed.

## Known follow-ups

- **ESLint config resolution**: `@apexpredix/config/eslint` subpath export emits a warning during `next lint` (build still succeeds). Quick fix: switch `apps/web/.eslintrc.cjs` to a direct file path import.
- **`experimental.typedRoutes` disabled** during P2 to unblock; re-enable in a follow-up by typing `NavItem.href` with `Route<string>` from Next.
- **Seedance MP4 + poster not yet rendered**: `<HeroReel>` shows broken assets until those files exist. See `apps/web/public/media/README.md` for the render + encode workflow.
- **Capture-stills URL**: `apps/web/scripts/capture-reel-stills.ts` visits `/en/dev/stills/<id>` but the dev route is at `/dev/stills/<id>` (no locale). Middleware may intercept. Adjust the path in the script when actually running it.
- **`SettingsPanel initialRegion`**: hardcoded to `'US'`. Should be replaced with server-side cookie read at the Sidebar wire-in level.
- **`prisma migrate:dev` requires real `DATABASE_URL`**: API routes that hit Prisma fail open (try/catch wrappers) when DB is unset in local dev. Provision Neon (free tier) before running E2E #4 (waitlist happy path) and #5 (rate limit).

## License

Proprietary — © Maralito Labs.
