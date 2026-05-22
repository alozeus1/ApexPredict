# ApexPredix AI

Sports prediction intelligence platform by Maralito Labs.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · shadcn primitives · Framer Motion · next-intl · Prisma · Neon Postgres · Resend · Cloudflare Turnstile · Vercel KV · Sentry · Vitest · Playwright · pnpm + Turborepo.

## Quickstart

```bash
nvm use            # Node 22 (engines: >=20.18.1)
corepack enable && corepack prepare pnpm@9.12.0 --activate
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Fill in DATABASE_URL, RESEND_API_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY,
# TURNSTILE_SECRET_KEY, KV_REST_API_URL, KV_REST_API_TOKEN,
# NEXT_PUBLIC_SITE_URL, HASH_SECRET_PRIMARY (any 32+ char random string),
# SENTRY_DSN (optional in dev).
pnpm -F @apexpredix/db generate
pnpm -F @apexpredix/db migrate:dev    # only if a Neon DB is configured
pnpm dev
```

Open http://localhost:3000 — it 307-redirects to `/en` and renders the full landing.

## Repository layout

```
apexpredix/
├── apps/web/                Next.js 15 App Router app
│   ├── app/
│   │   ├── [locale]/        landing, predictions, premium, legal, blocked, etc.
│   │   ├── api/             health, waitlist, consent, csp-report, og/match
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
│   │                        analytics, compliance/{blocklist,rgs,consent}
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

## Implementation plan

See `docs/superpowers/plans/2026-05-21-foundation-marketing-rebuild-plan.md` — 71 atomic tasks across 8 phases.

## Definition of Done

Track in `docs/superpowers/dod/2026-05-21-foundation-marketing-rebuild-evidence.md`.

## Deployment

This repo is **not yet** wired to a remote git host or Vercel project. To deploy:

1. Create a GitHub repo and push: `git remote add origin <url> && git push -u origin main`
2. Import into Vercel — auto-detects pnpm + Next.js
3. Set env vars in Vercel dashboard (mirror `apps/web/.env.example`)
4. Provision Neon Postgres + apply Prisma migration (`pnpm -F @apexpredix/db migrate:deploy`)
5. Activate `.github/workflows/ci.yml` — change `workflow_dispatch: {}` to include `pull_request` / `push` triggers
6. Render Seedance reel + drop `apexpredix-reel.mp4` / `apexpredix-reel-poster.avif` into `apps/web/public/media/`
7. Run DoD verification — see `docs/superpowers/dod/2026-05-21-foundation-marketing-rebuild-evidence.md`

## Known follow-ups

- **ESLint config resolution**: `@apexpredix/config/eslint` subpath export emits a warning during `next lint` (build still succeeds). Quick fix: switch `apps/web/.eslintrc.cjs` to a direct file path import.
- **`experimental.typedRoutes` disabled** during P2 to unblock; re-enable in a follow-up by typing `NavItem.href` with `Route<string>` from Next.
- **Seedance MP4 + poster not yet rendered**: `<HeroReel>` shows broken assets until those files exist. See `apps/web/public/media/README.md` for the render + encode workflow.
- **Capture-stills URL**: `apps/web/scripts/capture-reel-stills.ts` visits `/en/dev/stills/<id>` but the dev route is at `/dev/stills/<id>` (no locale). Middleware may intercept. Adjust the path in the script when actually running it.
- **`SettingsPanel initialRegion`**: hardcoded to `'US'`. Should be replaced with server-side cookie read at the Sidebar wire-in level.
- **`prisma migrate:dev` requires real `DATABASE_URL`**: API routes that hit Prisma fail open (try/catch wrappers) when DB is unset in local dev. Provision Neon (free tier) before running E2E #4 (waitlist happy path) and #5 (rate limit).

## License

Proprietary — © Maralito Labs.
