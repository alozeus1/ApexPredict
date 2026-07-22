# Unblock Runbook — what Godwill runs, and what it unblocks

Date: 2026-07-19
Branch: `feat/engine-correctness-and-multi-sport`

Run commands **one line at a time**. Multi-line pastes concatenate in your zsh prompt
(that's what produced `statuscd` earlier).

Steps are ordered by dependency. Each block states what it unblocks.

---

## STEP 1 — Fix `DIRECT_URL` (5 min) — blocks everything below

**Status: NOT DONE.** The `DIRECT_URL` line in `apps/web/.env.local` still holds the shipped
placeholder value (generic user/password against host `host`, not a real endpoint). Prisma Migrate
runs DDL over this connection, not `DATABASE_URL`, so migrations cannot run until it is real.

Open `apps/web/.env.local` in your editor. Copy the real `DATABASE_URL=` line, paste it as
`DIRECT_URL=`, and delete `-pooler` from the hostname. Delete the old placeholder line.

```
DATABASE_URL=postgresql://…@<your-endpoint>-pooler.<region>.aws.neon.tech/neondb?…
DIRECT_URL=postgresql://…@<your-endpoint>.<region>.aws.neon.tech/neondb?…
                                                 ↑ only difference
```

While you're in the file, add your **rotated** API-Sports key (the one you pasted in chat is
burned — revoke it):

```
API_SPORTS_KEY=<new key>
```

Verify — **open a fresh terminal first** (your current shell has a stale placeholder
`DATABASE_URL` exported, and `loadEnvFile` will not override it):

```bash
cd ~/Desktop/ApexPredict/apps/web && node -e "process.loadEnvFile('.env.local'); for (const k of ['DATABASE_URL','DIRECT_URL']) console.log(k, new URL(process.env[k]).hostname)"
```

Expect two `…neon.tech` hosts, one with `-pooler`, one without.

---

## STEP 2 — Apply the migration (5 min) — unblocks all DB work

```bash
cd ~/Desktop/ApexPredict/packages/db
```
```bash
pnpm prisma migrate status
```

**Send me this output before deploying.** If it lists only `20260719_add_multi_sport_dimension`
as pending, you are clean. If earlier migrations also show pending, the database was likely
built with `db push` and needs `prisma migrate resolve --applied <name>` rather than a re-run —
do not force it.

```bash
pnpm prisma migrate deploy
```

*Unblocks:* seed script, backtest script, entity mapping, everything downstream.

---

## STEP 3 — Run the test suite (10 min) — unblocks my verification gate

```bash
cd ~/Desktop/ApexPredict
```
```bash
pnpm install
```
```bash
pnpm -F @apexpredix/db generate
```
```bash
pnpm typecheck
```
```bash
pnpm test
```
```bash
pnpm lint
```
```bash
pnpm -F @apexpredix/web build
```

**Send me any failures.** I have only ever been able to run `tsc` — your `node_modules` is
macOS-built and vitest/eslint cannot run in my Linux sandbox. Until this passes, every
"tests pass" claim in my reports is unverified.

*Unblocks:* Phase 0 baseline verification gate; Loop D.

---

## STEP 4 — Mapping + coverage report (10 min) — decides P2 build order

```bash
cd ~/Desktop/ApexPredict/apps/web
```
```bash
pnpm tsx scripts/seed-provider-mappings.ts --season 2026
```

Dry run — writes nothing. **Send me the output.**

It tells us mapped-team percentage per competition and which leagues lack injuries/lineups
coverage. If NPFL and CAF map badly, injury/lineup providers are worth less than historical
backfill and I will reorder P2.

*Unblocks:* Phase 3 threshold measurement; P2 sequencing decision.

---

## STEP 5 — Generate settled predictions (runs over days) — unblocks ALL model validation

The engine needs finished fixtures with predictions attached before anything can be measured.

Trigger a refresh manually:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" https://<your-vercel-domain>/api/cron/daily-refresh
```

Vercel also runs this at 06:00 UTC daily. Then, once fixtures have finished:

```bash
cd ~/Desktop/ApexPredict/apps/web
```
```bash
pnpm tsx scripts/backtest.ts
```

It refuses to print numbers when nothing has settled, and prints its own caveats when it does.

*Unblocks:* **the baseline** — and therefore Phases 5, 6, 7, 9 and every "beats baseline" claim.
This is the single longest-lead item. Start it today.

---

## STEP 6 — Licensing review (30 min, no commands) — unblocks a release gate

Read the terms for the two providers actually feeding the engine and record what they permit:

- Football-Data.org — <https://www.football-data.org/terms>
- API-Sports — terms linked from your dashboard

For each, determine four **separate** rights:

1. **storage** — may we persist records beyond the request?
2. **modelTraining** — may we train statistical/ML models on it?
3. **derivedCommercialOutput** — may we sell subscriptions to output derived from it?
4. **displayRedistribution** — may we show the raw values to end users?

Record findings in `apps/web/lib/providers/registry/providers.ts` — set each to
`GRANTED` / `DENIED` / `CONDITIONAL`, and fill in `evidence` (URL or email reference) and
`reviewedAt`. Do not set `GRANTED` without evidence; `assertRight()` gates real behaviour on
these values.

Check the gate:

```bash
cd ~/Desktop/ApexPredict/apps/web && pnpm vitest run lib/providers/registry
```

The test asserting the gate currently fails is intentional. When it flips to passing, that is a
real change in release readiness.

*Unblocks:* the "provider rights documented" release gate. **No amount of code can substitute
for this.**

---

## STEP 7 — Four scoping answers (no commands) — unblocks Phases 3, 5, 9

1. **Staging database** — is one available, or is production Neon the only target? Phase 5
   backfill and Phase 9 backtests against production is a standing risk. Neon branching is
   cheap and would solve it.
2. **Codex integration** — is it installed in your environment? If not, Loop E is a permanently
   open gate and I will record it as such rather than pretend it ran.
3. **Launch competition set** — which competitions ship at launch? Entity-mapping and coverage
   thresholds are meaningless without a defined scope.
4. **OpticOdds / TheRundown** — contracts held, or aspirational? This decides whether
   closing-line value (gap G13) is achievable at launch. CLV is the strongest evidence you will
   ever have that the model has genuine edge.

---

## Optional but recommended — staging branch

```bash
# create a branch in the Neon console, then:
cd ~/Desktop/ApexPredict/packages/db
```
```bash
DATABASE_URL=<branch-url> DIRECT_URL=<branch-direct-url> pnpm prisma migrate deploy
```

Point `apps/web/.env.local` at the branch for day-to-day work and keep production credentials
out of your shell entirely.

---

## Housekeeping

```bash
cd ~/Desktop/ApexPredict && rm -f hello-back.txt hello-floci.txt
```

Then commit the current work — it is uncommitted on
`feat/engine-correctness-and-multi-sport`:

```bash
git add -A && git commit -m "feat(engine): de-vigging, Dixon-Coles, calibration, publishing policy, provider registry; fix(data): remove silent demo-fixture fallback"
```

---

## What I do when each lands

| You complete | I can then do |
|---|---|
| Steps 1–2 | Wire API-Sports into the cron; pre-kickoff worker (Phase 4) |
| Step 3 | Confirm the verification gate honestly; fix any real test failures |
| Step 4 | Finalise Phase 3 entity resolution against measured coverage |
| Step 5 | Baseline, then Phases 5, 7, 9 — feature store, ensemble, walk-forward |
| Step 6 | Close the licensing release gate |
| Step 7 | Scope Phases 3/5/9 correctly instead of guessing |

**Highest leverage right now: Steps 1, 2 and 5.** Step 5 has the longest lead time — settled
fixtures accumulate on real-world match schedules, not on demand.
