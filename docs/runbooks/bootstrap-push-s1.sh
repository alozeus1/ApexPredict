#!/usr/bin/env bash
#
# bootstrap-push-s1.sh
#
# Commits the S0 retrospective + S1 backlog/master-prompt docs and pushes
# the branch to BOTH remotes (webforx-ssh on Forgejo + origin on GitHub).
#
# Run once from your local terminal:
#   cd /Users/ocheme/Desktop/ApexPredict
#   bash docs/runbooks/bootstrap-push-s1.sh
#
# Safe to re-run. Will skip steps that are already done.
#
set -euo pipefail

REPO="/Users/ocheme/Desktop/ApexPredict"
BRANCH="docs/2026-06-07-s1-backlog-and-master-prompt"
PRIVATE_KEY="$HOME/.ssh/apexpredict_cowork_ed25519"

cd "$REPO"

# ---------- 0. Sanity: SSH key for Forgejo ----------
if [[ ! -f "$PRIVATE_KEY" ]]; then
  echo "WARNING: deploy key not at $PRIVATE_KEY"
  echo "         Forgejo push will fail. GitHub push will still work."
  echo ""
fi

# ---------- 1. Stale lockfiles ----------
# LibreOffice leaves these when an .xlsx is still open. They must be gone before
# we add the strategy folder, or git will pick them up.
LOCK_PATTERN='docs/strategy/.~lock.*#'
if compgen -G "$LOCK_PATTERN" > /dev/null; then
  echo "Removing LibreOffice lockfile(s):"
  for f in $LOCK_PATTERN; do
    echo "  $f"
  done
  echo ""
  echo "Make sure the XLSX is CLOSED in LibreOffice/Excel before continuing."
  read -p "  Press Enter to delete the lockfiles and continue, or Ctrl+C to abort. "
  rm -f $LOCK_PATTERN
fi

# Also clear a stale git index lock from any previous session.
if [[ -f .git/index.lock ]]; then
  rm -f .git/index.lock
  echo "Removed stale .git/index.lock"
fi

# ---------- 2. Branch ----------
# If the branch already exists locally, switch to it; otherwise create from
# whatever we're on now (most likely main).
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
  echo "Switched to existing branch $BRANCH"
else
  git checkout -b "$BRANCH"
  echo "Created branch $BRANCH"
fi

# ---------- 3. Stage + commit ----------
git add docs/strategy/2026-06-04-apexpredict-backlog.md \
        docs/strategy/2026-06-04-apexpredict-backlog.xlsx \
        docs/strategy/2026-06-04-apexpredict-strategy.md \
        docs/strategy/2026-06-07-agent-master-prompt-sprint-one.md \
        docs/strategy/2026-06-07-sprint-s1-engineering-backlog.md \
        docs/strategy/2026-06-07-apexpredict-sprint-s1-engineering-backlog.xlsx \
        docs/runbooks/bootstrap-push-s1.sh \
        docs/runbooks/forgejo-recovery.md \
        2>/dev/null || true

if git diff --cached --quiet; then
  echo "Nothing new to commit (files already committed)."
else
  git -c user.name="Cowork (CTO Office)" \
      -c user.email="cto-office@webforx.global" \
      commit -m "docs(strategy): S0 retrospective + S1 readiness gate + S1 engineering backlog

- Backlog v1.2: S0 shipped (23 done); E00-S3-T1..T4 and E01-S2-T1
  reclassified as In flight (human)
- Strategy appendix: S0 retrospective with merge commits; 12-gate S1
  readiness check
- New S1 master prompt for next autonomous agent run (6 PRs,
  ~18 tickets, no vendor keys required)
- New Sprint S1 FE+BE backlog: 3 epics, 15 stories, 79 tasks, 54 points
  with CONTEXT / ACCEPTANCE CRITERIA / DEPENDENCIES & RISKS / DEFINITION OF
  READY checklist / Fibonacci points / parent epic format
- Importable XLSX mirror of the sprint backlog (Stories, Story Detail,
  Tasks, Capacity sheets)"
  echo "Committed pending artefacts."
fi

# ---------- 4. Remotes ----------
# Ensure webforx-ssh remote exists with the right URL
if ! git remote get-url webforx-ssh >/dev/null 2>&1; then
  git remote add webforx-ssh git@git.edusuc.net:WEBFORX/apexpredict-platform.git
  echo "Added webforx-ssh remote"
fi

# ---------- 5. Push ----------
push_ok_webforx=false
push_ok_origin=false

echo ""
echo "Pushing $BRANCH to webforx-ssh (Forgejo)..."
if git push -u webforx-ssh "$BRANCH"; then
  push_ok_webforx=true
else
  echo ""
  echo "  Forgejo push FAILED."
  echo "  Verify SSH key:  ssh -T git@git.edusuc.net"
  echo "  Or run:          bash docs/runbooks/bootstrap-push.sh   (the original S0 bootstrap)"
fi

echo ""
echo "Pushing $BRANCH to origin (GitHub)..."
if git push -u origin "$BRANCH"; then
  push_ok_origin=true
else
  echo ""
  echo "  GitHub push FAILED."
  echo "  Verify your GitHub credentials are set (token in keychain or SSH key for github.com)."
fi

# ---------- 6. Summary ----------
echo ""
echo "============================================="
echo "  Push summary"
echo "============================================="
if [[ "$push_ok_webforx" == true ]]; then
  echo "  Forgejo (webforx-ssh)  ✓ pushed"
  echo "    Open PR: https://git.edusuc.net/WEBFORX/apexpredict-platform/compare/develop...$BRANCH"
else
  echo "  Forgejo (webforx-ssh)  ✗ FAILED"
fi

if [[ "$push_ok_origin" == true ]]; then
  echo "  GitHub  (origin)       ✓ pushed"
  echo "    Open PR: https://github.com/alozeus1/ApexPredict/pull/new/$BRANCH"
else
  echo "  GitHub  (origin)       ✗ FAILED"
fi

echo ""
echo "Open a PR targeting 'develop' (NOT main) on the canonical (Forgejo) repo."
echo "GitHub mirror is a backup — review on Forgejo, merge on Forgejo."
echo ""

# Non-zero exit if neither push succeeded.
if [[ "$push_ok_webforx" == false && "$push_ok_origin" == false ]]; then
  exit 1
fi
exit 0
