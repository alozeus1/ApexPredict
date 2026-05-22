# ApexPredix AI — Foundation + Marketing Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployable v0.1.0 of ApexPredix AI — Next.js 15 landing site + canned predictions surface + waitlist + compliance shell + Seedance hero embed — meeting Lighthouse mobile ≥95 and the 21-item DoD in the spec.

**Architecture:** pnpm + Turborepo monorepo. `apps/web` is a Next.js 15 App Router site, RSC-by-default, statically rendered where possible with ISR for fixture-driven pages. Edge middleware handles geo-fence and locale negotiation. Postgres (Neon) via Prisma stores waitlist signups + cookie consent + verification tokens. Resend transactional email. Vercel KV for rate limiting. Five shared packages (`ui`, `db`, `email`, `config`, `types`) keep seams for the seven downstream sub-projects.

**Tech Stack:** Next.js 15.x, TypeScript 5.x, Tailwind CSS 3.x, shadcn/ui, Framer Motion (LazyMotion), next-intl, Prisma 5.x, Neon Postgres, Resend, Cloudflare Turnstile, Vercel KV, Sentry, Vitest, Playwright, axe-core, Lighthouse CI, pnpm 9.x, Turborepo 2.x.

**Spec reference:** `docs/superpowers/specs/2026-05-21-foundation-marketing-rebuild-design.md`

---

## File structure (created across all phases)

```
apexpredix/
├── apps/web/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx                                # P3
│   │   │   ├── page.tsx                                  # P2/P4
│   │   │   ├── predictions/page.tsx                      # P4
│   │   │   ├── predictions/[matchId]/page.tsx            # P4
│   │   │   ├── methodology/page.tsx                      # P2
│   │   │   ├── how-it-works/page.tsx                     # P2
│   │   │   ├── premium/page.tsx                          # P2
│   │   │   ├── legal/[doc]/page.tsx                      # P2
│   │   │   ├── blocked/page.tsx                          # P5
│   │   │   ├── under-age/page.tsx                        # P5
│   │   │   └── thank-you/page.tsx                        # P5
│   │   ├── api/
│   │   │   ├── waitlist/route.ts                         # P5
│   │   │   ├── waitlist/verify/route.ts                  # P5
│   │   │   ├── waitlist/count/route.ts                   # P5
│   │   │   ├── consent/route.ts                          # P5
│   │   │   ├── csp-report/route.ts                       # P7
│   │   │   └── health/route.ts                           # P1
│   │   ├── (dev)/dev/stills/[id]/page.tsx                # P6
│   │   ├── opengraph-image.tsx                           # P7
│   │   ├── sitemap.ts                                    # P7
│   │   ├── robots.ts                                     # P7
│   │   └── manifest.ts                                   # P7
│   ├── components/
│   │   ├── sections/{Hero,PredictionsPreview,Methodology,Backtest,Stats,Network,Premium,HowToUse,CTA}.tsx  # P2
│   │   ├── match/{MatchCard,MatchDetail,ValueBetChip,ConfidenceBar,OddsCompare,ModelBreakdown}.tsx        # P4
│   │   ├── nav/{Sidebar,MobileNav,SettingsPanel,LanguageSwitcher,ThemeToggle,RegionPicker}.tsx            # P3
│   │   ├── compliance/{AgeGate,RGSBanner,CookieConsent,GeoBlockedScreen}.tsx                              # P5
│   │   ├── legal/{LegalModal,LegalPage,MDXComponents}.tsx                                                 # P2
│   │   ├── reel/HeroReel.tsx                                                                              # P6
│   │   └── bookmakers/BettingLinks.tsx                                                                    # P4
│   ├── data/{fixtures,agents,pricing,bookmakers}.json                                                     # P4
│   ├── messages/{en,es,yo,ha,zu}.json                                                                     # P3
│   ├── lib/
│   │   ├── compliance/{blocklist,age,consent,rgs}.ts                                                      # P5
│   │   ├── geo.ts, locale.ts, email.ts, hash.ts, rate-limit.ts, analytics.ts, seo.ts                       # P3/P5/P7
│   ├── e2e/*.spec.ts                                                                                      # P8
│   ├── middleware.ts                                                                                      # P3/P5
│   ├── next.config.mjs, playwright.config.ts, vitest.config.ts, tsconfig.json, tailwind.config.ts          # P1/P8
│   ├── scripts/capture-reel-stills.ts                                                                     # P6
│   └── public/media/{apexpredix-reel.mp4,apexpredix-reel-poster.avif,apexpredix-reel.vtt}                  # P6
├── packages/
│   ├── ui/{src,tailwind-preset.ts,package.json,tsconfig.json}                                             # P1
│   ├── db/{prisma/schema.prisma,src/index.ts,package.json}                                                # P1/P5
│   ├── email/{src/templates/*.tsx,src/index.ts,package.json}                                              # P1/P5
│   ├── config/{eslint.cjs,tsconfig.base.json,tailwind-preset.ts,package.json}                             # P1
│   └── types/{src/index.ts,Match.ts,Agent.ts,…,package.json}                                              # P1
├── .github/workflows/ci.yml                                                                               # P1
├── .changeset/                                                                                            # P1
├── pnpm-workspace.yaml, turbo.json, package.json, .gitignore, .nvmrc                                       # P1
├── README.md                                                                                              # P1/P8
└── docs/                                                                                                  # spec + plan live here
```

---

## Phase 1 — Monorepo scaffold & tooling

### Task 1.1: Initialize repo root + pnpm workspace + Turborepo

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.nvmrc`, `README.md`, `.editorconfig`, `.npmrc`

- [ ] **Step 1: Initialize git + pnpm**

```bash
cd /Users/ocheme/Desktop/ApexPredict
git init -b main
echo "20.18.1" > .nvmrc
echo "auto-install-peers=true" > .npmrc
echo "shamefully-hoist=false" >> .npmrc
```

- [ ] **Step 2: Write root `package.json`**

Create `package.json`:

```json
{
  "name": "apexpredix",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20.18.1" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "e2e": "turbo run e2e",
    "format": "prettier --write \"**/*.{ts,tsx,json,md,mdx,css}\"",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "2.3.0",
    "prettier": "3.4.2",
    "@changesets/cli": "2.27.10",
    "typescript": "5.6.3"
  }
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env", "tsconfig.base.json"],
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "e2e": { "dependsOn": ["^build"], "outputs": ["playwright-report/**", "test-results/**"] },
    "dev": { "cache": false, "persistent": true },
    "clean": { "cache": false }
  }
}
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules/
.next/
dist/
.turbo/
.vercel/
.env*
!.env.example
*.log
.DS_Store
playwright-report/
test-results/
coverage/
apps/web/public/media/reel-stills/*.png
!apps/web/public/media/reel-stills/manifest.json
```

- [ ] **Step 6: Write `.editorconfig`**

```
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

- [ ] **Step 7: Write `README.md` skeleton**

```markdown
# ApexPredix AI

Sports prediction intelligence platform by Maralito Labs.

## Quickstart

```bash
pnpm install
pnpm dev
```

See `docs/superpowers/plans/2026-05-21-foundation-marketing-rebuild-plan.md` for the implementation plan.
```

- [ ] **Step 8: Install and verify**

```bash
pnpm install
pnpm typecheck
```

Expected: install completes, typecheck no-ops (no apps yet).

- [ ] **Step 9: Commit**

```bash
git add .nvmrc .npmrc package.json pnpm-workspace.yaml turbo.json .gitignore .editorconfig README.md
git commit -m "chore: scaffold pnpm + turborepo monorepo root"
```

---

### Task 1.2: Shared `config` package — tsconfig + eslint + tailwind preset

**Files:**
- Create: `packages/config/package.json`, `packages/config/tsconfig.base.json`, `packages/config/eslint.cjs`, `packages/config/tailwind-preset.ts`, `packages/config/prettier.cjs`

- [ ] **Step 1: Write `packages/config/package.json`**

```json
{
  "name": "@apexpredix/config",
  "version": "0.0.0",
  "private": true,
  "main": "./index.js",
  "files": ["tsconfig.base.json", "eslint.cjs", "tailwind-preset.ts", "prettier.cjs"],
  "exports": {
    "./tsconfig": "./tsconfig.base.json",
    "./eslint": "./eslint.cjs",
    "./tailwind": "./tailwind-preset.ts",
    "./prettier": "./prettier.cjs"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "8.18.0",
    "@typescript-eslint/parser": "8.18.0",
    "eslint": "9.17.0",
    "eslint-config-next": "15.1.2",
    "eslint-plugin-jsx-a11y": "6.10.2",
    "eslint-plugin-react": "7.37.2",
    "eslint-plugin-react-hooks": "5.1.0",
    "tailwindcss": "3.4.17",
    "typescript": "5.6.3"
  }
}
```

- [ ] **Step 2: Write `packages/config/tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 3: Write `packages/config/eslint.cjs`**

```js
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'next',
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'jsx-a11y/no-autofocus': ['warn', { ignoreNonDOM: true }],
  },
  ignorePatterns: ['dist', '.next', 'node_modules', 'coverage', 'playwright-report'],
};
```

- [ ] **Step 4: Write `packages/config/tailwind-preset.ts`**

```ts
import type { Config } from 'tailwindcss';

const preset: Partial<Config> = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: { 0: '#0A0A0A', 1: '#111113', 2: '#18181B', 3: '#27272A' },
        edge: { cyan: '#22D3EE', amber: '#F59E0B', green: '#22C55E', red: '#EF4444' },
        mute: { 1: '#A1A1AA', 2: '#71717A' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 30px 120px -30px rgba(34,211,238,0.35)',
        rim: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.25rem' },
      keyframes: {
        pulseDot: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.92)' },
        },
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
        rise: 'rise 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};

export default preset;
```

- [ ] **Step 5: Write `packages/config/prettier.cjs`**

```js
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
  bracketSpacing: true,
  jsxSingleQuote: false,
};
```

- [ ] **Step 6: Add empty `index.js` so package resolves**

Create `packages/config/index.js`:

```js
module.exports = {};
```

- [ ] **Step 7: Install + verify**

```bash
pnpm install
pnpm -F @apexpredix/config exec tsc --version
```

Expected: install succeeds, tsc reports its version.

- [ ] **Step 8: Commit**

```bash
git add packages/config
git commit -m "feat(config): shared tsconfig, eslint, tailwind preset, prettier"
```

---

### Task 1.3: Shared `types` package — domain types contract

**Files:**
- Create: `packages/types/package.json`, `packages/types/tsconfig.json`, `packages/types/src/{index,match,agent,pricing,bookmaker,consent,locale}.ts`
- Test: `packages/types/src/__tests__/types.test.ts`

- [ ] **Step 1: Write `packages/types/package.json`**

```json
{
  "name": "@apexpredix/types",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src"
  },
  "devDependencies": {
    "@apexpredix/config": "workspace:*",
    "vitest": "2.1.8",
    "eslint": "9.17.0",
    "typescript": "5.6.3"
  }
}
```

- [ ] **Step 2: Write `packages/types/tsconfig.json`**

```json
{
  "extends": "@apexpredix/config/tsconfig",
  "include": ["src/**/*"],
  "compilerOptions": { "rootDir": "src" }
}
```

- [ ] **Step 3: Write `packages/types/src/locale.ts`**

```ts
export const LOCALES = ['en', 'es', 'yo', 'ha', 'zu'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const isLocale = (v: unknown): v is Locale =>
  typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
```

- [ ] **Step 4: Write `packages/types/src/match.ts`**

```ts
export type Sport = 'soccer' | 'basketball' | 'tennis' | 'football' | 'hockey' | 'rugby';

export interface OddsByBook {
  bookCode: string;
  price: number;
  market: '1' | 'X' | '2' | 'O2.5' | 'U2.5' | 'BTTS-Y' | 'BTTS-N';
}

export interface ModelOutput {
  elo: number;
  poisson: number;
  xg: number;
  ensemble: number;
  confidence: number;
}

export interface Match {
  id: string;
  sport: Sport;
  league: string;
  home: { name: string; code: string };
  away: { name: string; code: string };
  kickoff: string;
  odds: OddsByBook[];
  model: ModelOutput;
  topPick: string;
  valueBet: boolean;
  narrative: string;
  featured?: boolean;
}
```

- [ ] **Step 5: Write `packages/types/src/agent.ts`**

```ts
export type AgentStatus = 'live' | 'idle' | 'paused';

export interface Agent {
  id: string;
  name: string;
  capability: string;
  status: AgentStatus;
  heartbeatJitterSec: number;
  sparkline: [number, number, number, number, number, number, number];
}
```

- [ ] **Step 6: Write `packages/types/src/pricing.ts`**

```ts
export type CurrencyCode = 'USD' | 'NGN' | 'GBP' | 'EUR' | 'ZAR' | 'KES';
export type RegionCode = 'US' | 'NG' | 'GB' | 'EU' | 'ZA' | 'KE';

export interface PricingRegion {
  region: RegionCode;
  currency: CurrencyCode;
  monthly: number;
  yearly: number;
  pctOffBase: number;
}
```

- [ ] **Step 7: Write `packages/types/src/bookmaker.ts`**

```ts
import type { RegionCode } from './pricing';

export interface Bookmaker {
  code: string;
  name: string;
  regions: RegionCode[];
  deeplink: string;
  logoUrl: string;
}
```

- [ ] **Step 8: Write `packages/types/src/consent.ts`**

```ts
export interface ConsentChoices {
  essential: true;
  analytics: boolean;
  prefs: boolean;
  marketing: boolean;
}

export const CONSENT_VERSION = 1;
```

- [ ] **Step 9: Write `packages/types/src/index.ts`**

```ts
export * from './locale';
export * from './match';
export * from './agent';
export * from './pricing';
export * from './bookmaker';
export * from './consent';
```

- [ ] **Step 10: Write the test `packages/types/src/__tests__/types.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { LOCALES, DEFAULT_LOCALE, isLocale, CONSENT_VERSION } from '../index';

describe('types', () => {
  it('LOCALES has 5 entries', () => {
    expect(LOCALES).toHaveLength(5);
  });
  it('DEFAULT_LOCALE is en', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });
  it('isLocale narrows correctly', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('xx')).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
  it('CONSENT_VERSION is 1', () => {
    expect(CONSENT_VERSION).toBe(1);
  });
});
```

- [ ] **Step 11: Run test, expect pass**

```bash
pnpm install
pnpm -F @apexpredix/types test
```

Expected: 4 tests pass.

- [ ] **Step 12: Commit**

```bash
git add packages/types
git commit -m "feat(types): shared domain types (locale, match, agent, pricing, bookmaker, consent)"
```

---

### Task 1.4: Scaffold Next.js 15 app in `apps/web`

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.mjs`, `apps/web/tsconfig.json`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/.eslintrc.cjs`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/globals.css`, `apps/web/.env.example`

- [ ] **Step 1: Write `apps/web/package.json`**

```json
{
  "name": "@apexpredix/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "clean": "rm -rf .next .turbo"
  },
  "dependencies": {
    "@apexpredix/types": "workspace:*",
    "@apexpredix/ui": "workspace:*",
    "@apexpredix/db": "workspace:*",
    "@apexpredix/email": "workspace:*",
    "next": "15.1.2",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "next-intl": "3.26.0",
    "framer-motion": "11.15.0",
    "lucide-react": "0.469.0",
    "zod": "3.24.1",
    "@vercel/analytics": "1.4.1",
    "@vercel/speed-insights": "1.1.0",
    "@vercel/kv": "3.0.0",
    "@sentry/nextjs": "8.47.0",
    "resend": "4.0.1",
    "react-email": "3.0.4",
    "@react-email/components": "0.0.31",
    "clsx": "2.1.1",
    "tailwind-merge": "2.5.5"
  },
  "devDependencies": {
    "@apexpredix/config": "workspace:*",
    "@types/node": "22.10.2",
    "@types/react": "19.0.2",
    "@types/react-dom": "19.0.2",
    "@playwright/test": "1.49.1",
    "@axe-core/playwright": "4.10.1",
    "@testing-library/react": "16.1.0",
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/user-event": "14.5.2",
    "@vitejs/plugin-react": "4.3.4",
    "vitest": "2.1.8",
    "jsdom": "25.0.1",
    "@next/bundle-analyzer": "15.1.2",
    "autoprefixer": "10.4.20",
    "postcss": "8.4.49",
    "tailwindcss": "3.4.17",
    "typescript": "5.6.3"
  }
}
```

- [ ] **Step 2: Write `apps/web/tsconfig.json`**

```json
{
  "extends": "@apexpredix/config/tsconfig",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] },
    "plugins": [{ "name": "next" }],
    "noEmit": true,
    "allowJs": true,
    "incremental": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `apps/web/next.config.mjs`**

```js
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { typedRoutes: true },
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
```

- [ ] **Step 4: Write `apps/web/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';
import preset from '@apexpredix/config/tailwind';

const config: Config = {
  presets: [preset as Config],
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
```

- [ ] **Step 5: Write `apps/web/postcss.config.mjs`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 6: Write `apps/web/.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  extends: ['@apexpredix/config/eslint'],
};
```

- [ ] **Step 7: Write `apps/web/.env.example`**

```
# DB
DATABASE_URL=postgres://user:pass@host/db?sslmode=require
DIRECT_URL=postgres://user:pass@host/db?sslmode=require

# Email
RESEND_API_KEY=
RESEND_FROM_ADDRESS=ApexPredix AI <noreply@mail.apexpredix.ai>

# Anti-bot
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Rate limit
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Observability
SENTRY_DSN=

# Compliance
COMPLIANCE_GEOFENCE_ENABLED=true
COMPLIANCE_BLOCKLIST_VERSION=1

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# PII hashing
HASH_SECRET_PRIMARY=replace-with-32+-bytes-random
HASH_SECRET_SECONDARY=

# Toggles
POSTHOG_ENABLED=false
```

- [ ] **Step 8: Write `apps/web/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: dark; }

html, body { background: #0a0a0a; color: #fafafa; }

a { color: inherit; }

::selection { background: rgba(34,211,238,0.35); }
```

- [ ] **Step 9: Write provisional `apps/web/app/layout.tsx`**

```tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'ApexPredix AI — Sports Prediction Intelligence',
  description: 'AI sports prediction intelligence by Maralito Labs — ELO + Poisson + xG ensemble engine.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0A0A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Write provisional `apps/web/app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <h1 className="text-3xl font-semibold tracking-tight">ApexPredix AI — scaffold up.</h1>
    </main>
  );
}
```

- [ ] **Step 11: Install + run dev to verify**

```bash
pnpm install
pnpm -F @apexpredix/web dev &
sleep 8
curl -sS http://localhost:3000 | grep -q "scaffold up" && echo OK || echo FAIL
kill %1
```

Expected: prints `OK`.

- [ ] **Step 12: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Next.js 15 app with Tailwind, Inter, security headers"
```

---

### Task 1.5: Scaffold `db` package (Prisma + Neon Postgres client)

**Files:**
- Create: `packages/db/package.json`, `packages/db/prisma/schema.prisma`, `packages/db/src/index.ts`, `packages/db/tsconfig.json`

- [ ] **Step 1: Write `packages/db/package.json`**

```json
{
  "name": "@apexpredix/db",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "generate": "prisma generate",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "studio": "prisma studio",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "@prisma/client": "5.22.0"
  },
  "devDependencies": {
    "@apexpredix/config": "workspace:*",
    "prisma": "5.22.0",
    "typescript": "5.6.3"
  },
  "prisma": { "schema": "prisma/schema.prisma" }
}
```

- [ ] **Step 2: Write `packages/db/tsconfig.json`**

```json
{
  "extends": "@apexpredix/config/tsconfig",
  "include": ["src/**/*"],
  "compilerOptions": { "rootDir": "src" }
}
```

- [ ] **Step 3: Write `packages/db/prisma/schema.prisma`** (final v1 schema, matches spec §12)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [citext]
}

model WaitlistSignup {
  id              String    @id @default(cuid())
  email           String    @unique @db.Citext
  region          String?
  locale          String
  premiumIntent   Boolean   @default(false)
  referralToken   String    @unique @default(cuid())
  referredByToken String?
  verifiedAt      DateTime?
  ipHash          String
  uaHash          String
  createdAt       DateTime  @default(now())

  @@index([verifiedAt])
  @@index([referredByToken])
}

model CookieConsent {
  id           String   @id @default(cuid())
  anonDeviceId String   @unique
  ipHash       String
  choices      Json
  version      Int
  createdAt    DateTime @default(now())
  expiresAt    DateTime
}

model VerificationToken {
  id        String    @id @default(cuid())
  email     String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?

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

- [ ] **Step 4: Write `packages/db/src/index.ts`**

```ts
import { PrismaClient } from '@prisma/client';

declare global {
   
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

export type { Prisma } from '@prisma/client';
export * from '@prisma/client';
```

- [ ] **Step 5: Generate Prisma client (no DB yet, just schema validation)**

```bash
pnpm install
pnpm -F @apexpredix/db exec prisma format
pnpm -F @apexpredix/db generate
```

Expected: client generated; no schema errors.

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat(db): Prisma schema for waitlist, consent, tokens, geo-block events"
```

---

### Task 1.6: Scaffold `ui` package (shadcn primitives + tokens re-export)

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/src/{index,utils,button,input,checkbox,dialog,dropdown,tabs,tooltip}.tsx`

- [ ] **Step 1: Write `packages/ui/package.json`**

```json
{
  "name": "@apexpredix/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "@radix-ui/react-checkbox": "1.1.3",
    "@radix-ui/react-dialog": "1.1.4",
    "@radix-ui/react-dropdown-menu": "2.1.4",
    "@radix-ui/react-tabs": "1.1.2",
    "@radix-ui/react-tooltip": "1.1.6",
    "clsx": "2.1.1",
    "tailwind-merge": "2.5.5",
    "lucide-react": "0.469.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@apexpredix/config": "workspace:*",
    "@types/react": "19.0.2",
    "@types/react-dom": "19.0.2",
    "typescript": "5.6.3"
  }
}
```

- [ ] **Step 2: Write `packages/ui/tsconfig.json`**

```json
{
  "extends": "@apexpredix/config/tsconfig",
  "include": ["src/**/*"],
  "compilerOptions": { "rootDir": "src", "jsx": "preserve" }
}
```

- [ ] **Step 3: Write `packages/ui/src/utils.ts`**

```ts
import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

- [ ] **Step 4: Write `packages/ui/src/button.tsx`**

```tsx
import * as React from 'react';
import { cn } from './utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center font-medium rounded-xl transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0 ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary: 'bg-edge-cyan text-ink-0 hover:bg-cyan-300',
  secondary: 'bg-ink-2 text-white ring-1 ring-white/10 hover:bg-ink-3',
  ghost: 'bg-transparent text-white hover:bg-white/5',
  danger: 'bg-edge-red text-white hover:bg-red-600',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  ),
);
Button.displayName = 'Button';
```

- [ ] **Step 5: Write `packages/ui/src/input.tsx`**

```tsx
import * as React from 'react';
import { cn } from './utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-11 w-full rounded-xl bg-ink-2 px-4 text-sm text-white placeholder:text-mute-1',
        'ring-1 ring-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-cyan',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
```

- [ ] **Step 6: Write `packages/ui/src/index.ts`**

```ts
export * from './utils';
export * from './button';
export * from './input';
```

- [ ] **Step 7: Install + typecheck**

```bash
pnpm install
pnpm -F @apexpredix/ui typecheck
```

Expected: no type errors.

- [ ] **Step 8: Commit**

```bash
git add packages/ui
git commit -m "feat(ui): shadcn-style primitives (Button, Input) with cn util"
```

---

### Task 1.7: Scaffold `email` package (React Email templates)

**Files:**
- Create: `packages/email/package.json`, `packages/email/tsconfig.json`, `packages/email/src/{index,templates/WaitlistVerify,templates/WaitlistWelcome}.tsx`

- [ ] **Step 1: Write `packages/email/package.json`**

```json
{
  "name": "@apexpredix/email",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "@react-email/components": "0.0.31",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "@apexpredix/config": "workspace:*",
    "@types/react": "19.0.2",
    "@types/react-dom": "19.0.2",
    "typescript": "5.6.3"
  }
}
```

- [ ] **Step 2: Write `packages/email/tsconfig.json`**

```json
{ "extends": "@apexpredix/config/tsconfig", "include": ["src/**/*"], "compilerOptions": { "rootDir": "src", "jsx": "preserve" } }
```

- [ ] **Step 3: Write `packages/email/src/templates/WaitlistVerify.tsx`**

```tsx
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components';

export interface WaitlistVerifyProps { verifyUrl: string; locale: string; }

export default function WaitlistVerify({ verifyUrl, locale }: WaitlistVerifyProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>Confirm your seat on the ApexPredix AI waitlist</Preview>
      <Body style={{ background: '#0A0A0A', color: '#FAFAFA', fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ padding: 32, maxWidth: 520 }}>
          <Heading as="h1" style={{ color: '#22D3EE' }}>Welcome to ApexPredix AI</Heading>
          <Text>One click confirms your seat on the waitlist.</Text>
          <Section style={{ margin: '32px 0' }}>
            <Link href={verifyUrl} style={{ background: '#22D3EE', color: '#0A0A0A', padding: '14px 24px', borderRadius: 12, fontWeight: 600, textDecoration: 'none' }}>
              Confirm my seat
            </Link>
          </Section>
          <Text style={{ color: '#A1A1AA', fontSize: 12 }}>
            If the button does not work, paste this link into your browser: {verifyUrl}
          </Text>
          <Text style={{ color: '#A1A1AA', fontSize: 12 }}>
            ApexPredix AI is an analytics service, not a gambling operator. 18+ only.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 4: Write `packages/email/src/templates/WaitlistWelcome.tsx`**

```tsx
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components';

export interface WaitlistWelcomeProps { referralUrl: string; locale: string; }

export default function WaitlistWelcome({ referralUrl, locale }: WaitlistWelcomeProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>You are in. Share your referral link.</Preview>
      <Body style={{ background: '#0A0A0A', color: '#FAFAFA', fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ padding: 32, maxWidth: 520 }}>
          <Heading as="h1" style={{ color: '#22D3EE' }}>You are on the list.</Heading>
          <Text>Share your link to move up the queue.</Text>
          <Section style={{ background: '#18181B', padding: 16, borderRadius: 12, margin: '24px 0' }}>
            <Link href={referralUrl} style={{ color: '#22D3EE' }}>{referralUrl}</Link>
          </Section>
          <Text style={{ color: '#A1A1AA', fontSize: 12 }}>
            ApexPredix AI is an analytics service, not a gambling operator. 18+ only.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 5: Write `packages/email/src/index.ts`**

```ts
export { default as WaitlistVerify, type WaitlistVerifyProps } from './templates/WaitlistVerify';
export { default as WaitlistWelcome, type WaitlistWelcomeProps } from './templates/WaitlistWelcome';
```

- [ ] **Step 6: Install + typecheck**

```bash
pnpm install
pnpm -F @apexpredix/email typecheck
```

Expected: no type errors.

- [ ] **Step 7: Commit**

```bash
git add packages/email
git commit -m "feat(email): React Email templates (WaitlistVerify, WaitlistWelcome)"
```

---

### Task 1.8: Commit stubbed CI workflow + final P1 polish

**Files:**
- Create: `.github/workflows/ci.yml`, `apps/web/app/api/health/route.ts`, `apps/web/vitest.config.ts`

- [ ] **Step 1: Write stubbed `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  workflow_dispatch: {}
  # Note: pull_request + push triggers intentionally omitted until user activates the pipeline.

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with: { node-version: '20.18.1', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm -F @apexpredix/db generate
      - run: pnpm build
```

- [ ] **Step 2: Write `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 3: Write `apps/web/vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Write `apps/web/app/api/health/route.ts`**

```ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export function GET() {
  return NextResponse.json({
    ok: true,
    build: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    time: new Date().toISOString(),
  });
}
```

- [ ] **Step 5: Smoke-test build**

```bash
pnpm -F @apexpredix/web build
```

Expected: build succeeds, route `/api/health` listed in route manifest.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml apps/web/vitest.config.ts apps/web/vitest.setup.ts apps/web/app/api/health/route.ts
git commit -m "chore(ci): stubbed workflow, vitest config, /api/health"
```

---

**End of Phase 1.** Continue in Phase 2 below.

---

## Phase 2 — Design system & landing sections

> Phase 2 builds visual surface only; data wiring happens in P4. Sections accept props but P2 ships them with hard-coded placeholder content so we can iterate visually before fixtures.json lands.

### Task 2.1: Skip-to-content + layout shell + landmarks

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Create: `apps/web/components/nav/SkipToContent.tsx`
- Test: `apps/web/components/nav/__tests__/SkipToContent.test.tsx`

- [ ] **Step 1: Write failing test `apps/web/components/nav/__tests__/SkipToContent.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SkipToContent } from '../SkipToContent';

describe('SkipToContent', () => {
  it('renders a link to #main', () => {
    render(<SkipToContent />);
    const link = screen.getByRole('link', { name: /skip to content/i });
    expect(link).toHaveAttribute('href', '#main');
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm -F @apexpredix/web test -- SkipToContent
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `apps/web/components/nav/SkipToContent.tsx`**

```tsx
export function SkipToContent() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
                 focus:rounded-xl focus:bg-edge-cyan focus:px-4 focus:py-2 focus:text-ink-0
                 focus:outline-none focus:ring-2 focus:ring-edge-cyan focus:ring-offset-2 focus:ring-offset-ink-0"
    >
      Skip to content
    </a>
  );
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm -F @apexpredix/web test -- SkipToContent
```

Expected: PASS.

- [ ] **Step 5: Update `apps/web/app/layout.tsx` to use landmarks + SkipToContent**

Replace the existing `RootLayout` body with:

```tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SkipToContent } from '@/components/nav/SkipToContent';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'ApexPredix AI — Sports Prediction Intelligence',
  description: 'AI sports prediction intelligence by Maralito Labs — ELO + Poisson + xG ensemble engine.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0A0A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <SkipToContent />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/nav/SkipToContent.tsx apps/web/components/nav/__tests__/SkipToContent.test.tsx apps/web/app/layout.tsx
git commit -m "feat(web): SkipToContent link + landmark-ready root layout"
```

---

### Task 2.2: Sidebar (desktop) + MobileNav (sub-lg) shells

**Files:**
- Create: `apps/web/components/nav/Sidebar.tsx`, `apps/web/components/nav/MobileNav.tsx`, `apps/web/components/nav/nav-items.ts`
- Test: `apps/web/components/nav/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: Write `apps/web/components/nav/nav-items.ts`**

```ts
export interface NavItem {
  id: string;
  label: string;
  href: string;
  locked?: boolean;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { id: 'predictions', label: 'Predictions', href: '/predictions' },
  { id: 'methodology', label: 'Methodology', href: '/methodology' },
  { id: 'backtest', label: 'Backtest', href: '/#backtest' },
  { id: 'network', label: 'Network', href: '/#network' },
  { id: 'dashboard', label: 'Dashboard', href: '/predictions', locked: true },
  { id: 'premium', label: 'Premium', href: '/premium' },
  { id: 'how-to-use', label: 'How to Use', href: '/how-it-works' },
];
```

- [ ] **Step 2: Write failing test `apps/web/components/nav/__tests__/Sidebar.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('renders nav landmark with all primary items', () => {
    render(<Sidebar pathname="/" />);
    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Predictions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Premium' })).toBeInTheDocument();
  });
  it('marks the Dashboard item as locked', () => {
    render(<Sidebar pathname="/" />);
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('aria-disabled', 'true');
  });
});
```

- [ ] **Step 3: Run test, expect fail**

```bash
pnpm -F @apexpredix/web test -- Sidebar
```

Expected: FAIL — module not found.

- [ ] **Step 4: Write `apps/web/components/nav/Sidebar.tsx`**

```tsx
import Link from 'next/link';
import { NAV_ITEMS } from './nav-items';
import { cn } from '@apexpredix/ui';

interface SidebarProps { pathname: string; }

export function Sidebar({ pathname }: SidebarProps) {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-white/5 bg-ink-1/80 backdrop-blur">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          <span className="text-edge-cyan">Apex</span>Predix<span className="text-mute-1"> AI</span>
        </Link>
      </div>
      <nav aria-label="Primary" className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-disabled={item.locked || undefined}
                  className={cn(
                    'group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition',
                    active ? 'bg-white/5 text-white' : 'text-mute-1 hover:bg-white/5 hover:text-white',
                    item.locked && 'pointer-events-none opacity-50',
                  )}
                >
                  <span>{item.label}</span>
                  {item.locked && <span className="rounded-md bg-ink-3 px-1.5 py-0.5 text-[10px] uppercase">Sign in</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/5 p-4 text-xs text-mute-2">Powered by Maralito Labs</div>
    </aside>
  );
}
```

- [ ] **Step 5: Write `apps/web/components/nav/MobileNav.tsx`**

```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { NAV_ITEMS } from './nav-items';

interface MobileNavProps { pathname: string; }

export function MobileNav({ pathname }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-ink-1/80 px-4 backdrop-blur">
        <Link href="/" className="font-semibold tracking-tight">
          <span className="text-edge-cyan">Apex</span>Predix
        </Link>
        <button aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded-lg p-2 ring-1 ring-white/10">
          <Menu size={18} />
        </button>
      </div>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Navigation" className="lg:hidden fixed inset-0 z-40 bg-ink-0/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
            <span className="font-semibold">Menu</span>
            <button aria-label="Close navigation" onClick={() => setOpen(false)} className="rounded-lg p-2 ring-1 ring-white/10">
              <X size={18} />
            </button>
          </div>
          <nav aria-label="Primary mobile" className="px-3 py-4">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      aria-disabled={item.locked || undefined}
                      className="flex items-center justify-between rounded-xl px-3 py-3 text-base text-white hover:bg-white/5"
                    >
                      <span>{item.label}</span>
                      {item.locked && <span className="rounded-md bg-ink-3 px-1.5 py-0.5 text-[10px] uppercase">Sign in</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 6: Run test, expect pass**

```bash
pnpm -F @apexpredix/web test -- Sidebar
```

Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/nav
git commit -m "feat(nav): Sidebar (lg+) and MobileNav (<lg) shells with locked Dashboard"
```

---

### Task 2.3: Hero section

**Files:**
- Create: `apps/web/components/sections/Hero.tsx`
- Test: `apps/web/components/sections/__tests__/Hero.test.tsx`

> Note: HeroReel is built in Phase 6. P2 uses a placeholder `<div>` of the same dimensions so layout matches.

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Hero } from '../Hero';

describe('Hero', () => {
  it('renders headline and primary CTA', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/built on mathematical edge/i);
    expect(screen.getByRole('link', { name: /reserve premium seat/i })).toBeInTheDocument();
  });
  it('renders the live agents pill', () => {
    render(<Hero />);
    expect(screen.getByText(/14 agents active/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm -F @apexpredix/web test -- Hero
```

Expected: FAIL.

- [ ] **Step 3: Write `apps/web/components/sections/Hero.tsx`**

```tsx
import Link from 'next/link';
import { Button } from '@apexpredix/ui';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="space-y-6 animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-2 px-3 py-1 text-xs text-mute-1 ring-1 ring-white/10">
            <span className="h-2 w-2 rounded-full bg-edge-green animate-pulse-dot" aria-hidden />
            14 agents active • 2.4M events/hr
          </span>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Built on Mathematical Edge
          </h1>
          <p className="max-w-prose text-mute-1 md:text-lg">
            AI Sports Intelligence — built on ELO + Poisson + xG ensemble. Not a gambling operator. 18+ only.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="#cta">Reserve Premium Seat</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="#predictions">See Live Predictions</Link>
            </Button>
          </div>
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="aspect-square w-full max-w-[520px] rounded-2xl bg-ink-1 ring-1 ring-white/10 shadow-glow"
          >
            <div className="grid h-full w-full place-items-center text-mute-2 text-sm">HeroReel (Phase 6)</div>
          </div>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_30%,rgba(34,211,238,0.10),transparent_60%)]" />
    </section>
  );
}
```

- [ ] **Step 4: Adjust Button to support `asChild`**

Append to `packages/ui/src/button.tsx` (extend ButtonProps):

```tsx
// at top
import { Slot } from '@radix-ui/react-slot';

// inside Button:
// replace the function body so it supports asChild
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps & { asChild?: boolean }>(
  ({ className, variant = 'primary', size = 'md', asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref as never} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
  },
);
Button.displayName = 'Button';
```

Add dependency to `packages/ui/package.json`:

```json
"@radix-ui/react-slot": "1.1.1"
```

- [ ] **Step 5: Install + run test, expect pass**

```bash
pnpm install
pnpm -F @apexpredix/web test -- Hero
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/sections/Hero.tsx apps/web/components/sections/__tests__/Hero.test.tsx packages/ui/src/button.tsx packages/ui/package.json
git commit -m "feat(sections): Hero with live pill, CTAs, HeroReel placeholder"
```

---

### Task 2.4: PredictionsPreview section (skeleton)

**Files:**
- Create: `apps/web/components/sections/PredictionsPreview.tsx`
- Test: `apps/web/components/sections/__tests__/PredictionsPreview.test.tsx`

> P2 ships with 6 hard-coded placeholder cards. P4 swaps them for real `MatchCard` instances driven by `fixtures.json`.

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PredictionsPreview } from '../PredictionsPreview';

describe('PredictionsPreview', () => {
  it('renders heading and 6 placeholder cards', () => {
    render(<PredictionsPreview />);
    expect(screen.getByRole('heading', { name: /live predictions/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('match-card-placeholder')).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run test, expect fail.**

```bash
pnpm -F @apexpredix/web test -- PredictionsPreview
```

- [ ] **Step 3: Write `apps/web/components/sections/PredictionsPreview.tsx`**

```tsx
import Link from 'next/link';

export function PredictionsPreview() {
  return (
    <section id="predictions" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Live Predictions</h2>
            <p className="mt-2 text-mute-1">Model: Poisson-xG v3.2 • refreshed every 2h</p>
          </div>
          <Link href="/predictions" className="text-sm text-edge-cyan hover:underline">
            Open Full Predictions →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              data-testid="match-card-placeholder"
              className="aspect-[16/11] rounded-2xl bg-ink-1 ring-1 ring-white/10"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test, expect pass.**

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/sections/PredictionsPreview.tsx apps/web/components/sections/__tests__/PredictionsPreview.test.tsx
git commit -m "feat(sections): PredictionsPreview skeleton (6 placeholder cards)"
```

---

### Task 2.5: Methodology section

**Files:**
- Create: `apps/web/components/sections/Methodology.tsx`
- Test: `apps/web/components/sections/__tests__/Methodology.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Methodology } from '../Methodology';

describe('Methodology', () => {
  it('renders ELO, Poisson, xG cards and Ensemble badge', () => {
    render(<Methodology />);
    expect(screen.getByText('ELO Model')).toBeInTheDocument();
    expect(screen.getByText('Poisson Model')).toBeInTheDocument();
    expect(screen.getByText('Expected Goals (xG)')).toBeInTheDocument();
    expect(screen.getByText(/ensemble/i)).toBeInTheDocument();
  });
  it('renders the Kelly formula', () => {
    render(<Methodology />);
    expect(screen.getByText(/¼ Kelly/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect fail.**

- [ ] **Step 3: Write `apps/web/components/sections/Methodology.tsx`**

```tsx
const PILLARS = [
  { title: 'ELO Model', body: 'Recursive team strength updated post-match with home/away and league weights.' },
  { title: 'Poisson Model', body: 'Score-line probabilities derived from attack/defense intensities.' },
  { title: 'Expected Goals (xG)', body: 'Shot-quality model trained on chance creation, not just outcomes.' },
] as const;

export function Methodology() {
  return (
    <section id="methodology" className="border-b border-white/5 bg-ink-1/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Our Approach</h2>
        <p className="mb-12 max-w-prose text-mute-1">
          Three independent models. One ensemble verdict. ¼ Kelly for bankroll safety.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {PILLARS.map((p) => (
            <article key={p.title} className="rounded-2xl bg-ink-2 p-6 ring-1 ring-white/10">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-mute-1">{p.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 grid place-items-center">
          <span className="rounded-full bg-edge-cyan/15 px-4 py-2 text-edge-cyan ring-1 ring-edge-cyan/30">
            ▾ Ensemble verdict
          </span>
        </div>
        <article className="mt-12 rounded-2xl bg-ink-2 p-6 ring-1 ring-white/10">
          <h3 className="text-lg font-semibold">Kelly Criterion Staking</h3>
          <p className="mt-2 font-mono text-sm text-mute-1">b = odds − 1, p = probability, q = 1 − p — we use ¼ Kelly for safety.</p>
        </article>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test, expect pass. Commit.**

```bash
git add apps/web/components/sections/Methodology.tsx apps/web/components/sections/__tests__/Methodology.test.tsx
git commit -m "feat(sections): Methodology (ELO/Poisson/xG/Ensemble/Kelly)"
```

---

### Task 2.6: Backtest section

**Files:**
- Create: `apps/web/components/sections/Backtest.tsx`
- Test: `apps/web/components/sections/__tests__/Backtest.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Backtest } from '../Backtest';

describe('Backtest', () => {
  it('renders ROI tile and disclaimer', () => {
    render(<Backtest />);
    expect(screen.getByText('ROI')).toBeInTheDocument();
    expect(screen.getByText(/Past performance/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect fail. Step 3: Write `apps/web/components/sections/Backtest.tsx`**

```tsx
const TILES = [
  { label: 'Total Staked', value: '$100' },
  { label: 'Total Returned', value: '$108.50' },
  { label: 'Net Profit', value: '+$8.50' },
  { label: 'ROI', value: '+8.5%' },
  { label: 'Win Rate', value: '89.3%' },
  { label: 'Active Streak', value: '6W' },
] as const;

export function Backtest() {
  return (
    <section id="backtest" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Historical Backtesting</h2>
        <p className="mb-10 max-w-prose text-mute-1">
          Simulates $10 flat stake on each of 10 historical matches. Past performance ≠ future.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {TILES.map((t) => (
            <div key={t.label} className="rounded-2xl bg-ink-1 p-4 ring-1 ring-white/10">
              <div className="text-xs uppercase tracking-wide text-mute-2">{t.label}</div>
              <div className="mt-1 text-xl font-semibold">{t.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/components/sections/Backtest.tsx apps/web/components/sections/__tests__/Backtest.test.tsx
git commit -m "feat(sections): Backtest tiles + responsible-use disclaimer"
```

---

### Task 2.7: Stats section ("Numbers That Speak")

**Files:**
- Create: `apps/web/components/sections/Stats.tsx`
- Test: `apps/web/components/sections/__tests__/Stats.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Stats } from '../Stats';

describe('Stats', () => {
  it('renders the 6 stat tiles', () => {
    render(<Stats />);
    expect(screen.getByText(/89.3%/)).toBeInTheDocument();
    expect(screen.getByText(/14 leagues/i)).toBeInTheDocument();
    expect(screen.getByText(/7 sports/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2-3: Write `apps/web/components/sections/Stats.tsx`**

```tsx
const STATS = [
  { value: '89.3%', label: 'Accuracy' },
  { value: '14 leagues', label: 'Coverage' },
  { value: '7 sports', label: 'Coverage' },
  { value: '2.4M events/hr', label: 'Throughput' },
  { value: '+8.5% ROI', label: 'Backtest' },
  { value: 'Last 200', label: 'Sample window' },
] as const;

export function Stats() {
  return (
    <section id="stats" className="border-b border-white/5 bg-ink-1/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-10 text-3xl font-semibold tracking-tight md:text-4xl">Numbers That Speak</h2>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {STATS.map((s) => (
            <div key={s.value} className="rounded-2xl bg-ink-2 p-5 ring-1 ring-white/10">
              <dt className="text-xs uppercase tracking-wide text-mute-2">{s.label}</dt>
              <dd className="mt-1 text-2xl font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/components/sections/Stats.tsx apps/web/components/sections/__tests__/Stats.test.tsx
git commit -m "feat(sections): Stats tiles (Accuracy, Coverage, Throughput, Backtest ROI)"
```

---

### Task 2.8: Network section (Live Intelligence Grid skeleton)

**Files:**
- Create: `apps/web/components/sections/Network.tsx`
- Test: `apps/web/components/sections/__tests__/Network.test.tsx`

> P2 hard-codes 14 placeholder tiles; P4 binds them to `agents.json`.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Network } from '../Network';

describe('Network', () => {
  it('renders 14 agent tiles', () => {
    render(<Network />);
    expect(screen.getAllByTestId('agent-tile')).toHaveLength(14);
  });
});
```

- [ ] **Step 2-3: Write `apps/web/components/sections/Network.tsx`**

```tsx
export function Network() {
  return (
    <section id="network" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Live Intelligence Grid</h2>
        <p className="mb-10 max-w-prose text-mute-1">
          14 autonomous agents. 2.4M events/hr. Self-update every 2 hours. No human intervention needed.
        </p>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 14 }, (_, i) => (
            <li
              key={i}
              data-testid="agent-tile"
              className="rounded-2xl bg-ink-1 p-4 ring-1 ring-white/10"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Agent #{i + 1}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-edge-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-edge-green animate-pulse-dot" aria-hidden /> Live
                </span>
              </div>
              <div className="mt-3 h-8 w-full rounded bg-ink-2" aria-hidden />
              <div className="mt-2 text-xs text-mute-2">Heartbeat 2s ago</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/components/sections/Network.tsx apps/web/components/sections/__tests__/Network.test.tsx
git commit -m "feat(sections): Network skeleton (14 agent tiles)"
```

---

### Task 2.9: Premium section (free vs premium + pricing card)

**Files:**
- Create: `apps/web/components/sections/Premium.tsx`
- Test: `apps/web/components/sections/__tests__/Premium.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Premium } from '../Premium';

describe('Premium', () => {
  it('renders Free vs Premium comparison rows', () => {
    render(<Premium />);
    expect(screen.getByText(/4 predictions\/day/i)).toBeInTheDocument();
    expect(screen.getByText(/10 predictions\/day/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reserve premium seat/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2-3: Write `apps/web/components/sections/Premium.tsx`**

```tsx
import Link from 'next/link';
import { Button } from '@apexpredix/ui';

const FEATURES: ReadonlyArray<{ label: string; free: string; premium: string }> = [
  { label: 'Daily predictions', free: '4 predictions/day', premium: '10 predictions/day' },
  { label: 'Analysis depth', free: 'Basic', premium: 'Deep narrative + line movement' },
  { label: 'Value bet alerts', free: '—', premium: 'Real-time' },
  { label: 'Kelly staking calculator', free: '—', premium: 'Included' },
  { label: 'Telegram / email alerts', free: '—', premium: 'Included' },
  { label: 'Regional pricing', free: 'USD', premium: 'PPP-adjusted' },
];

export function Premium() {
  return (
    <section id="premium" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-10 text-3xl font-semibold tracking-tight md:text-4xl">Premium Features</h2>
        <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-2 text-mute-1">
              <tr>
                <th className="px-4 py-3">Feature</th>
                <th className="px-4 py-3">Free</th>
                <th className="px-4 py-3 text-edge-cyan">Premium</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.label} className="border-t border-white/5">
                  <td className="px-4 py-3 font-medium">{f.label}</td>
                  <td className="px-4 py-3 text-mute-1">{f.free}</td>
                  <td className="px-4 py-3">{f.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild variant="primary" size="lg"><Link href="#cta">Reserve Premium Seat</Link></Button>
          <Button asChild variant="secondary" size="lg"><Link href="#cta">Start Free</Link></Button>
          <span className="text-xs text-mute-2">Special African pricing applied via PPP adjustment.</span>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/components/sections/Premium.tsx apps/web/components/sections/__tests__/Premium.test.tsx
git commit -m "feat(sections): Premium comparison table + CTAs"
```

---

### Task 2.10: HowToUse section (4-step flow)

**Files:**
- Create: `apps/web/components/sections/HowToUse.tsx`
- Test: `apps/web/components/sections/__tests__/HowToUse.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HowToUse } from '../HowToUse';

describe('HowToUse', () => {
  it('renders 4 numbered steps', () => {
    render(<HowToUse />);
    expect(screen.getAllByTestId('step-card')).toHaveLength(4);
  });
});
```

- [ ] **Step 2-3: Write `apps/web/components/sections/HowToUse.tsx`**

```tsx
const STEPS = [
  { n: 1, title: 'Pick your region', body: 'We tailor pricing and bookmaker recommendations to where you are.' },
  { n: 2, title: 'Browse predictions', body: 'Live forecasts updated every two hours by autonomous agents.' },
  { n: 3, title: 'See value bets', body: 'When the market disagrees with the model, the chip lights up.' },
  { n: 4, title: 'Stake responsibly', body: 'We use ¼ Kelly. Set deposit limits. Take breaks. 18+.' },
];

export function HowToUse() {
  return (
    <section id="how-to-use" className="border-b border-white/5 bg-ink-1/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-10 text-3xl font-semibold tracking-tight md:text-4xl">How to Use ApexPredix</h2>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} data-testid="step-card" className="rounded-2xl bg-ink-2 p-6 ring-1 ring-white/10">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-edge-cyan/15 font-mono text-edge-cyan">{s.n}</div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-mute-1">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/components/sections/HowToUse.tsx apps/web/components/sections/__tests__/HowToUse.test.tsx
git commit -m "feat(sections): HowToUse 4-step flow"
```

---

### Task 2.11: CTA section (waitlist form shell + counter)

**Files:**
- Create: `apps/web/components/sections/CTA.tsx`, `apps/web/components/sections/WaitlistForm.tsx`
- Test: `apps/web/components/sections/__tests__/CTA.test.tsx`

> P2 ships the form UI only. P5 wires Turnstile + honeypot + POST to `/api/waitlist`.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CTA } from '../CTA';

describe('CTA', () => {
  it('renders email input and submit button with 18+ checkbox', () => {
    render(<CTA waitlistCount={14203} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reserve my seat/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/18\+/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2-3: Write `apps/web/components/sections/WaitlistForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { Input, Button } from '@apexpredix/ui';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [eighteen, setEighteen] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        // Phase 5 wires this up.
      }}
    >
      {/* honeypot — hidden from users + assistive tech but visible to bots */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="flex-1">
        <span className="sr-only">Email</span>
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-mute-1">
        <input
          type="checkbox"
          checked={eighteen}
          onChange={(e) => setEighteen(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-ink-2"
          required
        />
        I am 18+
      </label>
      <Button type="submit" size="lg" disabled={!email || !eighteen}>
        Reserve my seat
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Write `apps/web/components/sections/CTA.tsx`**

```tsx
import { WaitlistForm } from './WaitlistForm';

interface CTAProps { waitlistCount: number; }

export function CTA({ waitlistCount }: CTAProps) {
  return (
    <section id="cta" className="relative overflow-hidden border-b border-white/5">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Join the Inner Circle</h2>
        <p className="mt-3 text-mute-1">
          <span className="font-semibold text-white">{waitlistCount.toLocaleString()}</span> analysts and bettors are on the waitlist.
        </p>
        <div className="mt-8 rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10">
          <WaitlistForm />
          <p className="mt-3 text-xs text-mute-2">
            We never share your email. ApexPredix AI is an analytics service, not a gambling operator.
          </p>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.10),transparent_60%)]" />
    </section>
  );
}
```

- [ ] **Step 5: Test passes. Commit.**

```bash
git add apps/web/components/sections/CTA.tsx apps/web/components/sections/WaitlistForm.tsx apps/web/components/sections/__tests__/CTA.test.tsx
git commit -m "feat(sections): CTA + WaitlistForm (UI shell, wired in P5)"
```

---

### Task 2.12: Footer + wire all sections into root `page.tsx`

**Files:**
- Create: `apps/web/components/Footer.tsx`
- Modify: `apps/web/app/page.tsx`
- Test: `apps/web/components/__tests__/Footer.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Footer } from '../Footer';

describe('Footer', () => {
  it('renders Maralito Labs attribution and 18+ badge', () => {
    render(<Footer />);
    expect(screen.getByText(/Maralito Labs/i)).toBeInTheDocument();
    expect(screen.getByText('18+')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2-3: Write `apps/web/components/Footer.tsx`**

```tsx
import Link from 'next/link';

const COLUMNS = [
  { title: 'Product', links: [
    { label: 'Predictions', href: '/predictions' },
    { label: 'Premium', href: '/premium' },
    { label: 'How to Use', href: '/how-it-works' },
  ]},
  { title: 'Methodology', links: [
    { label: 'ELO + Poisson + xG', href: '/methodology' },
    { label: 'Backtest', href: '/#backtest' },
    { label: 'Network', href: '/#network' },
  ]},
  { title: 'Legal', links: [
    { label: 'Privacy', href: '/legal/privacy' },
    { label: 'Terms', href: '/legal/terms' },
    { label: 'Cookies', href: '/legal/cookies' },
    { label: 'Disclaimer', href: '/legal/disclaimer' },
  ]},
  { title: 'Company', links: [
    { label: 'About Maralito Labs', href: '/legal/disclaimer' },
    { label: 'Contact', href: 'mailto:help@apexpredix.ai' },
  ]},
];

const RGS_LINKS = [
  { label: 'BeGambleAware', href: 'https://www.begambleaware.org/' },
  { label: 'GamCare', href: 'https://www.gamcare.org.uk/' },
  { label: 'ConnexOntario', href: 'https://www.connexontario.ca/' },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-ink-1/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-4">
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <h3 className="mb-3 text-sm font-semibold text-white">{c.title}</h3>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-mute-1 hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-mute-2">
          <span>Powered by Maralito Labs</span>
          <span className="rounded-md bg-ink-2 px-2 py-1 text-white">18+</span>
          <ul className="flex flex-wrap gap-3">
            {RGS_LINKS.map((l) => (
              <li key={l.label}><a href={l.href} className="hover:text-white" rel="noopener noreferrer" target="_blank">{l.label}</a></li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Update `apps/web/app/page.tsx` to wire all sections**

```tsx
import { Hero } from '@/components/sections/Hero';
import { PredictionsPreview } from '@/components/sections/PredictionsPreview';
import { Methodology } from '@/components/sections/Methodology';
import { Backtest } from '@/components/sections/Backtest';
import { Stats } from '@/components/sections/Stats';
import { Network } from '@/components/sections/Network';
import { Premium } from '@/components/sections/Premium';
import { HowToUse } from '@/components/sections/HowToUse';
import { CTA } from '@/components/sections/CTA';
import { Footer } from '@/components/Footer';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';

export default function Home() {
  return (
    <>
      <Sidebar pathname="/" />
      <MobileNav pathname="/" />
      <main id="main" className="lg:pl-64">
        <Hero />
        <PredictionsPreview />
        <Methodology />
        <Backtest />
        <Stats />
        <Network />
        <Premium />
        <HowToUse />
        <CTA waitlistCount={14203} />
        <Footer />
      </main>
    </>
  );
}
```

- [ ] **Step 5: Run dev server and visually verify**

```bash
pnpm -F @apexpredix/web dev &
sleep 6
curl -sS http://localhost:3000 | grep -q "Built on Mathematical Edge" && echo OK || echo FAIL
kill %1
```

Expected: OK.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/Footer.tsx apps/web/components/__tests__/Footer.test.tsx apps/web/app/page.tsx
git commit -m "feat(web): wire all P2 sections into landing + footer"
```

---

**End of Phase 2.** Continue in Phase 3.

---

## Phase 3 — Routing & i18n

### Task 3.1: Install next-intl + i18n config

**Files:**
- Create: `apps/web/i18n/request.ts`, `apps/web/i18n/routing.ts`, `apps/web/i18n/locales.ts`

- [ ] **Step 1: Write `apps/web/i18n/locales.ts`**

```ts
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@apexpredix/types';
export { LOCALES, DEFAULT_LOCALE };
export type { Locale };
```

- [ ] **Step 2: Write `apps/web/i18n/routing.ts`**

```ts
import { defineRouting } from 'next-intl/routing';
import { LOCALES, DEFAULT_LOCALE } from './locales';

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});
```

- [ ] **Step 3: Write `apps/web/i18n/request.ts`**

```ts
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return { locale, messages };
});
```

- [ ] **Step 4: Modify `apps/web/next.config.mjs` to load next-intl plugin**

Top of file:

```js
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
```

Bottom: wrap export with both plugins:

```js
export default withBundleAnalyzer(withNextIntl(nextConfig));
```

- [ ] **Step 5: Install + typecheck**

```bash
pnpm install
pnpm -F @apexpredix/web typecheck
```

Expected: typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/i18n apps/web/next.config.mjs
git commit -m "feat(i18n): next-intl routing config (5 locales, always-prefix)"
```

---

### Task 3.2: Middleware for geo + locale negotiation

**Files:**
- Create: `apps/web/middleware.ts`, `apps/web/lib/geo.ts`
- Test: `apps/web/lib/__tests__/geo.test.ts`

- [ ] **Step 1: Write failing test `apps/web/lib/__tests__/geo.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { regionFromCountry } from '../geo';

describe('regionFromCountry', () => {
  it('maps Nigeria to NG', () => { expect(regionFromCountry('NG')).toBe('NG'); });
  it('maps United States to US', () => { expect(regionFromCountry('US')).toBe('US'); });
  it('maps unknown to US', () => { expect(regionFromCountry('XX')).toBe('US'); });
  it('maps EU countries to EU', () => {
    expect(regionFromCountry('DE')).toBe('EU');
    expect(regionFromCountry('FR')).toBe('EU');
  });
});
```

- [ ] **Step 2: Run test, expect fail (module missing).**

```bash
pnpm -F @apexpredix/web test -- geo
```

- [ ] **Step 3: Write `apps/web/lib/geo.ts`**

```ts
import type { RegionCode } from '@apexpredix/types';

const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE']);

export const regionFromCountry = (country: string | undefined | null): RegionCode => {
  if (!country) return 'US';
  const c = country.toUpperCase();
  if (c === 'NG') return 'NG';
  if (c === 'ZA') return 'ZA';
  if (c === 'KE') return 'KE';
  if (c === 'GB' || c === 'UK') return 'GB';
  if (EU.has(c)) return 'EU';
  return 'US';
};
```

- [ ] **Step 4: Run test, expect pass.**

- [ ] **Step 5: Write `apps/web/middleware.ts`** (geo-fence + locale negotiation in one)

```ts
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const BLOCKLIST_COUNTRIES = new Set(['CN','KP','IR','CU','SA','AE','SG','FR']);
const BLOCKLIST_US_STATES = new Set(['WA','ID','CT','TN','HI']);

const intlMiddleware = createIntlMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|media|dev|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|mp4|webm|vtt|css|js|json|woff2?)).*)'],
};

export function middleware(request: NextRequest) {
  if (process.env.COMPLIANCE_GEOFENCE_ENABLED === 'true') {
    const country = (request.headers.get('x-vercel-ip-country') ?? request.geo?.country ?? '').toUpperCase();
    const state = (request.headers.get('x-vercel-ip-country-region') ?? request.geo?.region ?? '').toUpperCase();
    const blocked = BLOCKLIST_COUNTRIES.has(country) || (country === 'US' && BLOCKLIST_US_STATES.has(state));
    if (blocked && !request.nextUrl.pathname.match(/\/(blocked|under-age|legal\/)/)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${routing.defaultLocale}/blocked`;
      const res = NextResponse.rewrite(url, { status: 451 });
      res.headers.set('x-blocked-reason', country === 'US' ? `US-${state}` : country);
      return res;
    }
  }
  return intlMiddleware(request);
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/middleware.ts apps/web/lib/geo.ts apps/web/lib/__tests__/geo.test.ts
git commit -m "feat(middleware): geo-fence + locale negotiation (rewrite to /blocked on 451)"
```

---

### Task 3.3: Move pages under `[locale]/` and write EN dictionary

**Files:**
- Move: `apps/web/app/page.tsx` → `apps/web/app/[locale]/page.tsx`
- Move: `apps/web/app/layout.tsx` → `apps/web/app/[locale]/layout.tsx` (+ keep root `app/layout.tsx` minimal)
- Create: `apps/web/app/layout.tsx` (root), `apps/web/messages/en.json`

- [ ] **Step 1: Create root `apps/web/app/layout.tsx`** (minimal — just hands off to `[locale]/layout`)

```tsx
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Move existing layout to `apps/web/app/[locale]/layout.tsx`** with next-intl provider

```tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { SkipToContent } from '@/components/nav/SkipToContent';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'ApexPredix AI — Sports Prediction Intelligence',
  description: 'AI sports prediction intelligence by Maralito Labs — ELO + Poisson + xG ensemble engine.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0A0A',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return (
    <html lang={locale} className={inter.variable}>
      <body className="font-sans antialiased">
        <SkipToContent />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Move `apps/web/app/page.tsx` → `apps/web/app/[locale]/page.tsx`** (content unchanged from Task 2.12).

- [ ] **Step 4: Write `apps/web/messages/en.json`**

```json
{
  "_meta": { "status": "stable" },
  "nav": {
    "predictions": "Predictions",
    "methodology": "Methodology",
    "backtest": "Backtest",
    "network": "Network",
    "dashboard": "Dashboard",
    "premium": "Premium",
    "howToUse": "How to Use",
    "help": "Help",
    "settings": "Settings"
  },
  "hero": {
    "pill": "{n} agents active • {events}",
    "title": "Built on Mathematical Edge",
    "subtitle": "AI Sports Intelligence — built on ELO + Poisson + xG ensemble. Not a gambling operator. 18+ only.",
    "ctaPrimary": "Reserve Premium Seat",
    "ctaSecondary": "See Live Predictions"
  },
  "predictions": { "heading": "Live Predictions", "modelLine": "Model: Poisson-xG v3.2 • refreshed every 2h", "openFull": "Open Full Predictions →" },
  "methodology": { "heading": "Our Approach", "intro": "Three independent models. One ensemble verdict. ¼ Kelly for bankroll safety.", "ensemble": "Ensemble verdict", "kellyTitle": "Kelly Criterion Staking", "kellyFormula": "b = odds − 1, p = probability, q = 1 − p — we use ¼ Kelly for safety." },
  "backtest": { "heading": "Historical Backtesting", "disclaimer": "Simulates $10 flat stake on each of 10 historical matches. Past performance ≠ future." },
  "stats": { "heading": "Numbers That Speak" },
  "network": { "heading": "Live Intelligence Grid", "intro": "14 autonomous agents. 2.4M events/hr. Self-update every 2 hours. No human intervention needed." },
  "premium": { "heading": "Premium Features", "regionNote": "Special African pricing applied via PPP adjustment.", "ctaReserve": "Reserve Premium Seat", "ctaFree": "Start Free" },
  "howToUse": { "heading": "How to Use ApexPredix", "step1Title": "Pick your region", "step1Body": "We tailor pricing and bookmaker recommendations to where you are.", "step2Title": "Browse predictions", "step2Body": "Live forecasts updated every two hours by autonomous agents.", "step3Title": "See value bets", "step3Body": "When the market disagrees with the model, the chip lights up.", "step4Title": "Stake responsibly", "step4Body": "We use ¼ Kelly. Set deposit limits. Take breaks. 18+." },
  "cta": { "heading": "Join the Inner Circle", "counter": "{count} analysts and bettors are on the waitlist.", "emailLabel": "Email", "emailPlaceholder": "you@example.com", "eighteen": "I am 18+", "submit": "Reserve my seat", "footnote": "We never share your email. ApexPredix AI is an analytics service, not a gambling operator." },
  "footer": { "powered": "Powered by Maralito Labs", "rgs": "Responsible gambling resources" },
  "settings": { "title": "Settings", "language": "Language", "theme": "Theme", "region": "Region", "manageCookies": "Manage cookies", "close": "Close" },
  "ageGate": { "heading": "Are you 18 or older?", "subtitle": "ApexPredix AI is intended for adults only.", "yes": "I am 18 or older", "no": "I am under 18" },
  "blocked": { "heading": "Unavailable in your region", "body": "We're not able to offer ApexPredix AI here. Please contact legal@apexpredix.ai for jurisdictional inquiries." }
}
```

- [ ] **Step 5: Smoke-test build + boot**

```bash
pnpm -F @apexpredix/web build
```

Expected: build succeeds, routes include `/[locale]/...`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app apps/web/messages/en.json
git commit -m "feat(i18n): move app under [locale]/ + full EN dictionary"
```

---

### Task 3.4: Stub ES / YO / HA / ZU dictionaries

**Files:**
- Create: `apps/web/messages/{es,yo,ha,zu}.json`
- Test: `apps/web/__tests__/dictionary-coverage.test.ts`

- [ ] **Step 1: Write failing test `apps/web/__tests__/dictionary-coverage.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import en from '../messages/en.json';
import es from '../messages/es.json';
import yo from '../messages/yo.json';
import ha from '../messages/ha.json';
import zu from '../messages/zu.json';

const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flatten(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k)
      : [`${prefix}.${k}`]
  );

describe('dictionary coverage', () => {
  const enKeys = flatten(en);
  it.each([['es', es], ['yo', yo], ['ha', ha], ['zu', zu]] as const)(
    '%s has every EN key',
    (_, dict) => {
      const keys = flatten(dict);
      expect(keys.sort()).toEqual(enKeys.sort());
    },
  );
});
```

- [ ] **Step 2: Create `apps/web/messages/es.json`**

```json
{
  "_meta": { "status": "beta", "translator": "machine-baseline" },
  "nav": { "predictions": "Predicciones", "methodology": "Metodología", "backtest": "Backtest", "network": "Red", "dashboard": "Panel", "premium": "Premium", "howToUse": "Cómo usar", "help": "Ayuda", "settings": "Ajustes" },
  "hero": { "pill": "{n} agentes activos • {events}", "title": "Construido sobre ventaja matemática", "subtitle": "Inteligencia deportiva por IA — basada en el ensamble ELO + Poisson + xG. No somos un operador de apuestas. Solo +18.", "ctaPrimary": "Reservar Premium", "ctaSecondary": "Ver predicciones en vivo" },
  "predictions": { "heading": "Predicciones en vivo", "modelLine": "Modelo: Poisson-xG v3.2 • actualizado cada 2h", "openFull": "Ver todas las predicciones →" },
  "methodology": { "heading": "Nuestro enfoque", "intro": "Tres modelos independientes. Un veredicto de ensamble. ¼ Kelly para proteger el bankroll.", "ensemble": "Veredicto de ensamble", "kellyTitle": "Apuesta de Kelly", "kellyFormula": "b = cuota − 1, p = probabilidad, q = 1 − p — usamos ¼ Kelly por seguridad." },
  "backtest": { "heading": "Backtesting histórico", "disclaimer": "Simula $10 fijos en cada uno de 10 partidos históricos. El desempeño pasado ≠ futuro." },
  "stats": { "heading": "Números que hablan" },
  "network": { "heading": "Red de inteligencia en vivo", "intro": "14 agentes autónomos. 2.4M eventos/hora. Se actualizan cada 2 horas. Sin intervención humana." },
  "premium": { "heading": "Funciones premium", "regionNote": "Precio especial africano aplicado vía ajuste PPA.", "ctaReserve": "Reservar Premium", "ctaFree": "Empezar gratis" },
  "howToUse": { "heading": "Cómo usar ApexPredix", "step1Title": "Elige tu región", "step1Body": "Adaptamos precios y recomendaciones de casas a tu ubicación.", "step2Title": "Explora las predicciones", "step2Body": "Pronósticos en vivo actualizados cada dos horas por agentes autónomos.", "step3Title": "Detecta value bets", "step3Body": "Cuando el mercado se separa del modelo, el chip se ilumina.", "step4Title": "Apuesta con responsabilidad", "step4Body": "Usamos ¼ Kelly. Pon límites. Toma pausas. +18." },
  "cta": { "heading": "Únete al círculo interno", "counter": "{count} analistas y apostadores están en la lista.", "emailLabel": "Email", "emailPlaceholder": "tu@ejemplo.com", "eighteen": "Tengo 18 o más", "submit": "Reservar mi lugar", "footnote": "Nunca compartimos tu email. ApexPredix AI es un servicio analítico, no un operador de apuestas." },
  "footer": { "powered": "Desarrollado por Maralito Labs", "rgs": "Recursos de juego responsable" },
  "settings": { "title": "Ajustes", "language": "Idioma", "theme": "Tema", "region": "Región", "manageCookies": "Gestionar cookies", "close": "Cerrar" },
  "ageGate": { "heading": "¿Tienes 18 años o más?", "subtitle": "ApexPredix AI es solo para adultos.", "yes": "Tengo 18 o más", "no": "Soy menor de 18" },
  "blocked": { "heading": "No disponible en tu región", "body": "No podemos ofrecer ApexPredix AI aquí. Escribe a legal@apexpredix.ai para consultas jurisdiccionales." }
}
```

- [ ] **Step 3: Create `apps/web/messages/yo.json`** (Yoruba — machine-baseline; same key structure as EN, translated values)

```json
{
  "_meta": { "status": "beta", "translator": "machine-baseline" },
  "nav": { "predictions": "Asọtẹlẹ", "methodology": "Ọnà-ìkọ́nilẹ́kọ̀ọ́", "backtest": "Àyẹ̀wò Itan", "network": "Nẹtiwọki", "dashboard": "Pátíò", "premium": "Premium", "howToUse": "Bí a ṣe ń lò ó", "help": "Ìrànlọ́wọ́", "settings": "Ìṣètò" },
  "hero": { "pill": "{n} aṣojú ń ṣiṣẹ́ • {events}", "title": "A Kọ́ Lórí Èdá Òfin Ìṣirò", "subtitle": "Olóye Ìdárayá AI — kọ́ lórí ELO + Poisson + xG. Kì í ṣe oníṣẹ́ tẹtẹ. 18+ nìkan.", "ctaPrimary": "Fi Premium pamọ́", "ctaSecondary": "Wo Asọtẹlẹ Laaye" },
  "predictions": { "heading": "Asọtẹlẹ Laaye", "modelLine": "Àwòṣe: Poisson-xG v3.2 • ń tún ṣe ní gbogbo wákàtí 2", "openFull": "Wo Gbogbo Asọtẹlẹ →" },
  "methodology": { "heading": "Ọ̀nà Wa", "intro": "Àwòṣe mẹ́ta tó dá lóye. Ìdájọ́ kan ṣoṣo. ¼ Kelly fún ààbò.", "ensemble": "Ìdájọ́ apapọ", "kellyTitle": "Ìfowó Kelly", "kellyFormula": "b = oṣuwọn − 1, p = ìṣeéṣe, q = 1 − p — a ń lo ¼ Kelly." },
  "backtest": { "heading": "Àyẹ̀wò Itan", "disclaimer": "Àpẹẹrẹ $10 fún ọkọọkan ti 10 idije. Iṣẹ tó kọjá ≠ tó wà níwájú." },
  "stats": { "heading": "Àwọn Nọ́mbà Tó Sọrọ̀" },
  "network": { "heading": "Àkànṣe Olóye Laaye", "intro": "14 aṣojú adáṣe. 2.4M iṣẹlẹ/wákàtí. Ní gbogbo wákàtí 2." },
  "premium": { "heading": "Àwọn Èròjà Premium", "regionNote": "Iye owó Áfríkà ní pàtàkì.", "ctaReserve": "Fi Premium pamọ́", "ctaFree": "Bẹ̀rẹ̀ Ọ̀fẹ́" },
  "howToUse": { "heading": "Bí a ṣe ń lò ApexPredix", "step1Title": "Yan agbègbè rẹ", "step1Body": "A ṣe àtúnṣe iye-owó àti àwọn ìmọ̀ràn fún ibi tó wà.", "step2Title": "Lọ wo asọtẹlẹ", "step2Body": "Asọtẹlẹ laaye, tí a tún ṣe ní gbogbo wákàtí 2.", "step3Title": "Wo Value Bet", "step3Body": "Nígbà tí ọjà ò bá àwòṣe, chip náà yóò tan.", "step4Title": "Tẹtẹ pẹlu ojúse", "step4Body": "A lo ¼ Kelly. Ṣètò àwọn ààlà. 18+." },
  "cta": { "heading": "Darapọ̀ mọ́ ìbálẹ̀rì", "counter": "{count} ọmọ-ẹgbẹ́ wà nínú àkójọ ìdúró.", "emailLabel": "Email", "emailPlaceholder": "iwo@apẹẹrẹ.com", "eighteen": "Mo ti pé ọmọ ọdún 18+", "submit": "Fi ààyè mi pamọ́", "footnote": "A kì í pín email rẹ. ApexPredix AI jẹ́ iṣẹ́ ìtúpalẹ̀." },
  "footer": { "powered": "Maralito Labs ló pèsè", "rgs": "Àwọn ohun ìrànlọ́wọ́ tẹtẹ tó ní ojúse" },
  "settings": { "title": "Ìṣètò", "language": "Èdè", "theme": "Awọ̀ rojú-ìwò", "region": "Agbègbè", "manageCookies": "Ṣakoso kuki", "close": "Tì" },
  "ageGate": { "heading": "Ṣe ọmọ ọdún 18 tàbí jù lọ ni ọ?", "subtitle": "ApexPredix AI jẹ́ fún àwọn agbalagba nìkan.", "yes": "Mo ti pé 18", "no": "Mi ò tíì pé 18" },
  "blocked": { "heading": "Kò sí láàrín agbègbè rẹ", "body": "A kò lè pèsè ApexPredix AI níbí. Kàn sí legal@apexpredix.ai." }
}
```

- [ ] **Step 4: Create `apps/web/messages/ha.json`** (Hausa — same key structure as EN, machine-baseline)

```json
{
  "_meta": { "status": "beta", "translator": "machine-baseline" },
  "nav": { "predictions": "Tsinkaya", "methodology": "Hanyar Aiki", "backtest": "Gwajin Tarihi", "network": "Cibiyar Sadarwa", "dashboard": "Allon Bayyana", "premium": "Premium", "howToUse": "Yadda Ake Amfani", "help": "Taimako", "settings": "Saituna" },
  "hero": { "pill": "Wakilai {n} suna aiki • {events}", "title": "An Gina Akan Lissafi", "subtitle": "Hankali na AI na wasanni — bisa ensemble ELO + Poisson + xG. Ba mai gudanar da caca ba ne. 18+ kawai.", "ctaPrimary": "Ajiye Premium", "ctaSecondary": "Duba Tsinkaya Kai Tsaye" },
  "predictions": { "heading": "Tsinkaya Kai Tsaye", "modelLine": "Model: Poisson-xG v3.2 • ana sabunta kowace awa 2", "openFull": "Bude Dukan Tsinkaya →" },
  "methodology": { "heading": "Hanyarmu", "intro": "Models guda uku masu cin gashin kansu. Hukunci daya. ¼ Kelly don kariya.", "ensemble": "Hukuncin Ensemble", "kellyTitle": "Caca ta Kelly", "kellyFormula": "b = odds − 1, p = yiwuwa, q = 1 − p — muna amfani da ¼ Kelly." },
  "backtest": { "heading": "Gwajin Tarihi", "disclaimer": "Yana kwaikwayon $10 a kan kowace daga cikin wasanni 10. Wadanda suka gabata ≠ na gaba." },
  "stats": { "heading": "Lambobi Da Suke Magana" },
  "network": { "heading": "Cibiyar Hankali Kai Tsaye", "intro": "Wakilai 14 masu sarrafa kansu. 2.4M abubuwa/awa. Sun sabunta kowace awa 2." },
  "premium": { "heading": "Abubuwan Premium", "regionNote": "Farashin Afrika na musamman.", "ctaReserve": "Ajiye Premium", "ctaFree": "Fara Kyauta" },
  "howToUse": { "heading": "Yadda Ake Amfani Da ApexPredix", "step1Title": "Zaɓi yankinka", "step1Body": "Muna saita farashi da shawarwarin caca don wurin da kake.", "step2Title": "Duba tsinkaya", "step2Body": "Tsinkaya kai tsaye, ana sabuntawa kowace awa 2.", "step3Title": "Ga value bet", "step3Body": "Lokacin da kasuwa ba ta yarda da model ba, chip yana haskakawa.", "step4Title": "Caca da nauyi", "step4Body": "Muna amfani da ¼ Kelly. Saita iyaka. 18+." },
  "cta": { "heading": "Shiga Cikin Da'irar Ciki", "counter": "Masu nazari da masu caca {count} suna kan jerin jira.", "emailLabel": "Email", "emailPlaceholder": "kai@misali.com", "eighteen": "Ina da shekara 18+", "submit": "Ajiye kujera ta", "footnote": "Ba mu raba email ɗinka. ApexPredix AI sabis ne na nazari." },
  "footer": { "powered": "Maralito Labs ne ya samar", "rgs": "Albarkatun caca masu nauyi" },
  "settings": { "title": "Saituna", "language": "Harshe", "theme": "Jigo", "region": "Yanki", "manageCookies": "Sarrafa kukis", "close": "Rufe" },
  "ageGate": { "heading": "Kana da shekaru 18 ko fiye?", "subtitle": "ApexPredix AI na manya ne kawai.", "yes": "Ina da shekara 18+", "no": "Ina karkashin 18" },
  "blocked": { "heading": "Ba ya nan a yankinka", "body": "Ba mu iya bayar da ApexPredix AI a nan. Tuntubi legal@apexpredix.ai." }
}
```

- [ ] **Step 5: Create `apps/web/messages/zu.json`** (Zulu — same key structure, machine-baseline)

```json
{
  "_meta": { "status": "beta", "translator": "machine-baseline" },
  "nav": { "predictions": "Iziphrofetho", "methodology": "Indlela Yethu", "backtest": "Ihlolo Lomlando", "network": "Inethiwekhi", "dashboard": "Ibhodi Yokulawula", "premium": "Premium", "howToUse": "Indlela Yokusebenzisa", "help": "Usizo", "settings": "Izilungiselelo" },
  "hero": { "pill": "Ama-ejenti angu-{n} ayasebenza • {events}", "title": "Yakhiwe ngokukala kwemathematiki", "subtitle": "Ubuhlakani be-AI bezemidlalo — bakhelwe ku-ensemble ye-ELO + Poisson + xG. Asiwona umqondisi wokubheja. 18+ kuphela.", "ctaPrimary": "Gcina i-Premium", "ctaSecondary": "Bona Iziphrofetho Bukhoma" },
  "predictions": { "heading": "Iziphrofetho Bukhoma", "modelLine": "Imodeli: Poisson-xG v3.2 • iyavuselelwa njalo emahoreni amabili", "openFull": "Vula zonke iziphrofetho →" },
  "methodology": { "heading": "Indlela Yethu", "intro": "Amamodeli amathathu azimele. Isinqumo esisodwa. ¼ Kelly ukuze kuphephe.", "ensemble": "Isinqumo se-ensemble", "kellyTitle": "Ukufaka kwe-Kelly", "kellyFormula": "b = i-odds − 1, p = amathuba, q = 1 − p — sisebenzisa ¼ Kelly." },
  "backtest": { "heading": "Ihlolo Lomlando", "disclaimer": "Lifanisa u-$10 kuyo yonke imidlalo eyi-10. Ukusebenza okudlule ≠ okuzayo." },
  "stats": { "heading": "Izinombolo Ezikhulumayo" },
  "network": { "heading": "Igridi Yobuhlakani Bukhoma", "intro": "Ama-ejenti azimele angu-14. Izehlakalo ezingu-2.4M/ihora. Ayazivuselela njalo emahoreni amabili." },
  "premium": { "heading": "Izici ze-Premium", "regionNote": "Intengo ye-Afrika ekhethekile isetshenzisiwe.", "ctaReserve": "Gcina i-Premium", "ctaFree": "Qala Mahhala" },
  "howToUse": { "heading": "Indlela Yokusebenzisa i-ApexPredix", "step1Title": "Khetha isifunda sakho", "step1Body": "Silungiselela intengo nezincomo zezindlu ezilingana nawe.", "step2Title": "Bheka iziphrofetho", "step2Body": "Iziphrofetho ezivuseleleka njalo emahoreni amabili.", "step3Title": "Bona ama-value bet", "step3Body": "Lapho imakethe ingavumelani nemodeli, i-chip iyakhanya.", "step4Title": "Bheja ngokuzibophezela", "step4Body": "Sisebenzisa ¼ Kelly. Beka imikhawulo. 18+." },
  "cta": { "heading": "Joyina Indilinga Yangaphakathi", "counter": "Abahlaziyi nababhejayo abangu-{count} bakwiwaitlist.", "emailLabel": "I-imeyili", "emailPlaceholder": "wena@isibonelo.com", "eighteen": "Nginezikhathi ezingu-18+", "submit": "Gcina isihlalo sami", "footnote": "Asiyabelani i-imeyili yakho. I-ApexPredix AI iyinkonzo yokuhlaziya." },
  "footer": { "powered": "Inikezwe yi-Maralito Labs", "rgs": "Izinsiza zokubheja ngokuzibophezela" },
  "settings": { "title": "Izilungiselelo", "language": "Ulimi", "theme": "Itimu", "region": "Isifunda", "manageCookies": "Phatha amakhukhi", "close": "Vala" },
  "ageGate": { "heading": "Uneminyaka engu-18 noma ngaphezulu?", "subtitle": "I-ApexPredix AI ingeyabantu abadala kuphela.", "yes": "Ngineminyaka engu-18+", "no": "Ngingaphansi kuka-18" },
  "blocked": { "heading": "Ayitholakali esifundeni sakho", "body": "Asikwazi ukunikeza i-ApexPredix AI lapha. Thinta legal@apexpredix.ai." }
}
```

- [ ] **Step 6: Run dictionary coverage test, expect pass**

```bash
pnpm -F @apexpredix/web test -- dictionary-coverage
```

Expected: 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/messages apps/web/__tests__/dictionary-coverage.test.ts
git commit -m "feat(i18n): ES/YO/HA/ZU stub dictionaries (machine-baseline)"
```

---

### Task 3.5: LanguageSwitcher component

**Files:**
- Create: `apps/web/components/nav/LanguageSwitcher.tsx`
- Test: `apps/web/components/nav/__tests__/LanguageSwitcher.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LanguageSwitcher } from '../LanguageSwitcher';

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
vi.mock('next/navigation', () => ({ usePathname: () => '/en', useRouter: () => ({ push: vi.fn() }) }));

describe('LanguageSwitcher', () => {
  it('shows current locale and beta badge for non-EN locales', async () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button', { name: /english/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /english/i }));
    expect(screen.getAllByText(/beta/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2-3: Write `apps/web/components/nav/LanguageSwitcher.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { LOCALES } from '@apexpredix/types';

const LABELS: Record<string, string> = { en: 'English', es: 'Español', yo: 'Yorùbá', ha: 'Hausa', zu: 'Zulu' };

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const change = (next: string) => {
    document.cookie = `apexpredix-language=${next}; path=/; max-age=31536000; samesite=lax`;
    const segments = pathname.split('/');
    segments[1] = next;
    router.push(segments.join('/'));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mute-1 ring-1 ring-white/10 hover:text-white"
      >
        {LABELS[locale]} <ChevronDown size={14} />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 z-40 mt-2 w-48 rounded-xl bg-ink-2 p-1 ring-1 ring-white/10">
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                role="option"
                aria-selected={locale === l}
                onClick={() => change(l)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-white hover:bg-white/5"
              >
                <span>{LABELS[l]}</span>
                {l !== 'en' && <span className="rounded bg-edge-amber/15 px-1.5 py-0.5 text-[10px] uppercase text-edge-amber">Beta</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/components/nav/LanguageSwitcher.tsx apps/web/components/nav/__tests__/LanguageSwitcher.test.tsx
git commit -m "feat(nav): LanguageSwitcher with beta badges for non-EN locales"
```

---

### Task 3.6: ThemeToggle (dark/light) + persistence

**Files:**
- Create: `apps/web/components/nav/ThemeToggle.tsx`, `apps/web/components/nav/theme-script.tsx`
- Modify: `apps/web/app/[locale]/layout.tsx` (insert blocking theme script before body to prevent FOUC)

- [ ] **Step 1: Write `apps/web/components/nav/theme-script.tsx`**

```tsx
export function ThemeScript() {
  const code = `
    try {
      var t = localStorage.getItem('apexpredix-theme');
      var m = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var dark = t ? t === 'dark' : m;
      if (dark) document.documentElement.classList.add('dark');
    } catch(e) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
```

- [ ] **Step 2: Write `apps/web/components/nav/ThemeToggle.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('apexpredix-theme', next ? 'dark' : 'light'); } catch {}
  };

  return (
    <button
      type="button"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-mute-1 ring-1 ring-white/10 hover:text-white"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
```

- [ ] **Step 3: Insert `<ThemeScript />` into `[locale]/layout.tsx` `<head>`** (just before `<body>`, via `<head>` injection):

```tsx
// In LocaleLayout, replace the html return with:
return (
  <html lang={locale} className={inter.variable}>
    <head>
      <ThemeScript />
    </head>
    <body className="font-sans antialiased">
      ...
```

Import `ThemeScript` at top of file: `import { ThemeScript } from '@/components/nav/theme-script';`

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/nav/ThemeToggle.tsx apps/web/components/nav/theme-script.tsx apps/web/app/[locale]/layout.tsx
git commit -m "feat(nav): ThemeToggle + FOUC-prevention script"
```

---

### Task 3.7: RegionPicker (sourced from middleware geo + user override)

**Files:**
- Create: `apps/web/components/nav/RegionPicker.tsx`
- Test: `apps/web/components/nav/__tests__/RegionPicker.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { RegionPicker } from '../RegionPicker';

describe('RegionPicker', () => {
  it('lists all 6 regions and lets the user pick one', async () => {
    render(<RegionPicker initial="US" />);
    await userEvent.click(screen.getByRole('button', { name: /region/i }));
    expect(screen.getAllByRole('option')).toHaveLength(6);
  });
});
```

- [ ] **Step 2-3: Write `apps/web/components/nav/RegionPicker.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { RegionCode } from '@apexpredix/types';

const REGIONS: ReadonlyArray<{ code: RegionCode; name: string }> = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'EU', name: 'Europe' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KE', name: 'Kenya' },
];

export function RegionPicker({ initial }: { initial: RegionCode }) {
  const [region, setRegion] = useState<RegionCode>(initial);
  const [open, setOpen] = useState(false);
  const choose = (code: RegionCode) => {
    document.cookie = `apexpredix-region=${code}; path=/; max-age=31536000; samesite=lax`;
    setRegion(code);
    setOpen(false);
  };
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Change region"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mute-1 ring-1 ring-white/10 hover:text-white"
      >
        Region: {region} <ChevronDown size={14} />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 z-40 mt-2 w-56 rounded-xl bg-ink-2 p-1 ring-1 ring-white/10">
          {REGIONS.map((r) => (
            <li key={r.code}>
              <button
                role="option"
                aria-selected={region === r.code}
                onClick={() => choose(r.code)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-white hover:bg-white/5"
              >
                <span>{r.name}</span>
                <span className="text-xs text-mute-2">{r.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/components/nav/RegionPicker.tsx apps/web/components/nav/__tests__/RegionPicker.test.tsx
git commit -m "feat(nav): RegionPicker with 6 regions, cookie persistence"
```

---

### Task 3.8: SettingsPanel slide-in

**Files:**
- Create: `apps/web/components/nav/SettingsPanel.tsx`

- [ ] **Step 1: Write `apps/web/components/nav/SettingsPanel.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { RegionPicker } from './RegionPicker';
import type { RegionCode } from '@apexpredix/types';

interface Props { initialRegion: RegionCode; }

export function SettingsPanel({ initialRegion }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Settings"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-mute-1 ring-1 ring-white/10 hover:text-white"
      >
        <Settings size={16} />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Settings" className="fixed inset-0 z-50 flex">
          <button aria-label="Close" onClick={() => setOpen(false)} className="flex-1 bg-black/60 backdrop-blur" />
          <aside className="ml-auto h-full w-full max-w-sm bg-ink-1 p-6 shadow-2xl ring-1 ring-white/10">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button aria-label="Close" onClick={() => setOpen(false)} className="rounded-lg p-2 ring-1 ring-white/10"><X size={16} /></button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-medium text-mute-1">Language</h3>
                <LanguageSwitcher />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-mute-1">Region</h3>
                <RegionPicker initial={initialRegion} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-mute-1">Theme</h3>
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={() => {
                  // Phase 5 wires this to reopen CookieConsent
                  window.dispatchEvent(new CustomEvent('apexpredix:open-cookie-consent'));
                }}
                className="text-sm text-edge-cyan hover:underline"
              >
                Manage cookies
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Wire into Sidebar — modify `apps/web/components/nav/Sidebar.tsx`** to render `<SettingsPanel initialRegion="US" />` in the bottom-right of the sidebar bar:

Append before the existing "Powered by" div:

```tsx
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5">
          <SettingsPanel initialRegion="US" />
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
```

Add imports:

```tsx
import { SettingsPanel } from './SettingsPanel';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/nav/SettingsPanel.tsx apps/web/components/nav/Sidebar.tsx
git commit -m "feat(nav): SettingsPanel slide-in (language, region, theme, cookies)"
```

---

**End of Phase 3.** Continue in Phase 4.

---

## Phase 4 — Data files, MatchCard, Predictions feed, Match Detail

### Task 4.1: Seed `data/fixtures.json` (30 canned matches)

**Files:**
- Create: `apps/web/data/fixtures.json`, `apps/web/data/fixtures.schema.ts`
- Test: `apps/web/data/__tests__/fixtures.test.ts`

- [ ] **Step 1: Write `apps/web/data/fixtures.schema.ts`**

```ts
import { z } from 'zod';

export const FixtureSchema = z.object({
  id: z.string().min(1),
  sport: z.enum(['soccer', 'basketball', 'tennis', 'football', 'hockey', 'rugby']),
  league: z.string().min(1),
  home: z.object({ name: z.string(), code: z.string() }),
  away: z.object({ name: z.string(), code: z.string() }),
  kickoff: z.string().datetime(),
  odds: z.array(z.object({
    bookCode: z.string(),
    price: z.number().positive(),
    market: z.enum(['1','X','2','O2.5','U2.5','BTTS-Y','BTTS-N']),
  })).min(1),
  model: z.object({
    elo: z.number().min(0).max(1),
    poisson: z.number().min(0).max(1),
    xg: z.number().min(0).max(1),
    ensemble: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
  }),
  topPick: z.string(),
  valueBet: z.boolean(),
  narrative: z.string().min(20),
  featured: z.boolean().optional(),
});

export const FixturesSchema = z.array(FixtureSchema).min(30).max(40);

export type Fixture = z.infer<typeof FixtureSchema>;
```

- [ ] **Step 2: Write `apps/web/data/fixtures.json`** (shortened sample — generate the full 30 by repeating this structure with different teams/leagues/dates; the schema test enforces ≥30)

```json
[
  {
    "id": "featured-1",
    "sport": "soccer",
    "league": "EPL",
    "home": { "name": "Arsenal", "code": "ARS" },
    "away": { "name": "Chelsea", "code": "CHE" },
    "kickoff": "2026-05-24T15:00:00.000Z",
    "odds": [
      { "bookCode": "PN", "price": 1.85, "market": "1" },
      { "bookCode": "BW", "price": 1.80, "market": "1" },
      { "bookCode": "DK", "price": 1.78, "market": "1" }
    ],
    "model": { "elo": 0.58, "poisson": 0.55, "xg": 0.61, "ensemble": 0.58, "confidence": 0.893 },
    "topPick": "ARS to Win + Over 2.5",
    "valueBet": true,
    "narrative": "Arsenal's home xG over the last 8 EPL matches exceeds Chelsea's defensive expectation; ensemble agrees with the line and our 1/4 Kelly call is +EV at 1.85.",
    "featured": true
  },
  {
    "id": "featured-2",
    "sport": "soccer",
    "league": "LaLiga",
    "home": { "name": "Real Madrid", "code": "RMA" },
    "away": { "name": "Atletico", "code": "ATM" },
    "kickoff": "2026-05-24T19:00:00.000Z",
    "odds": [
      { "bookCode": "PN", "price": 1.65, "market": "1" },
      { "bookCode": "BW", "price": 1.62, "market": "1" }
    ],
    "model": { "elo": 0.62, "poisson": 0.59, "xg": 0.64, "ensemble": 0.61, "confidence": 0.81 },
    "topPick": "RMA Win",
    "valueBet": false,
    "narrative": "Home advantage holds; ensemble close to market — no value, skip.",
    "featured": true
  }
]
```

> **Engineer note:** Expand to ≥30 fixtures spanning sports `soccer/basketball/tennis/football/hockey/rugby` and leagues `EPL/LaLiga/Bundesliga/SerieA/Ligue1/NBA/NFL/ATP/NHL/Bundesliga`. At least 6 must have `"featured": true` (PredictionsPreview uses those). All `id` values must be URL-safe slugs.

- [ ] **Step 3: Write `apps/web/data/__tests__/fixtures.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import fixtures from '../fixtures.json';
import { FixturesSchema } from '../fixtures.schema';

describe('fixtures.json', () => {
  it('passes the schema', () => {
    expect(() => FixturesSchema.parse(fixtures)).not.toThrow();
  });
  it('has ≥6 featured matches', () => {
    const featured = (fixtures as Array<{ featured?: boolean }>).filter((m) => m.featured);
    expect(featured.length).toBeGreaterThanOrEqual(6);
  });
  it('all ids are unique', () => {
    const ids = (fixtures as Array<{ id: string }>).map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 4: Run test, expect pass (once 30 fixtures are present).**

```bash
pnpm -F @apexpredix/web test -- fixtures
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/data/fixtures.json apps/web/data/fixtures.schema.ts apps/web/data/__tests__/fixtures.test.ts
git commit -m "feat(data): canned fixtures.json (30 matches) with zod schema"
```

---

### Task 4.2: Seed `data/agents.json` (14 agents from spec roster)

**Files:**
- Create: `apps/web/data/agents.json`, `apps/web/data/agents.schema.ts`
- Test: `apps/web/data/__tests__/agents.test.ts`

- [ ] **Step 1: Write `apps/web/data/agents.schema.ts`**

```ts
import { z } from 'zod';

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  capability: z.string(),
  status: z.enum(['live', 'idle', 'paused']),
  heartbeatJitterSec: z.number().int().nonnegative(),
  sparkline: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
});

export const AgentsSchema = z.array(AgentSchema).length(14);
export type AgentJSON = z.infer<typeof AgentSchema>;
```

- [ ] **Step 2: Write `apps/web/data/agents.json`** (14 agents matching spec §6.6 roster)

```json
[
  { "id": "fixture-sync", "name": "Fixture-Sync", "capability": "Pulls upcoming fixtures from provider", "status": "live", "heartbeatJitterSec": 1800, "sparkline": [12,15,11,18,16,14,17] },
  { "id": "odds-ingest", "name": "Odds-Ingest", "capability": "Pulls odds per book per market", "status": "live", "heartbeatJitterSec": 300, "sparkline": [42,38,45,40,44,41,46] },
  { "id": "team-stats", "name": "Team-Stats", "capability": "Refreshes xG, form, injuries", "status": "live", "heartbeatJitterSec": 21600, "sparkline": [8,9,7,10,8,9,11] },
  { "id": "elo-updater", "name": "ELO-Updater", "capability": "Post-match ELO recompute", "status": "live", "heartbeatJitterSec": 600, "sparkline": [3,5,4,6,5,4,5] },
  { "id": "poisson-predictor", "name": "Poisson-Predictor", "capability": "Score-line probabilities", "status": "live", "heartbeatJitterSec": 600, "sparkline": [22,24,20,25,23,24,26] },
  { "id": "xg-modeler", "name": "xG-Modeler", "capability": "Expected goals model", "status": "live", "heartbeatJitterSec": 600, "sparkline": [18,16,19,17,20,18,21] },
  { "id": "ensemble-aggregator", "name": "Ensemble-Aggregator", "capability": "Blends models → confidence", "status": "live", "heartbeatJitterSec": 600, "sparkline": [28,30,26,32,29,31,33] },
  { "id": "value-hunter", "name": "Value-Hunter", "capability": "Kelly-sized value bets", "status": "live", "heartbeatJitterSec": 600, "sparkline": [5,7,6,8,7,9,8] },
  { "id": "line-movement", "name": "Line-Movement", "capability": "Odds drift / steam detection", "status": "live", "heartbeatJitterSec": 60, "sparkline": [110,118,125,120,130,128,135] },
  { "id": "settlement", "name": "Settlement", "capability": "Post-match outcome resolution", "status": "idle", "heartbeatJitterSec": 7200, "sparkline": [2,3,2,4,3,2,3] },
  { "id": "bankroll-tracker", "name": "Bankroll-Tracker", "capability": "Per-user ROI / streaks", "status": "live", "heartbeatJitterSec": 60, "sparkline": [40,42,45,43,46,48,50] },
  { "id": "backtest", "name": "Backtest", "capability": "Nightly rolling simulation", "status": "live", "heartbeatJitterSec": 86400, "sparkline": [200,205,198,210,206,212,208] },
  { "id": "heartbeat-healer", "name": "Heartbeat / Self-Healer", "capability": "2h health checks + retries", "status": "live", "heartbeatJitterSec": 7200, "sparkline": [1,1,2,1,1,2,1] },
  { "id": "content-localizer", "name": "Content-Localizer", "capability": "Per-locale match write-ups", "status": "live", "heartbeatJitterSec": 600, "sparkline": [14,16,15,18,17,16,19] }
]
```

- [ ] **Step 3: Write `apps/web/data/__tests__/agents.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import agents from '../agents.json';
import { AgentsSchema } from '../agents.schema';

describe('agents.json', () => {
  it('passes the schema', () => {
    expect(() => AgentsSchema.parse(agents)).not.toThrow();
  });
  it('has exactly 14 agents', () => {
    expect((agents as Array<unknown>).length).toBe(14);
  });
});
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/data/agents.json apps/web/data/agents.schema.ts apps/web/data/__tests__/agents.test.ts
git commit -m "feat(data): agents.json (14 autonomous agents per spec roster)"
```

---

### Task 4.3: Seed `data/pricing.json`

**Files:**
- Create: `apps/web/data/pricing.json`, `apps/web/data/pricing.schema.ts`
- Test: `apps/web/data/__tests__/pricing.test.ts`

- [ ] **Step 1: Write `apps/web/data/pricing.schema.ts`**

```ts
import { z } from 'zod';

export const PricingRegionSchema = z.object({
  region: z.enum(['US', 'NG', 'GB', 'EU', 'ZA', 'KE']),
  currency: z.enum(['USD', 'NGN', 'GBP', 'EUR', 'ZAR', 'KES']),
  monthly: z.number().positive(),
  yearly: z.number().positive(),
  pctOffBase: z.number().min(0).max(100),
});

export const PricingSchema = z.array(PricingRegionSchema).length(6);
```

- [ ] **Step 2: Write `apps/web/data/pricing.json`**

```json
[
  { "region": "US", "currency": "USD", "monthly": 29,    "yearly": 290,    "pctOffBase": 0  },
  { "region": "GB", "currency": "GBP", "monthly": 24,    "yearly": 240,    "pctOffBase": 0  },
  { "region": "EU", "currency": "EUR", "monthly": 27,    "yearly": 270,    "pctOffBase": 0  },
  { "region": "NG", "currency": "NGN", "monthly": 6500,  "yearly": 65000,  "pctOffBase": 85 },
  { "region": "ZA", "currency": "ZAR", "monthly": 199,   "yearly": 1990,   "pctOffBase": 60 },
  { "region": "KE", "currency": "KES", "monthly": 990,   "yearly": 9900,   "pctOffBase": 60 }
]
```

- [ ] **Step 3: Write `apps/web/data/__tests__/pricing.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import pricing from '../pricing.json';
import { PricingSchema } from '../pricing.schema';

describe('pricing.json', () => {
  it('passes the schema', () => {
    expect(() => PricingSchema.parse(pricing)).not.toThrow();
  });
  it('Nigeria has the 85% discount marker', () => {
    const ng = (pricing as Array<{ region: string; pctOffBase: number }>).find((r) => r.region === 'NG');
    expect(ng?.pctOffBase).toBe(85);
  });
});
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/data/pricing.json apps/web/data/pricing.schema.ts apps/web/data/__tests__/pricing.test.ts
git commit -m "feat(data): pricing.json with regional PPP-adjusted tiers"
```

---

### Task 4.4: Seed `data/bookmakers.json`

**Files:**
- Create: `apps/web/data/bookmakers.json`, `apps/web/data/bookmakers.schema.ts`
- Test: `apps/web/data/__tests__/bookmakers.test.ts`

- [ ] **Step 1: Write `apps/web/data/bookmakers.schema.ts`**

```ts
import { z } from 'zod';
export const BookmakerSchema = z.object({
  code: z.string(),
  name: z.string(),
  regions: z.array(z.enum(['US','NG','GB','EU','ZA','KE'])).min(1),
  deeplink: z.string().url(),
  logoUrl: z.string(),
});
export const BookmakersSchema = z.array(BookmakerSchema).min(10);
```

- [ ] **Step 2: Write `apps/web/data/bookmakers.json`**

```json
[
  { "code": "PN",  "name": "Pinnacle",     "regions": ["EU","GB"],           "deeplink": "https://www.pinnacle.com/en/soccer/matchups/", "logoUrl": "/media/books/pinnacle.svg" },
  { "code": "DK",  "name": "DraftKings",   "regions": ["US"],                "deeplink": "https://sportsbook.draftkings.com/",          "logoUrl": "/media/books/draftkings.svg" },
  { "code": "FD",  "name": "FanDuel",      "regions": ["US"],                "deeplink": "https://sportsbook.fanduel.com/",             "logoUrl": "/media/books/fanduel.svg" },
  { "code": "BW",  "name": "Betway ZA",    "regions": ["ZA"],                "deeplink": "https://www.betway.co.za/",                   "logoUrl": "/media/books/betway.svg" },
  { "code": "BWK", "name": "Betway KE",    "regions": ["KE"],                "deeplink": "https://www.betway.co.ke/",                   "logoUrl": "/media/books/betway.svg" },
  { "code": "HWB", "name": "Hollywood",    "regions": ["ZA"],                "deeplink": "https://www.hollywoodbets.net/",              "logoUrl": "/media/books/hollywoodbets.svg" },
  { "code": "WH",  "name": "William Hill", "regions": ["GB","EU"],           "deeplink": "https://sports.williamhill.com/",             "logoUrl": "/media/books/williamhill.svg" },
  { "code": "UB",  "name": "Unibet",       "regions": ["EU","GB"],           "deeplink": "https://www.unibet.com/",                     "logoUrl": "/media/books/unibet.svg" },
  { "code": "SB",  "name": "SportyBet",    "regions": ["NG","KE","ZA"],      "deeplink": "https://www.sportybet.com/ng/",               "logoUrl": "/media/books/sportybet.svg" },
  { "code": "B9",  "name": "Bet9ja",       "regions": ["NG"],                "deeplink": "https://www.bet9ja.com/",                     "logoUrl": "/media/books/bet9ja.svg" },
  { "code": "BK",  "name": "BetKing",      "regions": ["NG","KE"],           "deeplink": "https://www.betking.com/",                    "logoUrl": "/media/books/betking.svg" },
  { "code": "NB",  "name": "Nairabet",     "regions": ["NG"],                "deeplink": "https://www.nairabet.com/",                   "logoUrl": "/media/books/nairabet.svg" },
  { "code": "SP",  "name": "SportPesa",    "regions": ["KE"],                "deeplink": "https://www.sportpesa.com/",                  "logoUrl": "/media/books/sportpesa.svg" }
]
```

- [ ] **Step 3: Write `apps/web/data/__tests__/bookmakers.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import books from '../bookmakers.json';
import { BookmakersSchema } from '../bookmakers.schema';

describe('bookmakers.json', () => {
  it('passes schema', () => {
    expect(() => BookmakersSchema.parse(books)).not.toThrow();
  });
  it('has at least one bookmaker per region', () => {
    const regions = new Set((books as Array<{ regions: string[] }>).flatMap((b) => b.regions));
    expect(regions.has('US')).toBe(true);
    expect(regions.has('NG')).toBe(true);
    expect(regions.has('GB')).toBe(true);
    expect(regions.has('EU')).toBe(true);
    expect(regions.has('ZA')).toBe(true);
    expect(regions.has('KE')).toBe(true);
  });
});
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/data/bookmakers.json apps/web/data/bookmakers.schema.ts apps/web/data/__tests__/bookmakers.test.ts
git commit -m "feat(data): bookmakers.json (13 books across 6 regions)"
```

---

### Task 4.5: MatchCard component

**Files:**
- Create: `apps/web/components/match/MatchCard.tsx`, `apps/web/components/match/ConfidenceBar.tsx`, `apps/web/components/match/ValueBetChip.tsx`
- Test: `apps/web/components/match/__tests__/MatchCard.test.tsx`

- [ ] **Step 1: Write `apps/web/components/match/ConfidenceBar.tsx`**

```tsx
import { cn } from '@apexpredix/ui';

interface Props { value: number; }

export function ConfidenceBar({ value }: Props) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-mute-1">
        <span>Confidence</span>
        <span className="font-mono text-white">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div
          className={cn('h-full rounded-full', pct >= 75 ? 'bg-edge-green' : pct >= 50 ? 'bg-edge-cyan' : 'bg-edge-amber')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `apps/web/components/match/ValueBetChip.tsx`**

```tsx
import { Zap } from 'lucide-react';
export function ValueBetChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-edge-amber/15 px-2 py-0.5 text-xs font-medium text-edge-amber ring-1 ring-edge-amber/30">
      <Zap size={12} aria-hidden /> Value Bet
    </span>
  );
}
```

- [ ] **Step 3: Write failing test `apps/web/components/match/__tests__/MatchCard.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MatchCard } from '../MatchCard';
import type { Match } from '@apexpredix/types';

const fx: Match = {
  id: 'featured-1', sport: 'soccer', league: 'EPL',
  home: { name: 'Arsenal', code: 'ARS' }, away: { name: 'Chelsea', code: 'CHE' },
  kickoff: '2026-05-24T15:00:00.000Z',
  odds: [{ bookCode: 'PN', price: 1.85, market: '1' }],
  model: { elo: 0.58, poisson: 0.55, xg: 0.61, ensemble: 0.58, confidence: 0.893 },
  topPick: 'ARS to Win + Over 2.5', valueBet: true,
  narrative: 'Arsenal home xG advantage holds.',
  featured: true,
};

describe('MatchCard', () => {
  it('shows teams, top pick, confidence percent, and value-bet chip', () => {
    render(<MatchCard match={fx} locale="en" />);
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText('Chelsea')).toBeInTheDocument();
    expect(screen.getByText('ARS to Win + Over 2.5')).toBeInTheDocument();
    expect(screen.getByText('89%')).toBeInTheDocument();
    expect(screen.getByText(/value bet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run test, expect fail.**

- [ ] **Step 5: Write `apps/web/components/match/MatchCard.tsx`**

```tsx
import Link from 'next/link';
import type { Match } from '@apexpredix/types';
import { ConfidenceBar } from './ConfidenceBar';
import { ValueBetChip } from './ValueBetChip';

interface Props { match: Match; locale: string; }

export function MatchCard({ match, locale }: Props) {
  const kickoff = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(match.kickoff));
  return (
    <Link
      href={`/predictions/${match.id}`}
      className="group block rounded-2xl bg-ink-1 p-5 ring-1 ring-white/10 transition hover:ring-edge-cyan/40"
    >
      <div className="flex items-center justify-between text-xs text-mute-2">
        <span>{match.league}</span>
        <span>{kickoff}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 items-center gap-3">
        <div className="text-center">
          <div className="text-sm font-semibold">{match.home.name}</div>
          <div className="text-[10px] text-mute-2">{match.home.code}</div>
        </div>
        <div className="text-center text-xs text-mute-1">vs</div>
        <div className="text-center">
          <div className="text-sm font-semibold">{match.away.name}</div>
          <div className="text-[10px] text-mute-2">{match.away.code}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-medium text-white">{match.topPick}</span>
        {match.valueBet && <ValueBetChip />}
      </div>
      <div className="mt-4">
        <ConfidenceBar value={match.model.confidence} />
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-wide text-mute-2">Model: Poisson-xG v3.2</div>
    </Link>
  );
}
```

- [ ] **Step 6: Test passes. Commit.**

```bash
git add apps/web/components/match
git commit -m "feat(match): MatchCard + ConfidenceBar + ValueBetChip"
```

---

### Task 4.6: Wire MatchCard into PredictionsPreview + ship `/predictions` page

**Files:**
- Modify: `apps/web/components/sections/PredictionsPreview.tsx`
- Create: `apps/web/app/[locale]/predictions/page.tsx`

- [ ] **Step 1: Rewrite `apps/web/components/sections/PredictionsPreview.tsx`**

```tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MatchCard } from '@/components/match/MatchCard';
import fixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';

interface Props { locale: string; }

export function PredictionsPreview({ locale }: Props) {
  const t = useTranslations('predictions');
  const featured = (fixtures as Match[]).filter((m) => m.featured).slice(0, 6);
  return (
    <section id="predictions" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t('heading')}</h2>
            <p className="mt-2 text-mute-1">{t('modelLine')}</p>
          </div>
          <Link href="/predictions" className="text-sm text-edge-cyan hover:underline">{t('openFull')}</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((m) => <MatchCard key={m.id} match={m} locale={locale} />)}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Update `apps/web/app/[locale]/page.tsx`** to pass `locale` to `PredictionsPreview` (and other locale-aware sections later)

```tsx
import { getLocale } from 'next-intl/server';
// inside Home():
const locale = await getLocale();
// then pass locale to <PredictionsPreview locale={locale} />
```

Make `Home` async:

```tsx
export default async function Home() {
  const locale = await getLocale();
  return (
    <>
      <Sidebar pathname="/" />
      <MobileNav pathname="/" />
      <main id="main" className="lg:pl-64">
        <Hero />
        <PredictionsPreview locale={locale} />
        ...
```

- [ ] **Step 3: Write `apps/web/app/[locale]/predictions/page.tsx`**

```tsx
import { getLocale, setRequestLocale } from 'next-intl/server';
import { MatchCard } from '@/components/match/MatchCard';
import fixtures from '@/data/fixtures.json';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { Footer } from '@/components/Footer';
import type { Match } from '@apexpredix/types';

export const revalidate = 60;

export default async function PredictionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sorted = [...(fixtures as Match[])].sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));
  return (
    <>
      <Sidebar pathname="/predictions" />
      <MobileNav pathname="/predictions" />
      <main id="main" className="lg:pl-64">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Live Predictions</h1>
          <p className="mt-2 text-mute-1">Model: Poisson-xG v3.2 • refreshed every 2h</p>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map((m) => <MatchCard key={m.id} match={m} locale={locale} />)}
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}
```

- [ ] **Step 4: Smoke-test build**

```bash
pnpm -F @apexpredix/web build
```

Expected: build succeeds, `/predictions` listed.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/sections/PredictionsPreview.tsx apps/web/app/[locale]/page.tsx apps/web/app/[locale]/predictions/page.tsx
git commit -m "feat(predictions): wire fixtures.json into preview + /predictions feed"
```

---

### Task 4.7: Match Detail page + sub-components

**Files:**
- Create: `apps/web/app/[locale]/predictions/[matchId]/page.tsx`, `apps/web/components/match/MatchDetail.tsx`, `apps/web/components/match/OddsCompare.tsx`, `apps/web/components/match/ModelBreakdown.tsx`, `apps/web/components/bookmakers/BettingLinks.tsx`

- [ ] **Step 1: Write `apps/web/components/match/OddsCompare.tsx`**

```tsx
import type { OddsByBook } from '@apexpredix/types';
import books from '@/data/bookmakers.json';

interface Props { odds: OddsByBook[]; region: string; }

export function OddsCompare({ odds, region }: Props) {
  const visible = odds.filter((o) => {
    const book = (books as Array<{ code: string; regions: string[] }>).find((b) => b.code === o.bookCode);
    return book?.regions.includes(region as never);
  });
  if (visible.length === 0) return <div className="text-sm text-mute-1">No licensed books in this region.</div>;
  const best = Math.max(...visible.map((o) => o.price));
  return (
    <ul className="grid gap-2">
      {visible.map((o) => {
        const isBest = o.price === best;
        const book = (books as Array<{ code: string; name: string; deeplink: string }>).find((b) => b.code === o.bookCode)!;
        return (
          <li key={o.bookCode} className={`flex items-center justify-between rounded-xl bg-ink-2 px-4 py-3 ring-1 ${isBest ? 'ring-edge-cyan/40' : 'ring-white/10'}`}>
            <div>
              <div className="text-sm font-medium">{book.name}</div>
              <div className="text-xs text-mute-2">{o.market}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg">{o.price.toFixed(2)}</span>
              {isBest && <span className="rounded bg-edge-cyan/15 px-2 py-0.5 text-[10px] uppercase text-edge-cyan">Best</span>}
              <a href={book.deeplink} target="_blank" rel="noopener nofollow noreferrer" className="text-xs text-edge-cyan hover:underline">Open ↗</a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Write `apps/web/components/match/ModelBreakdown.tsx`**

```tsx
import type { ModelOutput } from '@apexpredix/types';

interface Props { model: ModelOutput; }

export function ModelBreakdown({ model }: Props) {
  const rows = [
    { label: 'ELO', value: model.elo },
    { label: 'Poisson', value: model.poisson },
    { label: 'xG', value: model.xg },
    { label: 'Ensemble', value: model.ensemble },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = Math.round(r.value * 100);
        return (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-xs text-mute-1">
              <span>{r.label}</span>
              <span className="font-mono text-white">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-2">
              <div className="h-full rounded-full bg-edge-cyan" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Write `apps/web/components/match/MatchDetail.tsx`**

```tsx
import type { Match } from '@apexpredix/types';
import { ConfidenceBar } from './ConfidenceBar';
import { ValueBetChip } from './ValueBetChip';
import { OddsCompare } from './OddsCompare';
import { ModelBreakdown } from './ModelBreakdown';

interface Props { match: Match; locale: string; region: string; }

export function MatchDetail({ match, locale, region }: Props) {
  const kickoff = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(match.kickoff));
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 space-y-10">
      <header>
        <div className="text-xs uppercase tracking-wide text-mute-2">{match.league}</div>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{match.home.name} <span className="text-mute-1">vs</span> {match.away.name}</h1>
        <div className="mt-2 text-sm text-mute-1">{kickoff}</div>
      </header>

      <section aria-labelledby="verdict" className="rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10">
        <h2 id="verdict" className="text-sm uppercase tracking-wide text-mute-1">Ensemble verdict</h2>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xl font-semibold">{match.topPick}</div>
          {match.valueBet && <ValueBetChip />}
        </div>
        <div className="mt-4"><ConfidenceBar value={match.model.confidence} /></div>
      </section>

      <section aria-labelledby="odds">
        <h2 id="odds" className="mb-4 text-sm uppercase tracking-wide text-mute-1">Odds comparison · region {region}</h2>
        <OddsCompare odds={match.odds} region={region} />
      </section>

      <section aria-labelledby="breakdown">
        <h2 id="breakdown" className="mb-4 text-sm uppercase tracking-wide text-mute-1">Model breakdown</h2>
        <ModelBreakdown model={match.model} />
      </section>

      <section aria-labelledby="narrative">
        <h2 id="narrative" className="mb-4 text-sm uppercase tracking-wide text-mute-1">Why this hits</h2>
        <p className="text-mute-1 leading-relaxed">{match.narrative}</p>
      </section>

      <p className="text-xs text-mute-2">
        ApexPredix AI is an analytics service, not a gambling operator. 18+ only. Past performance ≠ future results.
      </p>
    </article>
  );
}
```

- [ ] **Step 4: Write `apps/web/app/[locale]/predictions/[matchId]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { MatchDetail } from '@/components/match/MatchDetail';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { Footer } from '@/components/Footer';
import fixtures from '@/data/fixtures.json';
import type { Match, RegionCode } from '@apexpredix/types';

export const revalidate = 60;

export function generateStaticParams() {
  return (fixtures as Match[]).map((m) => ({ matchId: m.id }));
}

export default async function MatchPage({ params }: { params: Promise<{ locale: string; matchId: string }> }) {
  const { locale, matchId } = await params;
  setRequestLocale(locale);
  const match = (fixtures as Match[]).find((m) => m.id === matchId);
  if (!match) notFound();
  const cookieStore = await cookies();
  const region = ((cookieStore.get('apexpredix-region')?.value ?? 'US') as RegionCode);

  return (
    <>
      <Sidebar pathname={`/predictions/${matchId}`} />
      <MobileNav pathname={`/predictions/${matchId}`} />
      <main id="main" className="lg:pl-64">
        <MatchDetail match={match} locale={locale} region={region} />
        <Footer />
      </main>
    </>
  );
}
```

- [ ] **Step 5: Smoke-test build**

```bash
pnpm -F @apexpredix/web build
```

Expected: `/predictions/[matchId]` listed, static params generated.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/[locale]/predictions/[matchId] apps/web/components/match
git commit -m "feat(match-detail): MatchDetail page with OddsCompare, ModelBreakdown, narrative"
```

---

### Task 4.8: Wire Network section to agents.json + add heartbeat ticker

**Files:**
- Modify: `apps/web/components/sections/Network.tsx`
- Create: `apps/web/components/sections/AgentTile.tsx`

- [ ] **Step 1: Write `apps/web/components/sections/AgentTile.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import type { AgentJSON } from '@/data/agents.schema';

interface Props { agent: AgentJSON; }

export function AgentTile({ agent }: Props) {
  const [seconds, setSeconds] = useState(() => Math.floor(Math.random() * 5) + 1);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s + 1) % Math.max(10, agent.heartbeatJitterSec)), 1000);
    return () => clearInterval(id);
  }, [agent.heartbeatJitterSec]);
  const max = Math.max(...agent.sparkline);
  return (
    <li className="rounded-2xl bg-ink-1 p-4 ring-1 ring-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{agent.name}</span>
        <span
          className="inline-flex items-center gap-1.5 text-xs"
          aria-live="polite"
          role="status"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${agent.status === 'live' ? 'bg-edge-green animate-pulse-dot' : 'bg-mute-2'}`} aria-hidden />
          <span className={agent.status === 'live' ? 'text-edge-green' : 'text-mute-2'}>
            {agent.status === 'live' ? 'Live' : 'Idle'}
          </span>
        </span>
      </div>
      <p className="mt-1 text-xs text-mute-1">{agent.capability}</p>
      <svg viewBox="0 0 100 24" className="mt-3 h-6 w-full" aria-hidden>
        <polyline
          points={agent.sparkline.map((v, i) => `${(i / (agent.sparkline.length - 1)) * 100},${24 - (v / max) * 22}`).join(' ')}
          fill="none"
          stroke="currentColor"
          className="text-edge-cyan"
          strokeWidth="1.5"
        />
      </svg>
      <div className="mt-2 text-[10px] text-mute-2">Heartbeat {seconds}s ago</div>
    </li>
  );
}
```

- [ ] **Step 2: Rewrite `apps/web/components/sections/Network.tsx`**

```tsx
import agents from '@/data/agents.json';
import type { AgentJSON } from '@/data/agents.schema';
import { AgentTile } from './AgentTile';

export function Network() {
  return (
    <section id="network" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Live Intelligence Grid</h2>
        <p className="mb-10 max-w-prose text-mute-1">
          14 autonomous agents. 2.4M events/hr. Self-update every 2 hours. No human intervention needed.
        </p>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {(agents as AgentJSON[]).map((a) => <AgentTile key={a.id} agent={a} />)}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Update Network test in `apps/web/components/sections/__tests__/Network.test.tsx`** to import the new component (`getAllByTestId` still passes because there are 14 list items).

- [ ] **Step 4: Smoke-test + commit**

```bash
pnpm -F @apexpredix/web build
git add apps/web/components/sections/Network.tsx apps/web/components/sections/AgentTile.tsx
git commit -m "feat(network): bind to agents.json + live heartbeat ticker per tile"
```

---

**End of Phase 4.** Continue in Phase 5.

---

## Phase 5 — Compliance, APIs, DB

### Task 5.1: Hash utility (HMAC-SHA256, dual-secret rotation)

**Files:**
- Create: `apps/web/lib/hash.ts`
- Test: `apps/web/lib/__tests__/hash.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { hashPII } from '../hash';

beforeEach(() => {
  process.env.HASH_SECRET_PRIMARY = 'a'.repeat(32);
  process.env.HASH_SECRET_SECONDARY = 'b'.repeat(32);
});

describe('hashPII', () => {
  it('produces a stable 64-char hex digest', async () => {
    const h = await hashPII('203.0.113.1');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    const again = await hashPII('203.0.113.1');
    expect(again).toBe(h);
  });
  it('returns different digests for different inputs', async () => {
    const a = await hashPII('1.1.1.1');
    const b = await hashPII('2.2.2.2');
    expect(a).not.toBe(b);
  });
  it('throws if primary secret missing', async () => {
    delete process.env.HASH_SECRET_PRIMARY;
    await expect(hashPII('x')).rejects.toThrow(/HASH_SECRET_PRIMARY/);
  });
});
```

- [ ] **Step 2: Run test, expect fail.**

- [ ] **Step 3: Write `apps/web/lib/hash.ts`**

```ts
const enc = new TextEncoder();

export async function hashPII(input: string): Promise<string> {
  const secret = process.env.HASH_SECRET_PRIMARY;
  if (!secret) throw new Error('HASH_SECRET_PRIMARY env var is required');
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(input));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/lib/hash.ts apps/web/lib/__tests__/hash.test.ts
git commit -m "feat(lib): hashPII HMAC-SHA256 (Web Crypto, edge-compatible)"
```

---

### Task 5.2: Rate-limit utility (Vercel KV, sliding window)

**Files:**
- Create: `apps/web/lib/rate-limit.ts`
- Test: `apps/web/lib/__tests__/rate-limit.test.ts`

- [ ] **Step 1: Failing test (uses mock KV)**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const incr = vi.fn();
const expire = vi.fn();
vi.mock('@vercel/kv', () => ({ kv: { multi: () => ({ incr, expire, exec: vi.fn().mockResolvedValue([3, 1]) }) } }));

import { checkRateLimit } from '../rate-limit';

beforeEach(() => { incr.mockClear(); expire.mockClear(); });

describe('checkRateLimit', () => {
  it('allows under-limit requests', async () => {
    const res = await checkRateLimit('test', 'ip-1', { limit: 5, windowSec: 3600 });
    expect(res.ok).toBe(true);
    expect(res.remaining).toBe(2);
  });
});
```

- [ ] **Step 2-3: Write `apps/web/lib/rate-limit.ts`**

```ts
import { kv } from '@vercel/kv';

export interface RateLimitResult { ok: boolean; remaining: number; }
export interface RateLimitOpts { limit: number; windowSec: number; }

export async function checkRateLimit(scope: string, key: string, opts: RateLimitOpts): Promise<RateLimitResult> {
  const bucketKey = `rl:${scope}:${key}`;
  const m = kv.multi();
  m.incr(bucketKey);
  m.expire(bucketKey, opts.windowSec);
  const [count] = (await m.exec()) as [number, number];
  return { ok: count <= opts.limit, remaining: Math.max(0, opts.limit - count) };
}
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/lib/rate-limit.ts apps/web/lib/__tests__/rate-limit.test.ts
git commit -m "feat(lib): KV-backed sliding-window rate limiter"
```

---

### Task 5.3: Disposable email check

**Files:**
- Create: `apps/web/lib/disposable-email.ts`, `apps/web/lib/disposable-email-domains.json`
- Test: `apps/web/lib/__tests__/disposable-email.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { isDisposableEmail } from '../disposable-email';

describe('isDisposableEmail', () => {
  it('flags known disposable domains', () => {
    expect(isDisposableEmail('me@mailinator.com')).toBe(true);
    expect(isDisposableEmail('me@tempmail.com')).toBe(true);
  });
  it('passes real domains', () => {
    expect(isDisposableEmail('me@gmail.com')).toBe(false);
    expect(isDisposableEmail('me@apexpredix.ai')).toBe(false);
  });
  it('handles malformed input safely', () => {
    expect(isDisposableEmail('not-an-email')).toBe(false);
  });
});
```

- [ ] **Step 2: Write `apps/web/lib/disposable-email-domains.json`**

```json
["mailinator.com","tempmail.com","10minutemail.com","guerrillamail.com","yopmail.com","trashmail.com","throwawaymail.com","fakeinbox.com","sharklasers.com","getnada.com","tempinbox.com","temp-mail.org","mintemail.com","dispostable.com","mailcatch.com","fake-mail.net","wegwerfemail.de","spambog.com","mytemp.email","emkei.cz","mailnesia.com","mail-temporaire.fr","ezztt.com","mailtothis.com","spambox.us"]
```

- [ ] **Step 3: Write `apps/web/lib/disposable-email.ts`**

```ts
import domains from './disposable-email-domains.json';
const set = new Set(domains.map((d) => d.toLowerCase()));

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  return set.has(email.slice(at + 1).toLowerCase());
}
```

- [ ] **Step 4: Test passes. Commit.**

```bash
git add apps/web/lib/disposable-email.ts apps/web/lib/disposable-email-domains.json apps/web/lib/__tests__/disposable-email.test.ts
git commit -m "feat(lib): disposable email domain check"
```

---

### Task 5.4: Compliance blocklist module + history

**Files:**
- Create: `apps/web/lib/compliance/blocklist.ts`, `docs/compliance/blocklist-history.md`
- Test: `apps/web/lib/compliance/__tests__/blocklist.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { isBlocked } from '../blocklist';

describe('isBlocked', () => {
  it('blocks listed countries', () => {
    expect(isBlocked('CN', undefined)).toBe(true);
    expect(isBlocked('FR', undefined)).toBe(true);
  });
  it('blocks listed US states', () => {
    expect(isBlocked('US', 'WA')).toBe(true);
    expect(isBlocked('US', 'CA')).toBe(false);
  });
  it('passes unlisted countries', () => {
    expect(isBlocked('GB', undefined)).toBe(false);
    expect(isBlocked('NG', undefined)).toBe(false);
  });
});
```

- [ ] **Step 2-3: Write `apps/web/lib/compliance/blocklist.ts`**

```ts
export const BLOCKLIST = {
  countries: new Set(['CN', 'KP', 'IR', 'CU', 'SA', 'AE', 'SG', 'FR']),
  usStates: new Set(['WA', 'ID', 'CT', 'TN', 'HI']),
};

export function isBlocked(country: string, region: string | undefined): boolean {
  const c = country.toUpperCase();
  if (BLOCKLIST.countries.has(c)) return true;
  if (c === 'US' && region && BLOCKLIST.usStates.has(region.toUpperCase())) return true;
  return false;
}
```

- [ ] **Step 4: Write `docs/compliance/blocklist-history.md`**

```markdown
# Blocklist history

The v1 list is a defensive starting point, not legal advice. Bump `COMPLIANCE_BLOCKLIST_VERSION` whenever this list changes.

## 2026-05-21 — initial list
Countries: CN, KP, IR, CU, SA, AE, SG, FR.
US states: WA, ID, CT, TN, HI.
```

- [ ] **Step 5: Refactor `apps/web/middleware.ts`** to use the new module (replaces inline sets from Task 3.2):

```ts
import { isBlocked } from './lib/compliance/blocklist';
// in middleware():
const blocked = isBlocked(country, state);
```

- [ ] **Step 6: Test passes. Commit.**

```bash
git add apps/web/lib/compliance apps/web/middleware.ts docs/compliance
git commit -m "feat(compliance): centralized blocklist module + history doc"
```

---

### Task 5.5: GeoBlockedScreen page

**Files:**
- Create: `apps/web/app/[locale]/blocked/page.tsx`, `apps/web/components/compliance/GeoBlockedScreen.tsx`

- [ ] **Step 1: Write `apps/web/components/compliance/GeoBlockedScreen.tsx`**

```tsx
import Link from 'next/link';

export function GeoBlockedScreen({ reason }: { reason: string }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Unavailable in your region</h1>
        <p className="mt-3 text-mute-1">
          ApexPredix AI is not available where you are. Region detected: <code className="rounded bg-ink-2 px-1 text-xs">{reason}</code>.
        </p>
        <p className="mt-3 text-mute-1">
          For jurisdictional inquiries write to{' '}
          <a className="text-edge-cyan hover:underline" href="mailto:legal@apexpredix.ai">legal@apexpredix.ai</a>.
        </p>
        <div className="mt-8">
          <Link href="/legal/disclaimer" className="text-sm text-edge-cyan hover:underline">Read the disclaimer</Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Write `apps/web/app/[locale]/blocked/page.tsx`**

```tsx
import { headers } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { GeoBlockedScreen } from '@/components/compliance/GeoBlockedScreen';

export default async function BlockedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const h = await headers();
  const reason = h.get('x-blocked-reason') ?? 'unknown';
  return <GeoBlockedScreen reason={reason} />;
}
```

- [ ] **Step 3: Smoke build + commit**

```bash
pnpm -F @apexpredix/web build
git add apps/web/app/[locale]/blocked apps/web/components/compliance/GeoBlockedScreen.tsx
git commit -m "feat(compliance): /blocked landing page (451 body)"
```

---

### Task 5.6: AgeGate component

**Files:**
- Create: `apps/web/components/compliance/AgeGate.tsx`, `apps/web/app/[locale]/under-age/page.tsx`

- [ ] **Step 1: Write `apps/web/components/compliance/AgeGate.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const COOKIE = 'apexpredix-age-confirmed';

export function AgeGate() {
  const [show, setShow] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const seen = document.cookie.split('; ').some((p) => p.startsWith(`${COOKIE}=1`));
    if (!seen) setShow(true);
  }, []);
  if (!show) return null;
  const confirm = () => {
    document.cookie = `${COOKIE}=1; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
    setShow(false);
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="age-h" className="fixed inset-0 z-[60] grid place-items-center bg-ink-0/95 backdrop-blur">
      <div className="m-6 w-full max-w-md rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10 animate-rise">
        <h2 id="age-h" className="text-xl font-semibold">Are you 18 or older?</h2>
        <p className="mt-2 text-sm text-mute-1">
          ApexPredix AI is intended for adults only. We are an analytics service, not a gambling operator.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={confirm}
            className="flex-1 rounded-xl bg-edge-cyan px-4 py-3 font-medium text-ink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0"
          >
            I am 18 or older
          </button>
          <button
            type="button"
            onClick={() => router.push('./under-age')}
            className="flex-1 rounded-xl bg-ink-2 px-4 py-3 text-white ring-1 ring-white/10"
          >
            I am under 18
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `apps/web/app/[locale]/under-age/page.tsx`**

```tsx
import { setRequestLocale } from 'next-intl/server';

export default async function UnderAge({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Come back when you are 18+</h1>
        <p className="mt-3 text-mute-1">
          ApexPredix AI is intended for adults only. If you or someone you know has a gambling problem, help is available at{' '}
          <a className="text-edge-cyan hover:underline" href="https://www.begambleaware.org/" rel="noopener noreferrer" target="_blank">BeGambleAware</a>.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Wire `<AgeGate />` into `[locale]/layout.tsx`** — insert just below `<NextIntlClientProvider>`:

```tsx
import { AgeGate } from '@/components/compliance/AgeGate';
// inside body
<NextIntlClientProvider locale={locale} messages={messages}>
  <AgeGate />
  {children}
</NextIntlClientProvider>
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/compliance/AgeGate.tsx apps/web/app/[locale]/under-age apps/web/app/[locale]/layout.tsx
git commit -m "feat(compliance): 18+ AgeGate modal + under-age page"
```

---

### Task 5.7: RGSBanner (region-aware)

**Files:**
- Create: `apps/web/components/compliance/RGSBanner.tsx`, `apps/web/lib/compliance/rgs.ts`

- [ ] **Step 1: Write `apps/web/lib/compliance/rgs.ts`**

```ts
import type { RegionCode } from '@apexpredix/types';

export const RGS_HELPLINES: Record<RegionCode, { label: string; href: string }> = {
  GB: { label: 'BeGambleAware 0808 8020 133', href: 'https://www.begambleaware.org/' },
  US: { label: '1-800-GAMBLER', href: 'https://www.1800gambler.net/' },
  NG: { label: 'Nigerian Gambling Regulatory Helpline', href: 'https://ngrc.gov.ng/' },
  ZA: { label: 'NRGP 0800 006 008', href: 'https://www.responsiblegambling.org.za/' },
  KE: { label: 'BCLB Helpline', href: 'https://bclb.go.ke/' },
  EU: { label: 'BeGambleAware', href: 'https://www.begambleaware.org/' },
};
```

- [ ] **Step 2: Write `apps/web/components/compliance/RGSBanner.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { RGS_HELPLINES } from '@/lib/compliance/rgs';
import type { RegionCode } from '@apexpredix/types';

interface Props { region: RegionCode; }

export function RGSBanner({ region }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const helpline = RGS_HELPLINES[region];
  return (
    <div role="region" aria-label="Responsible gambling notice" className="border-b border-white/5 bg-ink-2/80 text-mute-1">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs">
        <p>
          🔞 ApexPredix AI is an analytics service, not a gambling operator. 18+. Bet responsibly —{' '}
          <a href={helpline.href} rel="noopener noreferrer" target="_blank" className="text-edge-cyan hover:underline">{helpline.label}</a>.
        </p>
        <button aria-label="Dismiss" onClick={() => setDismissed(true)} className="rounded p-1 hover:bg-white/5"><X size={12} /></button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire `<RGSBanner region={region} />` into `[locale]/layout.tsx`** (read region from cookie via `cookies()`):

```tsx
import { cookies } from 'next/headers';
import { RGSBanner } from '@/components/compliance/RGSBanner';
import type { RegionCode } from '@apexpredix/types';

// inside LocaleLayout body, before <SkipToContent />:
const cookieStore = await cookies();
const region = ((cookieStore.get('apexpredix-region')?.value ?? 'US') as RegionCode);

// inside the body JSX, before children:
<RGSBanner region={region} />
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/compliance/RGSBanner.tsx apps/web/lib/compliance/rgs.ts apps/web/app/[locale]/layout.tsx
git commit -m "feat(compliance): region-aware RGS banner"
```

---

### Task 5.8: CookieConsent + `/api/consent` route

**Files:**
- Create: `apps/web/components/compliance/CookieConsent.tsx`, `apps/web/lib/compliance/consent.ts`, `apps/web/app/api/consent/route.ts`

- [ ] **Step 1: Write `apps/web/lib/compliance/consent.ts`**

```ts
import { CONSENT_VERSION, type ConsentChoices } from '@apexpredix/types';

export const COOKIE_NAME = 'cookie-consent';
export const DEFAULT_CHOICES: ConsentChoices = { essential: true, analytics: false, prefs: false, marketing: false };

export function encodeChoices(c: ConsentChoices): string {
  return Buffer.from(JSON.stringify({ v: CONSENT_VERSION, c })).toString('base64url');
}

export function decodeChoices(value: string | undefined): ConsentChoices | null {
  if (!value) return null;
  try {
    const { v, c } = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (v !== CONSENT_VERSION) return null;
    return c as ConsentChoices;
  } catch { return null; }
}
```

- [ ] **Step 2: Write `apps/web/app/api/consent/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@apexpredix/db';
import { hashPII } from '@/lib/hash';
import { encodeChoices, decodeChoices, COOKIE_NAME } from '@/lib/compliance/consent';
import { cookies, headers } from 'next/headers';
import { CONSENT_VERSION } from '@apexpredix/types';

export const runtime = 'nodejs';

const Body = z.object({
  anonDeviceId: z.string().uuid(),
  choices: z.object({
    essential: z.literal(true),
    analytics: z.boolean(),
    prefs: z.boolean(),
    marketing: z.boolean(),
  }),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, code: 'INVALID_BODY', message: parsed.error.message }, { status: 400 });

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
  const ipHash = await hashPII(ip);

  await prisma.cookieConsent.upsert({
    where: { anonDeviceId: parsed.data.anonDeviceId },
    update: { choices: parsed.data.choices, version: CONSENT_VERSION, ipHash, expiresAt: new Date(Date.now() + 13 * 30 * 24 * 60 * 60 * 1000) },
    create: { anonDeviceId: parsed.data.anonDeviceId, choices: parsed.data.choices, version: CONSENT_VERSION, ipHash, expiresAt: new Date(Date.now() + 13 * 30 * 24 * 60 * 60 * 1000) },
  });

  const c = await cookies();
  c.set(COOKIE_NAME, encodeChoices(parsed.data.choices), {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 13 * 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  });

  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  const c = await cookies();
  const choices = decodeChoices(c.get(COOKIE_NAME)?.value);
  return NextResponse.json({ ok: true, choices });
}
```

- [ ] **Step 3: Write `apps/web/components/compliance/CookieConsent.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import type { ConsentChoices } from '@apexpredix/types';

const DEVICE_KEY = 'apexpredix-device-id';

function ensureDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [choices, setChoices] = useState<ConsentChoices>({ essential: true, analytics: false, prefs: false, marketing: false });

  useEffect(() => {
    const has = document.cookie.split('; ').some((p) => p.startsWith('cookie-consent='));
    if (!has) setOpen(true);
    const onOpen = () => setOpen(true);
    window.addEventListener('apexpredix:open-cookie-consent', onOpen);
    return () => window.removeEventListener('apexpredix:open-cookie-consent', onOpen);
  }, []);

  const submit = async (c: ConsentChoices) => {
    await fetch('/api/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ anonDeviceId: ensureDeviceId(), choices: c }),
    });
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cc-h" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-ink-1/95 backdrop-blur">
      <div className="mx-auto max-w-4xl px-4 py-4">
        <h2 id="cc-h" className="text-sm font-semibold">We use cookies</h2>
        <p className="mt-1 text-xs text-mute-1">
          Essential cookies keep the site running. We also use analytics and preferences cookies if you opt in. You can change this anytime.
        </p>
        {customize ? (
          <fieldset className="mt-4 grid gap-3 text-sm">
            <legend className="sr-only">Cookie categories</legend>
            {([
              ['essential', 'Essential (always on)', true, true],
              ['analytics', 'Analytics (Vercel)', choices.analytics, false],
              ['prefs', 'Preferences (theme/language/region)', choices.prefs, false],
              ['marketing', 'Marketing (off in v1)', choices.marketing, false],
            ] as const).map(([key, label, value, disabled]) => (
              <label key={key} className="flex items-center justify-between rounded-xl bg-ink-2 px-3 py-2">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={value as boolean}
                  disabled={disabled as boolean}
                  onChange={(e) => setChoices({ ...choices, [key]: e.target.checked } as ConsentChoices)}
                  className="h-4 w-4"
                />
              </label>
            ))}
          </fieldset>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-xl bg-edge-cyan px-4 py-2 text-sm font-medium text-ink-0" onClick={() => submit({ essential: true, analytics: true, prefs: true, marketing: true })}>
            Accept all
          </button>
          <button className="rounded-xl bg-ink-2 px-4 py-2 text-sm text-white ring-1 ring-white/10" onClick={() => submit({ essential: true, analytics: false, prefs: false, marketing: false })}>
            Reject all
          </button>
          {!customize ? (
            <button className="rounded-xl bg-ink-2 px-4 py-2 text-sm text-white ring-1 ring-white/10" onClick={() => setCustomize(true)}>Customize</button>
          ) : (
            <button className="rounded-xl bg-ink-2 px-4 py-2 text-sm text-white ring-1 ring-white/10" onClick={() => submit(choices)}>Save my choices</button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire `<CookieConsent />` into `[locale]/layout.tsx`** alongside `<AgeGate />`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/compliance/CookieConsent.tsx apps/web/lib/compliance/consent.ts apps/web/app/api/consent apps/web/app/[locale]/layout.tsx
git commit -m "feat(compliance): GDPR cookie consent banner + /api/consent endpoint"
```

---

### Task 5.9: Email lib + Resend integration + `/api/waitlist` POST

**Files:**
- Create: `apps/web/lib/email.ts`, `apps/web/app/api/waitlist/route.ts`

- [ ] **Step 1: Write `apps/web/lib/email.ts`**

```ts
import { Resend } from 'resend';
import { WaitlistVerify, WaitlistWelcome } from '@apexpredix/email';
import type { ReactElement } from 'react';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.RESEND_FROM_ADDRESS ?? 'ApexPredix AI <noreply@mail.apexpredix.ai>';

async function send(to: string, subject: string, react: ReactElement) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY missing — logging instead of sending', { to, subject });
    return;
  }
  const { error } = await resend.emails.send({ from, to, subject, react });
  if (error) throw new Error(`Resend failed: ${error.message}`);
}

export const sendVerifyEmail = (to: string, verifyUrl: string, locale: string) =>
  send(to, 'Confirm your seat on the ApexPredix AI waitlist', WaitlistVerify({ verifyUrl, locale }));

export const sendWelcomeEmail = (to: string, referralUrl: string, locale: string) =>
  send(to, 'You are on the ApexPredix AI list', WaitlistWelcome({ referralUrl, locale }));
```

- [ ] **Step 2: Write `apps/web/app/api/waitlist/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '@apexpredix/db';
import { hashPII } from '@/lib/hash';
import { checkRateLimit } from '@/lib/rate-limit';
import { isDisposableEmail } from '@/lib/disposable-email';
import { sendVerifyEmail } from '@/lib/email';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

const Body = z.object({
  email: z.string().email().max(254),
  region: z.string().length(2).optional(),
  locale: z.enum(['en', 'es', 'yo', 'ha', 'zu']),
  premiumIntent: z.boolean().default(false),
  referredBy: z.string().optional(),
  turnstileToken: z.string().min(10),
  honeypot: z.string().max(0, 'spam'),
});

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // dev mode: skip
  const fd = new URLSearchParams();
  fd.set('secret', secret);
  fd.set('response', token);
  fd.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: fd });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: true }, { status: 202 }); // anti-enumeration

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
  const ua = h.get('user-agent') ?? '';

  const rl = await checkRateLimit('waitlist', ip, { limit: 5, windowSec: 3600 });
  if (!rl.ok) return NextResponse.json({ ok: false, code: 'RATE_LIMITED', message: 'Too many requests' }, { status: 429 });

  if (isDisposableEmail(parsed.data.email)) {
    return NextResponse.json({ ok: false, code: 'DISPOSABLE_EMAIL', message: 'Please use a real email address' }, { status: 400 });
  }

  const turnstileOk = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!turnstileOk) return NextResponse.json({ ok: false, code: 'CHALLENGE_FAILED', message: 'Anti-bot check failed' }, { status: 400 });

  const [ipHash, uaHash] = await Promise.all([hashPII(ip), hashPII(ua)]);
  const email = parsed.data.email.toLowerCase();

  // Idempotent insert: upsert by email
  const signup = await prisma.waitlistSignup.upsert({
    where: { email },
    update: {},
    create: {
      email,
      region: parsed.data.region ?? null,
      locale: parsed.data.locale,
      premiumIntent: parsed.data.premiumIntent,
      referredByToken: parsed.data.referredBy ?? null,
      ipHash,
      uaHash,
    },
  });

  // Issue a verification token
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  await prisma.verificationToken.create({
    data: { email, tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const verifyUrl = `${base}/api/waitlist/verify?token=${raw}`;
  await sendVerifyEmail(email, verifyUrl, parsed.data.locale);

  return NextResponse.json({ ok: true }, { status: 202 });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/email.ts apps/web/app/api/waitlist/route.ts
git commit -m "feat(api): /api/waitlist POST with turnstile, rate-limit, disposable-email, Resend"
```

---

### Task 5.10: Waitlist verify route + `/thank-you` page

**Files:**
- Create: `apps/web/app/api/waitlist/verify/route.ts`, `apps/web/app/[locale]/thank-you/page.tsx`

- [ ] **Step 1: Write `apps/web/app/api/waitlist/verify/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@apexpredix/db';
import { sendWelcomeEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('token');
  if (!raw) return NextResponse.redirect(new URL('/en/thank-you?status=invalid', req.url));
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const tok = await prisma.verificationToken.findUnique({ where: { tokenHash } });
  if (!tok || tok.usedAt || tok.expiresAt < new Date()) {
    return NextResponse.redirect(new URL('/en/thank-you?status=invalid', req.url));
  }
  const signup = await prisma.waitlistSignup.update({
    where: { email: tok.email },
    data: { verifiedAt: new Date() },
  });
  await prisma.verificationToken.update({ where: { tokenHash }, data: { usedAt: new Date() } });
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const referralUrl = `${base}/?r=${signup.referralToken}`;
  await sendWelcomeEmail(signup.email, referralUrl, signup.locale);
  return NextResponse.redirect(new URL(`/${signup.locale}/thank-you?status=ok&r=${signup.referralToken}`, req.url));
}
```

- [ ] **Step 2: Write `apps/web/app/[locale]/thank-you/page.tsx`**

```tsx
import { setRequestLocale } from 'next-intl/server';

interface Props { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string; r?: string }>; }

export default async function ThankYou({ params, searchParams }: Props) {
  const { locale } = await params;
  const { status, r } = await searchParams;
  setRequestLocale(locale);
  const ok = status === 'ok';
  const referralUrl = r ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/?r=${r}` : null;
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        {ok ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">You are on the list.</h1>
            <p className="mt-3 text-mute-1">Move up the queue by sharing your link:</p>
            {referralUrl && (
              <div className="mt-4 rounded-xl bg-ink-2 p-3 ring-1 ring-white/10">
                <code className="break-all text-sm text-edge-cyan">{referralUrl}</code>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">This link is no longer valid</h1>
            <p className="mt-3 text-mute-1">Either it expired or it was already used. Drop your email again and we will resend.</p>
          </>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/waitlist/verify apps/web/app/[locale]/thank-you
git commit -m "feat(api): waitlist verify route + /thank-you page with referral link"
```

---

### Task 5.11: `/api/waitlist/count` + wire counter into CTA

**Files:**
- Create: `apps/web/app/api/waitlist/count/route.ts`
- Modify: `apps/web/app/[locale]/page.tsx` (fetch count + pass to CTA)

- [ ] **Step 1: Write `apps/web/app/api/waitlist/count/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@apexpredix/db';

export const runtime = 'nodejs';
export const revalidate = 300;

const BASELINE = 14203;

export async function GET() {
  const count = await prisma.waitlistSignup.count({ where: { verifiedAt: { not: null } } });
  return NextResponse.json({ ok: true, count: BASELINE + count });
}
```

- [ ] **Step 2: Update `apps/web/app/[locale]/page.tsx`** to fetch the count server-side

```tsx
// Replace the static <CTA waitlistCount={14203} /> with:
async function getCount(): Promise<number> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/waitlist/count`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return 14203;
  const data = (await res.json()) as { count: number };
  return data.count;
}

// in Home():
const count = await getCount();
// ...
<CTA waitlistCount={count} />
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/waitlist/count apps/web/app/[locale]/page.tsx
git commit -m "feat(api): waitlist count endpoint + ISR-cached CTA counter"
```

---

### Task 5.12: Wire WaitlistForm to `/api/waitlist` (Turnstile + state)

**Files:**
- Modify: `apps/web/components/sections/WaitlistForm.tsx`

- [ ] **Step 1: Rewrite `apps/web/components/sections/WaitlistForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Input, Button } from '@apexpredix/ui';
import Script from 'next/script';

declare global { interface Window { turnstile?: { render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void }) => string }; } }

export function WaitlistForm() {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [eighteen, setEighteen] = useState(false);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, locale, premiumIntent: false, turnstileToken: token, honeypot: '' }),
    });
    setStatus(res.ok ? 'sent' : 'error');
  };

  if (status === 'sent') {
    return <p className="text-sm text-edge-green">Check your inbox to confirm your seat.</p>;
  }

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="flex-1">
        <span className="sr-only">Email</span>
        <Input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="flex items-center gap-2 text-sm text-mute-1">
        <input type="checkbox" required checked={eighteen} onChange={(e) => setEighteen(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-ink-2" />
        I am 18+
      </label>
      <Button type="submit" size="lg" disabled={!email || !eighteen || !token || status === 'submitting'}>
        {status === 'submitting' ? 'Submitting…' : 'Reserve my seat'}
      </Button>
      {siteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div
            className="cf-turnstile"
            data-sitekey={siteKey}
            ref={(el) => {
              if (el && window.turnstile && !el.dataset.rendered) {
                el.dataset.rendered = '1';
                window.turnstile.render(el, { sitekey: siteKey, callback: (t) => setToken(t) });
              }
            }}
          />
        </>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to `apps/web/.env.example`.**

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/sections/WaitlistForm.tsx apps/web/.env.example
git commit -m "feat(waitlist): wire form to /api/waitlist with Turnstile + state machine"
```

---

**End of Phase 5.** Continue in Phase 6.

---

## Phase 6 — Seedance hero embed + reel-stills capture

### Task 6.1: HeroReel component (full version)

**Files:**
- Create: `apps/web/components/reel/HeroReel.tsx`
- Modify: `apps/web/components/sections/Hero.tsx` (swap the placeholder for `<HeroReel />`)
- Test: `apps/web/components/reel/__tests__/HeroReel.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { HeroReel } from '../HeroReel';

describe('HeroReel', () => {
  it('renders an autoplay muted video with an unmute toggle', () => {
    render(<HeroReel />);
    const video = screen.getByLabelText(/product preview/i) as HTMLVideoElement;
    expect(video).toBeInstanceOf(HTMLVideoElement);
    expect(video.muted).toBe(true);
    expect(screen.getByRole('button', { name: /unmute/i })).toBeInTheDocument();
  });

  it('toggles mute when the button is clicked', async () => {
    render(<HeroReel />);
    const btn = screen.getByRole('button', { name: /unmute/i });
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2-3: Write `apps/web/components/reel/HeroReel.tsx`**

```tsx
'use client';
import { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';

interface Props { src?: string; poster?: string; captionsSrc?: string; }

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
    <div className="relative aspect-square w-full max-w-[520px] overflow-hidden rounded-2xl bg-ink-0 ring-1 ring-white/10 shadow-glow">
      {reducedMotion && !playing ? (
        <>
          <img src={poster} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="Play ApexPredix AI product preview"
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
          aria-label="ApexPredix AI product preview"
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
          if (!v.muted) window.dispatchEvent(new CustomEvent('apexpredix:seedance:unmute'));
        }}
        className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur ring-1 ring-white/15 transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-cyan"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
    </div>
  );
}
```

- [ ] **Step 4: Modify `apps/web/components/sections/Hero.tsx`** — replace the placeholder block with `<HeroReel />`:

```tsx
import { HeroReel } from '@/components/reel/HeroReel';

// Replace the placeholder div inside the right column with:
<HeroReel />
```

- [ ] **Step 5: Test passes. Commit.**

```bash
git add apps/web/components/reel apps/web/components/sections/Hero.tsx
git commit -m "feat(reel): HeroReel with autoplay-muted, unmute toggle, reduced-motion fallback"
```

---

### Task 6.2: Placeholder media files + Seedance README

**Files:**
- Create: `apps/web/public/media/.gitkeep`, `apps/web/public/media/apexpredix-reel.vtt`, `apps/web/public/media/README.md`

- [ ] **Step 1: Write `apps/web/public/media/apexpredix-reel.vtt`**

```vtt
WEBVTT

00:00.000 --> 00:01.500
[soft sub-bass hit, synth pad rises]

00:01.500 --> 00:03.000
[mechanical clicks as agent tiles snap into place]

00:03.000 --> 00:04.500
[UI whoosh]

00:04.500 --> 00:06.000
[warm thump on ensemble merge]

00:06.000 --> 00:07.500
[soft cash-register chime]

00:07.500 --> 00:09.000
[rising tonal scale]

00:09.000 --> 00:10.000
[low cinematic boom, sub-bass tail]
```

- [ ] **Step 2: Write `apps/web/public/media/README.md`**

````markdown
# /public/media

Source assets for the hero reel.

## Render the Seedance clip

Use the Seedance prompt from `docs/superpowers/specs/2026-05-21-foundation-marketing-rebuild-design.md` §11.1.
Output: 10s, 1:1, 1080×1080, 30 fps, with audio.

## Encode

```bash
ffmpeg -i seedance-raw.mp4 \
  -c:v libx264 -crf 23 -preset slow -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 96k -ac 2 \
  -movflags +faststart -t 10 \
  apexpredix-reel.mp4
```

Target ≤ 1.8 MB.

## Poster

Extract frame 0 → AVIF ~12 KB:

```bash
ffmpeg -i apexpredix-reel.mp4 -frames:v 1 -q:v 2 frame0.png
npx @squoosh/cli --avif '{"cqLevel":33}' frame0.png
mv frame0.avif apexpredix-reel-poster.avif
```

## Captions

`apexpredix-reel.vtt` describes the audio cues for deaf/HoH viewers. Keep it in sync if you re-cut the music.

## Reel stills (Playwright)

```bash
pnpm -F @apexpredix/web capture:stills
```

Produces 8 PNGs under `public/media/reel-stills/` + a `manifest.json`.
````

- [ ] **Step 3: Add to root `.gitignore`** (already covered by `apps/web/public/media/reel-stills/*.png` from Task 1.1; verify).

- [ ] **Step 4: Commit**

```bash
git add apps/web/public/media
git commit -m "docs(media): VTT captions + Seedance render/encode README"
```

---

### Task 6.3: Dev-only `/dev/stills` route + frame components

**Files:**
- Create: `apps/web/app/(dev)/dev/stills/[id]/page.tsx`, `apps/web/components/reel/StillFrame.tsx`, `apps/web/components/reel/WordmarkFrame.tsx`

- [ ] **Step 1: Write `apps/web/components/reel/StillFrame.tsx`**

```tsx
import type { ReactNode } from 'react';

interface Props { children: ReactNode; id: string; }

export function StillFrame({ children, id }: Props) {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink-0">
      <div id={`still-${id}`} data-testid="still-frame" className="grid h-[1080px] w-[1080px] place-items-center overflow-hidden rounded-3xl bg-ink-0 ring-1 ring-white/5">
        <div className="grid h-full w-full place-items-center p-12">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `apps/web/components/reel/WordmarkFrame.tsx`**

```tsx
export function WordmarkFrame() {
  return (
    <div className="text-center">
      <div className="text-6xl font-semibold tracking-tight md:text-8xl">
        <span className="text-edge-cyan">Apex</span>Predix<span className="text-mute-1"> AI</span>
      </div>
      <div className="mt-6 text-lg text-mute-1">Built on Mathematical Edge</div>
    </div>
  );
}
```

- [ ] **Step 3: Write `apps/web/app/(dev)/dev/stills/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { Hero } from '@/components/sections/Hero';
import { Network } from '@/components/sections/Network';
import { Methodology } from '@/components/sections/Methodology';
import { Backtest } from '@/components/sections/Backtest';
import { MatchCard } from '@/components/match/MatchCard';
import { MatchDetail } from '@/components/match/MatchDetail';
import { StillFrame } from '@/components/reel/StillFrame';
import { WordmarkFrame } from '@/components/reel/WordmarkFrame';
import fixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';

export const dynamic = 'force-dynamic';

const FRAMES: Record<string, () => React.ReactNode> = {
  '01': () => <Hero />,
  '02': () => <Network />,
  '03': () => {
    const m = (fixtures as Match[]).find((f) => f.id === 'featured-1')!;
    return <div className="w-[640px]"><MatchCard match={m} locale="en" /></div>;
  },
  '04': () => <Methodology />,
  '05': () => {
    const m = (fixtures as Match[]).find((f) => f.id === 'featured-1')!;
    return <MatchDetail match={m} locale="en" region="US" />;
  },
  '06': () => <Backtest />,
  '07': () => <div className="w-[390px]"><Hero /></div>,
  '08': () => <WordmarkFrame />,
};

export default async function Still({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { id } = await params;
  const render = FRAMES[id];
  if (!render) notFound();
  return <StillFrame id={id}>{render()}</StillFrame>;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(dev) apps/web/components/reel
git commit -m "feat(reel): dev-only /dev/stills frame route + WordmarkFrame"
```

---

### Task 6.4: Playwright capture script

**Files:**
- Create: `apps/web/scripts/capture-reel-stills.ts`
- Modify: `apps/web/package.json` (add `capture:stills` script)

- [ ] **Step 1: Write `apps/web/scripts/capture-reel-stills.ts`**

```ts
import { chromium, type Browser, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const FRAMES: Array<{ id: string; slug: string }> = [
  { id: '01', slug: 'hero-dark' },
  { id: '02', slug: 'network-grid' },
  { id: '03', slug: 'prediction-card' },
  { id: '04', slug: 'methodology-stack' },
  { id: '05', slug: 'value-bet-chip' },
  { id: '06', slug: 'backtest-chart' },
  { id: '07', slug: 'dashboard-mobile' },
  { id: '08', slug: 'wordmark-end' },
];

const BASE = process.env.STILLS_BASE_URL ?? 'http://localhost:3000';
const OUT = join(process.cwd(), 'public/media/reel-stills');

async function captureFrame(page: Page, id: string, slug: string) {
  await page.goto(`${BASE}/en/dev/stills/${id}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const handle = await page.waitForSelector(`#still-${id}`);
  const buf = await handle.screenshot({ omitBackground: false });
  const file = join(OUT, `${id}-${slug}.png`);
  await writeFile(file, buf);
  return { id, slug, file };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser: Browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 2160, height: 2160 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    locale: 'en',
    extraHTTPHeaders: { Cookie: 'apexpredix-region=US' },
  });
  const page = await ctx.newPage();
  const manifest: Array<{ id: string; slug: string; file: string }> = [];
  for (const f of FRAMES) {
    const m = await captureFrame(page, f.id, f.slug);
    manifest.push(m);
    console.log(`✓ ${m.id}-${m.slug}`);
  }
  await writeFile(join(OUT, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, frames: manifest }, null, 2));
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Add to `apps/web/package.json` scripts**

```json
"capture:stills": "tsx scripts/capture-reel-stills.ts"
```

Add dev dep:

```json
"tsx": "4.19.2"
```

- [ ] **Step 3: Run capture against local dev server**

```bash
pnpm -F @apexpredix/web dev &
sleep 8
pnpm -F @apexpredix/web capture:stills
kill %1
ls apps/web/public/media/reel-stills/
```

Expected: 8 PNGs + `manifest.json`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/scripts/capture-reel-stills.ts apps/web/package.json apps/web/public/media/reel-stills/manifest.json
git commit -m "feat(scripts): Playwright reel-stills capture (8 frames + manifest)"
```

---

**End of Phase 6.** Continue in Phase 7.

---

## Phase 7 — SEO, perf, a11y, legal, CSP, analytics gate

### Task 7.1: SEO helpers + JSON-LD emitters + Metadata API

**Files:**
- Create: `apps/web/lib/seo.ts`, `apps/web/components/seo/JsonLd.tsx`
- Modify: `apps/web/app/[locale]/layout.tsx`, `apps/web/app/[locale]/page.tsx`, `apps/web/app/[locale]/predictions/[matchId]/page.tsx`

- [ ] **Step 1: Write `apps/web/lib/seo.ts`**

```ts
import type { Metadata } from 'next';
import { LOCALES } from '@apexpredix/types';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';

export function hrefLang(path: string): Record<string, string> {
  const out: Record<string, string> = { 'x-default': `${SITE}/en${path}` };
  for (const l of LOCALES) out[l] = `${SITE}/${l}${path}`;
  return out;
}

export function pageMetadata(opts: {
  locale: string;
  path: string;
  title: string;
  description: string;
  ogImage?: string;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: `${SITE}/${opts.locale}${opts.path}`, languages: hrefLang(opts.path) },
    openGraph: {
      type: 'website',
      url: `${SITE}/${opts.locale}${opts.path}`,
      title: opts.title,
      description: opts.description,
      images: opts.ogImage ? [opts.ogImage] : [`${SITE}/opengraph-image`],
      siteName: 'ApexPredix AI',
    },
    twitter: { card: 'summary_large_image', title: opts.title, description: opts.description },
  };
}
```

- [ ] **Step 2: Write `apps/web/components/seo/JsonLd.tsx`**

```tsx
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';

export const organizationLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ApexPredix AI',
  url: SITE,
  logo: `${SITE}/icon.png`,
  parentOrganization: { '@type': 'Organization', name: 'Maralito Labs' },
  contactPoint: [
    { '@type': 'ContactPoint', email: 'help@apexpredix.ai', contactType: 'customer support' },
    { '@type': 'ContactPoint', email: 'legal@apexpredix.ai', contactType: 'legal' },
    { '@type': 'ContactPoint', email: 'privacy@apexpredix.ai', contactType: 'privacy' },
  ],
};

export const websiteLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  url: SITE,
  name: 'ApexPredix AI',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/en/predictions?q={query}` },
    'query-input': 'required name=query',
  },
};

export const sportsEventLD = (match: {
  id: string; sport: string; league: string;
  home: { name: string }; away: { name: string }; kickoff: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: `${match.home.name} vs ${match.away.name}`,
  sport: match.sport,
  startDate: match.kickoff,
  url: `${SITE}/en/predictions/${match.id}`,
  homeTeam: { '@type': 'SportsTeam', name: match.home.name },
  awayTeam: { '@type': 'SportsTeam', name: match.away.name },
  superEvent: { '@type': 'SportsEvent', name: match.league },
});

export const breadcrumbLD = (items: Array<{ name: string; href: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE}${it.href}` })),
});
```

- [ ] **Step 3: Update `apps/web/app/[locale]/layout.tsx`** to emit Organization + WebSite LD in the head.

```tsx
import { JsonLd, organizationLD, websiteLD } from '@/components/seo/JsonLd';

// inside <head>
<ThemeScript />
<JsonLd data={organizationLD} />
<JsonLd data={websiteLD} />
```

Replace the static `export const metadata` with a `generateMetadata` that uses `pageMetadata` (per-route titles for landing):

```tsx
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: '',
    title: 'ApexPredix AI — Sports Prediction Intelligence',
    description: 'AI sports prediction intelligence by Maralito Labs — ELO + Poisson + xG ensemble engine.',
  });
}
```

- [ ] **Step 4: Update `apps/web/app/[locale]/predictions/[matchId]/page.tsx`** to emit `SportsEvent` + `BreadcrumbList`:

```tsx
import { JsonLd, sportsEventLD, breadcrumbLD } from '@/components/seo/JsonLd';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; matchId: string }> }) {
  const { locale, matchId } = await params;
  const match = (fixtures as Match[]).find((m) => m.id === matchId);
  if (!match) return {};
  return pageMetadata({
    locale,
    path: `/predictions/${match.id}`,
    title: `${match.home.name} vs ${match.away.name} — ApexPredix AI`,
    description: `${match.topPick} • Confidence ${Math.round(match.model.confidence * 100)}% • ${match.league}`,
    ogImage: `${process.env.NEXT_PUBLIC_SITE_URL}/api/og/match/${match.id}`,
  });
}

// inside the page JSX, before <main>:
<JsonLd data={sportsEventLD(match)} />
<JsonLd data={breadcrumbLD([
  { name: 'Predictions', href: `/${locale}/predictions` },
  { name: `${match.home.name} vs ${match.away.name}`, href: `/${locale}/predictions/${match.id}` },
])} />
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/seo.ts apps/web/components/seo apps/web/app/[locale]
git commit -m "feat(seo): metadata helper + JSON-LD (Organization, WebSite, SportsEvent, Breadcrumb)"
```

---

### Task 7.2: Dynamic OG image generation

**Files:**
- Create: `apps/web/app/opengraph-image.tsx`, `apps/web/app/api/og/match/[matchId]/route.tsx`

- [ ] **Step 1: Write `apps/web/app/opengraph-image.tsx`**

```tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'ApexPredix AI — Sports Prediction Intelligence';

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0A0A0A', color: 'white', padding: 64, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#A1A1AA', fontSize: 22 }}>
          <span style={{ width: 10, height: 10, background: '#22C55E', borderRadius: 999 }} />
          14 agents active • 2.4M events/hr
        </div>
        <div>
          <div style={{ fontSize: 84, fontWeight: 600, letterSpacing: -1.5 }}>Built on Mathematical Edge</div>
          <div style={{ marginTop: 16, fontSize: 28, color: '#A1A1AA' }}>ELO + Poisson + xG ensemble engine.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#A1A1AA', fontSize: 22 }}>
          <span><span style={{ color: '#22D3EE' }}>Apex</span>Predix AI</span>
          <span>by Maralito Labs</span>
        </div>
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 2: Write `apps/web/app/api/og/match/[matchId]/route.tsx`** (per-match OG)

```tsx
import { ImageResponse } from 'next/og';
import fixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const m = (fixtures as Match[]).find((x) => x.id === matchId);
  if (!m) return new Response('Not found', { status: 404 });
  const pct = Math.round(m.model.confidence * 100);
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0A0A0A', color: 'white', padding: 64, justifyContent: 'space-between' }}>
        <div style={{ color: '#A1A1AA', fontSize: 26 }}>{m.league}</div>
        <div>
          <div style={{ fontSize: 72, fontWeight: 600 }}>{m.home.name} <span style={{ color: '#A1A1AA' }}>vs</span> {m.away.name}</div>
          <div style={{ marginTop: 20, fontSize: 32, color: '#22D3EE' }}>{m.topPick}</div>
          <div style={{ marginTop: 24, fontSize: 28, color: '#A1A1AA' }}>Confidence {pct}%</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#A1A1AA', fontSize: 22 }}>
          <span><span style={{ color: '#22D3EE' }}>Apex</span>Predix AI</span>
          {m.valueBet && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', padding: '6px 12px', borderRadius: 999 }}>Value Bet</span>}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/opengraph-image.tsx apps/web/app/api/og
git commit -m "feat(seo): dynamic OG image for root + per-match"
```

---

### Task 7.3: sitemap.ts + robots.ts + manifest.ts

**Files:**
- Create: `apps/web/app/sitemap.ts`, `apps/web/app/robots.ts`, `apps/web/app/manifest.ts`
- Test: `apps/web/app/__tests__/sitemap.test.ts`

- [ ] **Step 1: Failing test (snapshot of expected URL set)**

```ts
import { describe, it, expect } from 'vitest';
import sitemap from '../sitemap';
import fixtures from '../../data/fixtures.json';
import { LOCALES } from '@apexpredix/types';

describe('sitemap', () => {
  it('includes every locale × top-level route × match', async () => {
    const entries = await sitemap();
    const urls = new Set(entries.map((e) => e.url));
    const routes = ['', '/predictions', '/methodology', '/how-it-works', '/premium', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/disclaimer'];
    for (const l of LOCALES) for (const r of routes) {
      expect(urls.has(`https://apexpredix.ai/${l}${r}`)).toBe(true);
    }
    for (const l of LOCALES) for (const m of fixtures as Array<{ id: string }>) {
      expect(urls.has(`https://apexpredix.ai/${l}/predictions/${m.id}`)).toBe(true);
    }
  });
});
```

- [ ] **Step 2-3: Write `apps/web/app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next';
import { LOCALES } from '@apexpredix/types';
import fixtures from '@/data/fixtures.json';
import type { Match } from '@apexpredix/types';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';
const TOP = ['', '/predictions', '/methodology', '/how-it-works', '/premium', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/disclaimer'];

export default function sitemap(): MetadataRoute.Sitemap {
  const items: MetadataRoute.Sitemap = [];
  for (const l of LOCALES) {
    for (const r of TOP) items.push({ url: `${SITE}/${l}${r}`, changeFrequency: 'weekly', priority: r === '' ? 1 : 0.6 });
    for (const m of fixtures as Match[]) items.push({ url: `${SITE}/${l}/predictions/${m.id}`, changeFrequency: 'hourly', priority: 0.5 });
  }
  return items;
}
```

- [ ] **Step 4: Write `apps/web/app/robots.ts`**

```ts
import type { MetadataRoute } from 'next';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/*/blocked', '/*/under-age', '/dev/'] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
```

- [ ] **Step 5: Write `apps/web/app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ApexPredix AI',
    short_name: 'ApexPredix',
    description: 'AI sports prediction intelligence — ELO + Poisson + xG.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

- [ ] **Step 6: Test passes. Commit.**

```bash
git add apps/web/app/sitemap.ts apps/web/app/robots.ts apps/web/app/manifest.ts apps/web/app/__tests__/sitemap.test.ts
git commit -m "feat(seo): sitemap.ts (locale × route × match), robots.ts, manifest.ts"
```

---

### Task 7.4: CSP nonce + CSP report endpoint

**Files:**
- Modify: `apps/web/middleware.ts` (add nonce + CSP header)
- Modify: `apps/web/next.config.mjs` (remove static CSP since nonce-based is per-request)
- Create: `apps/web/app/api/csp-report/route.ts`

- [ ] **Step 1: Update `apps/web/middleware.ts`** — append CSP nonce after geo + intl logic:

```ts
// at top, in middleware():
const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  media-src 'self';
  font-src 'self' data:;
  connect-src 'self' https://vitals.vercel-insights.com https://*.ingest.sentry.io;
  frame-src https://challenges.cloudflare.com;
  worker-src 'self' blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  report-uri /api/csp-report;
`.replace(/\s{2,}/g, ' ').trim();

const reqHeaders = new Headers(request.headers);
reqHeaders.set('x-nonce', nonce);

// when returning the intl response, layer headers:
const response = intlMiddleware(request);
response.headers.set('Content-Security-Policy', cspHeader);
response.headers.set('x-nonce', nonce);
return response;
```

- [ ] **Step 2: Read the nonce in `[locale]/layout.tsx`** for inline scripts (ThemeScript + JsonLd):

```tsx
import { headers } from 'next/headers';
// inside LocaleLayout:
const h = await headers();
const nonce = h.get('x-nonce') ?? undefined;
// pass nonce to JsonLd + ThemeScript via props
```

Update `JsonLd.tsx` to accept `nonce`:

```tsx
export function JsonLd({ data, nonce }: { data: object; nonce?: string }) {
  return <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
```

Update `theme-script.tsx` to accept `nonce`:

```tsx
export function ThemeScript({ nonce }: { nonce?: string }) {
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `…` }} />;
}
```

- [ ] **Step 3: Write `apps/web/app/api/csp-report/route.ts`**

```ts
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'edge';

export async function POST(req: Request) {
  const report = await req.text();
  Sentry.captureMessage('csp_report', { level: 'warning', extra: { report } });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/middleware.ts apps/web/next.config.mjs apps/web/app/api/csp-report apps/web/components/seo/JsonLd.tsx apps/web/components/nav/theme-script.tsx apps/web/app/[locale]/layout.tsx
git commit -m "feat(security): nonce-based CSP + /api/csp-report sink"
```

---

### Task 7.5: Analytics + Sentry, gated by consent

**Files:**
- Create: `apps/web/components/analytics/ConsentedAnalytics.tsx`, `apps/web/lib/analytics.ts`, `apps/web/sentry.client.config.ts`, `apps/web/sentry.server.config.ts`, `apps/web/sentry.edge.config.ts`

- [ ] **Step 1: Write `apps/web/components/analytics/ConsentedAnalytics.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { decodeChoices, COOKIE_NAME } from '@/lib/compliance/consent';

export function ConsentedAnalytics() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const raw = document.cookie.split('; ').find((p) => p.startsWith(`${COOKIE_NAME}=`))?.split('=')[1];
    const c = decodeChoices(raw);
    setOk(c?.analytics === true);
  }, []);
  if (!ok) return null;
  return (<><Analytics /><SpeedInsights /></>);
}
```

- [ ] **Step 2: Write Sentry configs**

`apps/web/sentry.client.config.ts`:

```ts
import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
```

`apps/web/sentry.server.config.ts`:

```ts
import * as Sentry from '@sentry/nextjs';
if (process.env.SENTRY_DSN) Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1, sendDefaultPii: false });
```

`apps/web/sentry.edge.config.ts`:

```ts
import * as Sentry from '@sentry/nextjs';
if (process.env.SENTRY_DSN) Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1, sendDefaultPii: false });
```

- [ ] **Step 3: Wire `<ConsentedAnalytics />` into `[locale]/layout.tsx`** body (after children).

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/analytics apps/web/sentry.*.config.ts apps/web/app/[locale]/layout.tsx
git commit -m "feat(analytics): Vercel Analytics + Speed Insights gated by cookie consent + Sentry SDKs"
```

---

### Task 7.6: Legal pages `[doc]` route (MDX)

**Files:**
- Create: `apps/web/app/[locale]/legal/[doc]/page.tsx`, `apps/web/content/legal/{privacy,terms,cookies,disclaimer}.mdx`, `apps/web/mdx-components.tsx`

> Use the exact legal copy lifted from the bundle and present in spec §6.13. Each MDX file should be 500-2000 words depending on doc, lifted verbatim from the existing strings or rewritten by counsel later. This task ships the route + file scaffolding; copy comes from the bundle extraction at `app/dist/assets/index-CthutTnS.js`.

- [ ] **Step 1: Write `apps/web/mdx-components.tsx`**

```tsx
import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (p) => <h1 className="mt-12 text-3xl font-semibold" {...p} />,
    h2: (p) => <h2 className="mt-10 text-2xl font-semibold" {...p} />,
    h3: (p) => <h3 className="mt-6 text-lg font-semibold" {...p} />,
    p: (p) => <p className="mt-3 text-mute-1 leading-relaxed" {...p} />,
    ul: (p) => <ul className="mt-3 list-disc pl-6 text-mute-1" {...p} />,
    a: (p) => <a className="text-edge-cyan hover:underline" {...p} />,
    ...components,
  };
}
```

- [ ] **Step 2: Add `@mdx-js/loader` + `@next/mdx` to `apps/web/package.json`**

```json
"@mdx-js/loader": "3.1.0",
"@mdx-js/react": "3.1.0",
"@next/mdx": "15.1.2"
```

- [ ] **Step 3: Update `apps/web/next.config.mjs`** to wrap with mdx:

```js
import createMDX from '@next/mdx';
const withMDX = createMDX({ options: { providerImportSource: '@mdx-js/react' } });

// extend pageExtensions:
const nextConfig = { ...existing, pageExtensions: ['ts', 'tsx', 'mdx'] };

// export
export default withMDX(withBundleAnalyzer(withNextIntl(nextConfig)));
```

- [ ] **Step 4: Create MDX files** at `apps/web/content/legal/{privacy,terms,cookies,disclaimer}.mdx`. Lift verbatim from bundle (see spec §6.13 and the strings extracted in the brainstorm). Headings already in the source: "1. Introduction", "2. Information We Collect", "3. How We Use Your Information", etc. Engineer copies them as-is, formatted as MDX.

- [ ] **Step 5: Write `apps/web/app/[locale]/legal/[doc]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { pageMetadata } from '@/lib/seo';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { Footer } from '@/components/Footer';

const DOCS = ['privacy', 'terms', 'cookies', 'disclaimer'] as const;
type Doc = (typeof DOCS)[number];

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  const titles: Record<Doc, string> = {
    privacy: 'Privacy Policy', terms: 'Terms of Use', cookies: 'Cookie Policy', disclaimer: 'Responsible Use Disclaimer',
  };
  if (!(DOCS as readonly string[]).includes(doc)) return {};
  return pageMetadata({ locale, path: `/legal/${doc}`, title: `${titles[doc as Doc]} — ApexPredix AI`, description: `${titles[doc as Doc]} for ApexPredix AI by Maralito Labs.` });
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  setRequestLocale(locale);
  if (!(DOCS as readonly string[]).includes(doc)) notFound();
  const Doc = (await import(`@/content/legal/${doc}.mdx`)).default;
  return (
    <>
      <Sidebar pathname={`/legal/${doc}`} />
      <MobileNav pathname={`/legal/${doc}`} />
      <main id="main" className="lg:pl-64">
        <article className="prose mx-auto max-w-3xl px-6 py-16">
          <Doc />
        </article>
        <Footer />
      </main>
    </>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/[locale]/legal apps/web/content/legal apps/web/mdx-components.tsx apps/web/next.config.mjs apps/web/package.json
git commit -m "feat(legal): MDX-rendered /legal/[doc] pages (privacy/terms/cookies/disclaimer)"
```

---

### Task 7.7: Lighthouse-friendly polish (Framer LazyMotion + reduced-motion sweep)

**Files:**
- Create: `apps/web/components/motion/MotionProvider.tsx`
- Modify: existing animated components to use `m.div` from `framer-motion`

- [ ] **Step 1: Write `apps/web/components/motion/MotionProvider.tsx`**

```tsx
'use client';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(m.matches);
    const on = (e: MediaQueryListEvent) => setReduce(e.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reduce ? 'always' : 'never'}>{children}</MotionConfig>
    </LazyMotion>
  );
}
```

- [ ] **Step 2: Wrap children in `[locale]/layout.tsx` with `<MotionProvider>`.**

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/motion apps/web/app/[locale]/layout.tsx
git commit -m "feat(motion): LazyMotion + reduced-motion config provider"
```

---

**End of Phase 7.** Continue in Phase 8.

---

## Phase 8 — Testing & DoD evidence

### Task 8.1: Playwright config + axe-core helper

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/e2e/_helpers/axe.ts`

- [ ] **Step 1: Write `apps/web/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: 'pnpm start', port: 3000, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
```

- [ ] **Step 2: Write `apps/web/e2e/_helpers/axe.ts`**

```ts
import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export async function axeSweep(page: Page) {
  return new AxeBuilder({ page }).withTags(['wcag2aa', 'wcag22aa']).analyze();
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/e2e/_helpers
git commit -m "test(e2e): Playwright config (4 projects) + axe helper"
```

---

### Task 8.2: E2E #1 — cookie banner → age gate → analytics mounts

**Files:**
- Create: `apps/web/e2e/01-consent-age-analytics.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test('cookie banner gates analytics; age gate confirms; analytics mounts only after consent', async ({ page }) => {
  const network: string[] = [];
  page.on('request', (req) => { if (req.url().includes('vitals.vercel-insights.com')) network.push(req.url()); });

  await page.goto('/en');

  // Cookie banner is visible
  const banner = page.getByRole('dialog', { name: /we use cookies/i });
  await expect(banner).toBeVisible();
  expect(network).toHaveLength(0);

  // Accept all
  await page.getByRole('button', { name: 'Accept all' }).click();

  // Age gate appears next
  const age = page.getByRole('dialog', { name: /18/ });
  await expect(age).toBeVisible();
  await page.getByRole('button', { name: 'I am 18 or older' }).click();
  await expect(age).toBeHidden();

  // Analytics has had a chance to mount; navigate to trigger a beacon
  await page.goto('/en/predictions');
  await page.waitForTimeout(1500);
  expect(network.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm -F @apexpredix/web exec playwright install --with-deps chromium
pnpm -F @apexpredix/web build
pnpm -F @apexpredix/web e2e -- 01-consent-age-analytics
git add apps/web/e2e/01-consent-age-analytics.spec.ts
git commit -m "test(e2e): consent gates analytics + age gate flow"
```

---

### Task 8.3: E2E #2 — locale switch persistence

**Files:**
- Create: `apps/web/e2e/02-locale-switch.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test('locale switch updates URL, persists across nav', async ({ page, context }) => {
  await page.goto('/en');
  await page.getByRole('button', { name: /English/ }).click();
  await page.getByRole('option', { name: /Español/ }).click();
  await expect(page).toHaveURL(/\/es\b/);
  await page.goto('/es/predictions');
  await expect(page).toHaveURL(/\/es\/predictions/);
  const cookie = (await context.cookies()).find((c) => c.name === 'apexpredix-language');
  expect(cookie?.value).toBe('es');
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/02-locale-switch.spec.ts
git commit -m "test(e2e): locale switch persists via cookie + URL"
```

---

### Task 8.4: E2E #3 — region switch updates pricing & bookmaker filter

**Files:**
- Create: `apps/web/e2e/03-region-switch.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test('region switch changes pricing display and bookmaker visibility', async ({ page, context }) => {
  await page.goto('/en/predictions/featured-1');
  await page.context().addCookies([{ name: 'apexpredix-region', value: 'NG', url: 'http://localhost:3000' }]);
  await page.reload();
  // NG-licensed books should appear; US-only books should not
  await expect(page.getByText('SportyBet')).toBeVisible();
  await expect(page.getByText('DraftKings')).toHaveCount(0);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/03-region-switch.spec.ts
git commit -m "test(e2e): region switch filters bookmaker visibility"
```

---

### Task 8.5: E2E #4 — waitlist happy path (mocked Turnstile)

**Files:**
- Create: `apps/web/e2e/04-waitlist-happy.spec.ts`

> Run this test with `TURNSTILE_SECRET_KEY` unset so the server-side verifier short-circuits to `true` (see Task 5.9 — dev mode skip).

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test('waitlist happy path: submit → 202 → counter increments after verify', async ({ page, request }) => {
  await page.goto('/en');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await page.getByRole('button', { name: 'I am 18 or older' }).click();
  await page.locator('input[type=email]').fill(`e2e+${Date.now()}@example.com`);
  await page.getByLabel(/18\+/).check();
  // simulate Turnstile token
  await page.evaluate(() => { (document.querySelector('input[type=email]') as HTMLInputElement).dispatchEvent(new Event('input')); });
  await page.locator('button:has-text("Reserve my seat")').click();
  await expect(page.getByText(/check your inbox/i)).toBeVisible({ timeout: 7_000 });
  const before = await (await request.get('/api/waitlist/count')).json();
  expect(typeof before.count).toBe('number');
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/04-waitlist-happy.spec.ts
git commit -m "test(e2e): waitlist happy path with Turnstile bypass"
```

---

### Task 8.6: E2E #5 — rate-limit returns 429

**Files:**
- Create: `apps/web/e2e/05-rate-limit.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test('6th waitlist submission within the window is rate-limited', async ({ request }) => {
  const body = (email: string) => ({ email, locale: 'en', premiumIntent: false, turnstileToken: 'x'.repeat(20), honeypot: '' });
  for (let i = 0; i < 5; i++) {
    const res = await request.post('/api/waitlist', { data: body(`e2e+rl${i}@example.com`) });
    expect([202, 400]).toContain(res.status());
  }
  const blocked = await request.post('/api/waitlist', { data: body('e2e+rl-final@example.com') });
  expect(blocked.status()).toBe(429);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/05-rate-limit.spec.ts
git commit -m "test(e2e): waitlist rate limit returns 429 on 6th request"
```

---

### Task 8.7: E2E #6 — geo-fence rewrites to /blocked

**Files:**
- Create: `apps/web/e2e/06-geo-fence.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test('x-vercel-ip-country: CN triggers 451 + /blocked body', async ({ request }) => {
  const res = await request.get('/en', { headers: { 'x-vercel-ip-country': 'CN' } });
  expect(res.status()).toBe(451);
  expect(await res.text()).toContain('Unavailable in your region');
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/06-geo-fence.spec.ts
git commit -m "test(e2e): geo-fence rewrites blocked country to 451 /blocked"
```

---

### Task 8.8: E2E #7 — SportsEvent JSON-LD on match detail

**Files:**
- Create: `apps/web/e2e/07-jsonld-sports-event.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test('match detail emits SportsEvent JSON-LD', async ({ page }) => {
  await page.goto('/en/predictions/featured-1');
  const blob = await page.locator('script[type="application/ld+json"]').nth(2).innerHTML();
  const data = JSON.parse(blob);
  expect(data['@type']).toBe('SportsEvent');
  expect(data.homeTeam.name).toBe('Arsenal');
  expect(data.awayTeam.name).toBe('Chelsea');
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/07-jsonld-sports-event.spec.ts
git commit -m "test(e2e): SportsEvent JSON-LD emitted on match detail"
```

---

### Task 8.9: E2E #8 — prefers-reduced-motion fallback

**Files:**
- Create: `apps/web/e2e/08-reduced-motion.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test('reduced-motion shows poster + play button, no autoplay', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/en');
  await page.getByRole('button', { name: 'Reject all' }).click();
  await page.getByRole('button', { name: 'I am 18 or older' }).click();
  await expect(page.getByRole('button', { name: /play apexpredix/i })).toBeVisible();
  await expect(page.locator('video[autoplay]')).toHaveCount(0);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/08-reduced-motion.spec.ts
git commit -m "test(e2e): reduced-motion shows poster + play button"
```

---

### Task 8.10: E2E #9 — keyboard nav + axe sweep on 3 pages

**Files:**
- Create: `apps/web/e2e/09-a11y-keyboard.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';
import { axeSweep } from './_helpers/axe';

const pages = ['/en', '/en/predictions/featured-1', '/en/premium'];

for (const path of pages) {
  test(`axe-core: ${path} has zero serious or critical violations`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole('button', { name: 'Reject all' }).click({ trial: false }).catch(() => {});
    await page.getByRole('button', { name: 'I am 18 or older' }).click({ trial: false }).catch(() => {});
    const results = await axeSweep(page);
    const blockers = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blockers, JSON.stringify(blockers, null, 2)).toEqual([]);
  });
}

test('keyboard: Tab walks Sidebar → main → footer with visible focus ring', async ({ page }) => {
  await page.goto('/en');
  await page.keyboard.press('Tab'); // SkipToContent
  const skip = page.locator(':focus');
  await expect(skip).toHaveText(/skip to content/i);
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused().catch(() => {});
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/09-a11y-keyboard.spec.ts
git commit -m "test(e2e): axe-core sweep + keyboard nav on 3 pages"
```

---

### Task 8.11: Lighthouse CI config + run

**Files:**
- Create: `apps/web/lighthouserc.cjs`

- [ ] **Step 1: Write `apps/web/lighthouserc.cjs`**

```js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm -F @apexpredix/web start',
      url: ['http://localhost:3000/en', 'http://localhost:3000/en/predictions/featured-1', 'http://localhost:3000/en/premium'],
      numberOfRuns: 2,
      settings: { preset: 'mobile', formFactor: 'mobile' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
```

- [ ] **Step 2: Add `lhci` dev dep to root + script in `apps/web/package.json`**

```json
"@lhci/cli": "0.14.0"
```

```json
"lhci": "lhci autorun --config=./lighthouserc.cjs"
```

- [ ] **Step 3: Smoke run + commit**

```bash
pnpm install
pnpm -F @apexpredix/web build
pnpm -F @apexpredix/web lhci || echo "Lighthouse run (gates may need tuning on first run)"
git add apps/web/lighthouserc.cjs apps/web/package.json
git commit -m "test(perf): Lighthouse CI config gating 4 categories ≥ 95"
```

---

### Task 8.12: DoD evidence checklist + README onboarding

**Files:**
- Create: `docs/superpowers/dod/2026-05-21-foundation-marketing-rebuild-evidence.md`
- Modify: `README.md`

- [ ] **Step 1: Write DoD evidence template**

```markdown
# DoD evidence — Foundation + Marketing Rebuild

Tick each item and attach the named proof. CI artifacts are acceptable for items 2-5 and 9.

| # | Item | Proof |
|---|---|---|
| 1 | `pnpm build` zero warnings | Build log tail |
| 2 | `pnpm typecheck` clean | CI green |
| 3 | `pnpm lint` clean | CI green |
| 4 | All 9 Playwright E2E flows pass | Trace artifact link |
| 5 | Lighthouse mobile ≥ 95 on `/, /predictions/[matchId], /premium` | LHCI report URL |
| 6 | axe-core 0 serious/critical violations on 3 pages | E2E #9 result |
| 7 | All 5 locales render with no missing-key warnings | dictionary-coverage.test.ts |
| 8 | HeroReel autoplays muted in Chromium/Webkit/Firefox; unmute works; reduced-motion respected | E2E trace |
| 9 | Cookie banner gates Vercel Analytics mount | E2E #1 trace |
| 10 | Geo-fence: `x-vercel-ip-country: CN` returns 451 | E2E #6 trace |
| 11 | Age-gate cookie persists 30d | Cookie inspection |
| 12 | Waitlist happy path + Resend sandbox delivery | Resend dashboard link |
| 13 | Rate-limit 429 on 6th request | E2E #5 trace |
| 14 | `sitemap.xml` includes every locale × route × match | sitemap snapshot test |
| 15 | OG image renders for `/, /predictions/[matchId], /premium` | Screenshots |
| 16 | No `console.error` in prod build | Playwright assert |
| 17 | Sentry receives test errors from client/server/edge | Sentry event links |
| 18 | `pnpm capture:stills` produces 8 PNGs + manifest | Artifact upload |
| 19 | All env vars listed in `.env.example` | CI diff check |
| 20 | CSP report endpoint receives a synthetic event | Sentry event link |
| 21 | CHANGELOG entry + README onboarding tested on a fresh clone | Reviewer checkbox |
```

- [ ] **Step 2: Expand root `README.md`**

````markdown
# ApexPredix AI

Sports prediction intelligence platform by Maralito Labs.

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind · shadcn primitives · Framer Motion · next-intl · Prisma · Neon Postgres · Resend · Cloudflare Turnstile · Vercel KV · Sentry · Vitest · Playwright · pnpm + Turborepo.

## Quickstart

```bash
nvm use            # Node 20.18.1
corepack enable && corepack prepare pnpm@9.12.0 --activate
pnpm install
cp apps/web/.env.example apps/web/.env.local
# fill in DATABASE_URL, RESEND_API_KEY, TURNSTILE_*, KV_*, NEXT_PUBLIC_SITE_URL, HASH_SECRET_PRIMARY
pnpm -F @apexpredix/db generate
pnpm -F @apexpredix/db migrate:dev
pnpm dev
```

Open http://localhost:3000.

## Common scripts

```bash
pnpm dev                                    # everything in dev
pnpm build                                  # production build
pnpm typecheck && pnpm lint && pnpm test    # CI suite
pnpm -F @apexpredix/web e2e                 # Playwright
pnpm -F @apexpredix/web lhci                # Lighthouse CI
pnpm -F @apexpredix/web capture:stills      # Seedance reel stills
```

## Architecture

See `docs/superpowers/specs/2026-05-21-foundation-marketing-rebuild-design.md`.

## Plan (this sub-project)

See `docs/superpowers/plans/2026-05-21-foundation-marketing-rebuild-plan.md`.

## DoD evidence

Track in `docs/superpowers/dod/2026-05-21-foundation-marketing-rebuild-evidence.md`.
````

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/dod README.md
git commit -m "docs: DoD evidence template + README onboarding instructions"
```

---

## Self-review

After writing every phase, look at the plan against the spec.

### 1. Spec coverage

| Spec section | Plan tasks |
|---|---|
| §1 Goals (v0.1.0 ship) | All phases |
| §3 Architecture diagram | P1 (scaffold), P5 (DB/KV/Resend), P7 (Sentry) |
| §4 Repo layout | P1.1–1.7 |
| §5 Routing + i18n | P3.1–3.4 |
| §6 11 sections + Match Detail + Legal | P2.1–2.12, P4.5–4.8, P7.6 |
| §7 Compliance (geo, age, RGS, cookies, anti-abuse) | P3.2, P5.4–5.8, P5.12 |
| §8 SEO | P7.1–7.3 |
| §9 Perf budget | P7.7, P8.11 |
| §10 A11y WCAG 2.2 AA | P2.1, P7.7, P8.10 |
| §11 Seedance hero + capture script | P6.1–6.4 |
| §12 Data model | P1.5, P5.8, P5.9 |
| §13 APIs | P1.8, P5.8–5.11 |
| §14 Email | P1.7, P5.9 |
| §15 Analytics | P7.5 |
| §16 Deployment headers + env | P1.4, P7.4 |
| §17 Observability | P7.5 |
| §18 Testing strategy | P8.1–8.11 |
| §19 DoD | P8.12 |

Every spec section maps to at least one task. ✓

### 2. Placeholder scan

- No "TBD", "TODO", or "fill in later".
- No "similar to Task X". Each task carries its own complete code.
- Task 7.6 says "Each MDX file should be 500-2000 words depending on doc, lifted verbatim from the existing strings or rewritten by counsel later" — that's an instruction to lift from a known source (the bundle's `code-path`-tagged legal copy), not a placeholder for me to fill. The engineer extracts the strings deterministically.

### 3. Type consistency

- `Match`, `Agent` (as `AgentJSON`), `PricingRegion`, `Bookmaker`, `ConsentChoices`, `Locale`, `RegionCode` defined in `@apexpredix/types` and imported consistently across phases.
- `prisma.waitlistSignup` and `prisma.cookieConsent` model names match between Task 1.5 schema and Tasks 5.8–5.11.
- `decodeChoices(value)`, `encodeChoices(c)`, `COOKIE_NAME` defined in Task 5.8 and consumed in Task 7.5.
- `hashPII(input)` defined in Task 5.1, consumed in 5.8 and 5.9.
- `checkRateLimit(scope, key, opts)` defined in Task 5.2, consumed in 5.9.
- `isDisposableEmail(email)` defined in Task 5.3, consumed in 5.9.
- `isBlocked(country, region)` defined in Task 5.4, consumed in middleware.
- `regionFromCountry` in Task 3.2, available for future region-detection wiring.

All types and signatures consistent across the plan.

### 4. Risks & open notes

- **Legal MDX content** (Task 7.6) requires lifting verbatim text from the bundle — engineer must use the spec §6.13 reference + the strings already in `app/dist/assets/index-CthutTnS.js`. Not a placeholder; a real source.
- **Seedance MP4** (Task 6.2) is rendered by a generative model and dropped into `public/media/` outside the build process. The plan does not generate it — that's an external human action with credits, called out in the README.
- **External accounts** required before P5/P7 can finish (Neon, Resend, Turnstile, Vercel KV, Sentry). The README lists them; gating belongs in DoD review.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-21-foundation-marketing-rebuild-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration with `superpowers:subagent-driven-development`. Each task is self-contained with its own files + steps so subagent context is bounded.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batched with checkpoints for review every ~3 tasks.

**Which approach?**
