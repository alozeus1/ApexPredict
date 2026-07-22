#!/usr/bin/env bash
# Pushes the safe-locale fix to BOTH remotes (GitHub + Forgejo).
# Run once from your local terminal:
#   cd /Users/ocheme/Desktop/ApexPredict
#   bash docs/runbooks/push-safe-locale-fix.sh
#
# Vercel auto-deploys on GitHub push, so the prod predictions page should
# unblock within ~2 minutes of this script completing.
set -euo pipefail

REPO="/Users/ocheme/Desktop/ApexPredict"
BRANCH="fix/safe-locale-date-format"

cd "$REPO"

# --- 0. Clear stale locks ---
if [[ -f .git/index.lock ]]; then
  rm -f .git/index.lock
  echo "Removed stale .git/index.lock"
fi

# --- 1. Make sure we're on the fix branch (created earlier in the session) ---
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  # Fall back: rebuild the branch off develop
  git checkout develop
  git pull --ff-only origin develop
  git checkout -b "$BRANCH"
fi

# --- 2. Stage only the locale-fix files ---
git add apps/web/lib/format/date.ts \
        apps/web/lib/format/__tests__/date.test.ts \
        apps/web/components/match/MatchCard.tsx \
        apps/web/components/match/MatchDetail.tsx \
        "apps/web/app/[locale]/dashboard/page.tsx"

if git diff --cached --quiet; then
  echo "Nothing new to commit (already committed)."
else
  git -c user.name="Godwill" -c user.email="alozeus1@gmail.com" \
    commit -m "fix(format): wrap Intl.DateTimeFormat to fall back to en on invalid locale

Production was throwing RangeError: Incorrect locale information provided
from new Intl.DateTimeFormat(locale, ...) at render time on /[locale]/predictions.
That crash short-circuited the page and forced React to fall through to the
static fixtures.json data (featured-1/2/3), which the user perceived as
\"stale predictions\".

Root cause: any locale string the Node Intl runtime cannot resolve (empty,
undefined, or unsupported BCP-47 tag) makes the constructor throw synchronously.
Three call sites were affected: MatchCard, MatchDetail, dashboard list.

Fix: lib/format/date.ts exposes safeDateTimeFormat + safeFormatDate. Both
try the requested locale and fall back to 'en' on RangeError; both treat
null/undefined/empty as 'en' implicitly; safeFormatDate also guards against
unparseable date input. All three call sites switched over. Unit tests
cover empty, null, undefined, nonsense-locale, and unparseable-date.

This is a defensive change — it does NOT re-enable any disabled locale.
The locale-gate policy (yo/ha/ig stay off) is unchanged.

Co-authored-by: Cowork CTO Agent <cto-agent@webforx.global>"
fi

# --- 3. Push to GitHub (triggers Vercel deploy) ---
echo ""
echo "Pushing to origin (GitHub)..."
git push -u origin "$BRANCH"

# --- 4. Push to Forgejo (canonical mirror) ---
echo ""
echo "Pushing to webforx-ssh (Forgejo)..."
if git remote get-url webforx-ssh >/dev/null 2>&1; then
  if git push -u webforx-ssh "$BRANCH"; then
    echo "  Forgejo push OK."
  else
    echo "  Forgejo push FAILED. See docs/runbooks/forgejo-recovery.md."
    echo "  GitHub push already succeeded — Vercel will redeploy from there."
  fi
else
  echo "  webforx-ssh remote not configured. Skipping Forgejo push."
fi

echo ""
echo "============================================"
echo "  Done. Open the GitHub PR:"
echo "    https://github.com/alozeus1/ApexPredict/compare/main...$BRANCH"
echo ""
echo "  Vercel will auto-deploy on PR merge to main."
echo "  (Or merge directly to develop, then promote develop -> main for prod.)"
echo "============================================"
