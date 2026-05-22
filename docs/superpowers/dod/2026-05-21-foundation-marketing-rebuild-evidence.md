# DoD evidence — Foundation + Marketing Rebuild (v0.1.0)

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
