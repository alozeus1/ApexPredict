# ApexPredict — Locale Gate (YO / IG / HA)

**Version:** v1.0 · 2026-06-04
**Rule:** English ships at launch. Yoruba (`yo`), Igbo (`ig`), and Hausa (`ha`) ship only if they pass the translation gate below. Failed locales defer to v1.1. **No Pidgin in v1.**

---

## Why a gate exists

A poor translation of a sports-betting analytics product damages trust faster than an English-only product does. A user who reads a clumsy Yoruba pick narrative concludes either (a) we don't care about Yoruba speakers, or (b) we don't know what we're doing. Both are fatal at launch. The gate exists to make the "ship vs. defer" decision objective, not political.

---

## Gate criteria — all of these must pass for a locale to ship

1. **Native-speaker reviewer signoff.** A paid reviewer who is a native speaker AND has spent material time in Nigerian sports-betting culture (i.e., knows the slang). At least one human review per locale; we recommend two for cross-checking.
2. **Glossary signoff.** A glossary of 60 sports-betting terms (English → target) translated and signed off by the reviewer before any UI strings are translated. Examples: *value bet, edge, probability, market, odds, stake, accumulator, both teams to score, over/under, draw, win, push, payout, calibrated, ROI*. The reviewer commits to specific renderings in writing; UI strings then use exactly those renderings.
3. **200-string benchmark accuracy ≥ 95%.** A random sample of 200 UI strings is back-translated to English by a second blind reviewer; ≥ 190 match the source meaning faithfully (semantic equivalence, not literal).
4. **Tone & register check.** The reviewer rates tone on a 1–5 scale across 30 strings (UI, emails, Telegram). Average ≥ 4.0.
5. **No machine-translated strings.** Auto-translate is disallowed for ship. We may use it as a *draft* input but every shipped string must have human-edit and sign-off recorded.
6. **Right-to-left / character-set rendering** — verified across the same 200 strings in the actual UI on iPhone Safari, Android Chrome low-end, and desktop Chrome. (Not RTL in our case but verify diacritics + Yoruba tone marks render correctly.)
7. **Maintainability commitment.** The reviewer signs a contract to review new copy within 48h, indefinitely, for paid work. If we can't secure that contract, we don't ship the locale.

A locale that passes all seven items ships. A locale that misses even one defers to v1.1.

---

## Reviewer sourcing (recommended)

- **Yoruba (`yo`):** academic-network sourcing — UI / OAU linguistics departments; or established translation agencies operating in Lagos.
- **Igbo (`ig`):** UNN or University of Port Harcourt linguistics; or Nairaland community sourcing with verified profiles.
- **Hausa (`ha`):** Bayero University Kano or Ahmadu Bello University; or established broadcasters (BBC Hausa freelancers).
- Rate guide (2026): expect ₦80–150 per 100 words for professional translation, plus a flat ~₦80–120k signoff fee for the glossary phase.

---

## Existing codebase state

The current repo declares five locales in `apps/web/i18n/locales.ts` / `i18n/routing.ts` / `messages/`: `en`, `es`, `yo`, `ha`, `zu`. None except `en` is shippable:

- `es` (Spanish) — **drop**, not in scope for Nigeria-first launch.
- `zu` (Zulu) — **drop**, South Africa is a v1.2 target.
- `yo` (Yoruba) — keep as a *candidate*; needs to pass the gate.
- `ha` (Hausa) — keep as a *candidate*; needs to pass the gate.
- `ig` (Igbo) — **add as a candidate**; needs to pass the gate.

Until the gate is passed, the language switcher only shows English. We do not show a half-translated locale.

---

## Operational steps to run the gate (per locale)

1. **Engage reviewer(s).** Sign the contract that includes the maintainability commitment.
2. **Translate the glossary (week 1).** Sportsbetting-specific 60-term glossary. Reviewer signs off in writing.
3. **Draft-translate the UI strings** in `messages/<locale>.json` using a workflow tool (Lokalise, Crowdin, Phrase free plan, or a shared spreadsheet for solo-translator workflows). The bot/MT may pre-fill; humans must edit every cell.
4. **Build the benchmark set.** Random sample of 200 strings (script: `pnpm -F @apexpredix/web i18n:benchmark <locale>`).
5. **Run back-translation.** Second blind reviewer back-translates to English. Score against source.
6. **Tone scoring.** Reviewer rates tone on 30 strings.
7. **In-browser rendering test.** Spin up a preview deploy with the candidate locale enabled; QA verifies the 200-string benchmark renders correctly across the three device profiles.
8. **Sign-off form.** Reviewer (and second reviewer) sign a one-pager that captures all the metric outcomes. Stored in `docs/compliance/locale-gate/<locale>-<YYYY-MM-DD>.pdf`.
9. **Locale flag flips on** in `i18n/locales.ts` and in the language switcher. **Otherwise**, the locale stays disabled and gets a v1.1 ticket.

---

## What ships in v1 if no locale passes

English-only. The language switcher in the sidebar is hidden. We tell the world honestly:

> "We're shipping in English for launch. We're working with native speakers on Yoruba, Igbo, and Hausa for v1.1 — we'd rather get it right than ship something half-translated."

This is the most honest posture and the safest one for trust.

---

## V1.1 path

Locales that miss the v1 gate become first-class v1.1 tickets immediately after launch. The same gate applies — we don't lower the bar to move faster.
