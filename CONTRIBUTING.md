# Contributing to ApexPredict

Thanks for working on ApexPredict. This document is the contract for how changes
land. It is intentionally short — read it once, follow it every time.

## Branching model

We use a two-trunk model:

- **`main`** — production. Every push to `main` deploys to Vercel
  (`.forgejo/workflows/deploy.yaml`). **Never push to `main` directly.**
- **`develop`** — integration branch. All feature work merges here first via PR.
  **Never push to `develop` directly.**

Feature branches are cut **from `develop`** and named by type:

```
feat/<scope>      e.g. feat/identity-foundation
fix/<scope>       e.g. fix/seo-canonical
chore/<scope>     e.g. chore/ci-cd-and-scanners
docs/<scope>      e.g. docs/strategy-housekeeping
```

Typical flow:

```bash
git fetch
git checkout develop
git pull --ff-only
git checkout -b feat/<scope>
# ...work, commit...
git push -u origin feat/<scope>   # (and the webforx remote, where applicable)
# open a PR against develop
```

Promotion to production is a separate PR from `develop` → `main`, opened by a
maintainer once `develop` is green.

## Commit convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`,
`build`, `style`, `revert`. Examples:

- `feat(auth): add Auth.js v5 credentials + email providers`
- `chore(ci): add CodeQL and gitleaks scanners`
- `fix(seo): correct hreflang for removed locales`

Co-author trailers are encouraged where work was paired.

## Pull requests

- **One scoped group per PR.** Keep diffs reviewable.
- Use the PR template (`.github/pull_request_template.md`). Fill in **every**
  section, including the pasted quality-gate output.
- Target `develop`.
- **Review SLA: 24 hours.** Reviewers ack within one business day; authors
  address feedback promptly to keep `develop` moving.
- A PR is mergeable only when CI is green and at least one reviewer approves.

## Quality gate (run before opening a PR)

```bash
pnpm install
pnpm -F @apexpredix/db generate
pnpm -F @apexpredix/web typecheck
pnpm -F @apexpredix/web lint
pnpm -F @apexpredix/web test
```

All must pass. CI runs the same gate plus an e2e smoke test, CodeQL, and a
gitleaks secret scan on every PR and on pushes to `main`/`develop`.

## Pre-commit checklist

Before every commit, run through this checklist:

- Do not commit secrets, tokens, private keys, `.env.local`, `.env.*` with real
  values, or local CLI credential caches.
- Do not commit `apps/web/.vercelrc.json`; it can contain a live Vercel token.
- Do not commit generated local artefacts such as `.next/`, `dist/`, coverage
  reports, Playwright reports, local media renders, or exported strategy decks.
- Run `git status --short` and inspect every staged path before committing.
- Run gitleaks locally when touching config, deploy, auth, billing, or provider
  code: `gitleaks detect --source . --config .gitleaks.toml --no-git`.

## Guardrails

- **No secrets in the repo.** Secrets live in the 1Password / Doppler vault
  (`docs/runbooks/`). `apps/web/.env.example` documents every key by name only.
- **Positioning.** ApexPredict is a value-bet signal service, not an oracle.
  Never add copy that claims outcome certainty, guaranteed results, or future
  returns. Calibrated probabilities and edge-vs-market only.
- **18+ / responsible gambling** language stays intact wherever it exists.
- **Don't add a new vendor SDK** or large dependency without justifying its
  bundle-size and license in the PR body.
