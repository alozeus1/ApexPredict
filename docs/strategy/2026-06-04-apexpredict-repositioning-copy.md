# ApexPredict — Repositioning Copy Delta

**Version:** v1.0 · 2026-06-04
**Why:** No copy, UI, email, or social channel may promise a "win rate," "guaranteed wins," or specific ROI. We are a **calibrated value-bet signal service** — we publish probabilities and edge versus the live market.

---

## The principle, in one paragraph

> ApexPredict turns sports data into **calibrated probabilities**. We compare those probabilities to the prices Nigerian bookmakers are offering and flag where the market is wrong. We publish our scoreboard openly — Brier score, hit-rate by confidence bucket, calibration plot — so you can judge our edge yourself. We don't promise wins. We give you the math behind a decision you're already making.

That paragraph is the canonical north-star for every piece of marketing and UI copy from here on out.

---

## Forbidden language (reject in code review)

- "X% win rate" / "win ratio" / "guaranteed wins" / "sure picks" / "no losses"
- "ROI of X%" stated as a future promise (post-hoc backtest numbers are fine, framed historically)
- "Beat the bookies every time" / similar
- "We always pick winners"
- Emoji + currency combos that imply easy money (e.g. "💰🤑")
- Vague trust markers without evidence ("trusted by thousands") unless backed by a real verifiable count

## Approved language

- "Calibrated probability" / "model probability"
- "Edge vs. market" / "value bet" (with the precise definition: `model_p − implied_p ≥ 3%`)
- "Brier score" / "log-loss" / "calibration error"
- "Decision support" / "signal service"
- "Historical performance" (always paired with the sample window and a disclosure)
- "18+ only. Sports betting involves risk. Past performance does not guarantee future results."

---

## File-by-file replacement list

### `apps/web/components/sections/Hero.tsx`

**Before (implied promise):** language anywhere claiming a win rate.

**After (canonical):**

> **The math behind your next bet.**
> ApexPredict computes calibrated probabilities for upcoming football matches and flags where the market is mispriced. We publish our scoreboard openly — see how we score before you trust a pick.

CTA copy: **"See today's picks"** + secondary CTA **"How we measure ourselves"** linking to `/methodology`.

Compliance footer (small text on the hero):

> 18+ only. Decision support, not a bookmaker. Past performance does not guarantee future results.

### `apps/web/components/sections/Methodology.tsx`

Replace marketing copy with the live calibration figures rendered from `PredictionBacktestRun`. Sample heading + body:

> **How we measure ourselves.**
> Every pick we publish is later evaluated against the real result. We track Brier score, log-loss, and calibration error per probability bucket. The table below refreshes daily.

Then render the live `PredictionBacktestRun` data (see story `E04-S3`).

### `apps/web/components/sections/Backtest.tsx`

Pull numbers from DB, not hardcoded. If sample size < 100, show "**Sample size below 100 picks** — figures will display once we cross that threshold." Do not show a number with a tiny `n`.

### `apps/web/components/sections/Premium.tsx`

**Before:** "Unlocked" badges and aspirational lists.

**After (tier-aware):** Render from `entitlementsFor(user)`. Headline: **"Edge subscriptions — for punters who care about EV."** Below: matrix of features per tier with a clear price ladder. Every feature description ties back to *decision support*, not *guaranteed wins*.

### `apps/web/components/sections/HowToUse.tsx`

Frame as a **decision workflow**:

1. We compute the model probability.
2. We compare it to live odds across SportyBet, Bet9ja, 1xBet, BetKing, and MSport.
3. If the market disagrees by ≥ 3 percentage points in our favour, we flag a value bet.
4. You decide whether to take it. Use the Kelly tool if you want a stake suggestion.
5. We track the outcome and feed it back into our scoreboard.

### `apps/web/app/[locale]/dashboard/page.tsx`

The dashboard currently shows hardcoded `Win Rate 89.3%`, `Net Profit +$106`, `ROI +8.5%`, `Active Streak 6W`, `Total Staked $1,250`, `Total Returned $1,356` — these are demo numbers presented as fact. **All six must be removed for v1.** Replace with:

- **`Tracked picks (30d)`** — count from `UserPick` joined to `PredictionEvaluation`
- **`Hit rate (your bucket)`** — only show when `n ≥ 30`, else "Awaiting sample"
- **`Brier score`** — show alongside a reference number ("baseline 0.21")
- **`Calibration error`**
- **`Current streak`** — last 5 picks visualised, no marketing copy around streaks

Add a banner at the top:

> Open beta — your tracked-pick data feeds your dashboard. We're not a sportsbook; nothing here is a guarantee.

### `apps/web/app/[locale]/page.tsx`

`WAITLIST_BASELINE = 14203` is hardcoded social proof and must go. Replace the call site with either:

- The real count when it exceeds 5,000 verified signups, OR
- "Launching soon in Nigeria" with no count.

### `apps/web/messages/en.json` (and all locales)

Audit every `i18n` string for forbidden language. The same rules apply in `yo`, `ha`, `ig`, etc.

### Email templates (`apps/web/emails/*` and `packages/email/templates/*`)

Every email footer must include:

> ApexPredict is a sports prediction analytics service. We are not a bookmaker. 18+ only. If you no longer wish to receive these emails, [unsubscribe here]. Need a break? [Visit our responsible-gaming page].

### Telegram bot

Bot bio: **"Calibrated football pick signals from ApexPredict. Decision support, not guaranteed wins. 18+."**

Every published pick must include:

- Model probability
- Best price + book
- Edge percentage
- Confidence band
- Disclaimer line: "18+. Decision support only."

### Legal pages (`apps/web/content/legal/*`)

`disclaimer.mdx` should already cover this; counsel reviews in S4. Verify it explicitly says: "We do not guarantee outcomes. Sports betting involves risk of loss. Past performance does not predict future results."

---

## Definition of done for repositioning

A PR titled "feat(copy): reposition as value-bet signal service" lands in S1. Reviewer checklist:

- [ ] No forbidden phrase appears in any committed text (run `rg -i "win rate|guaranteed|sure pick"` for sanity).
- [ ] Dashboard demo numbers replaced or removed.
- [ ] Hero subhead + CTA match this doc.
- [ ] Methodology renders live calibration data.
- [ ] Every email footer carries the disclaimer.
- [ ] Telegram bot bio + per-pick disclaimer present.
- [ ] `WAITLIST_BASELINE` removed from the call site.

Counsel signs off before the PR merges.
