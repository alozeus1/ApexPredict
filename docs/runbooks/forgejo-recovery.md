# Forgejo Recovery Runbook

**When to use:** push to `webforx-ssh` or HTTPS `webforx` fails with one of:

- `ssh: connect to host git.edusuc.net port 22: No route to host`
- `ssh: connect to host git.edusuc.net port 22: Connection timed out`
- `fatal: unable to access 'https://git.edusuc.net/...': The requested URL returned error: 403`
- `fatal: Authentication failed for 'https://git.edusuc.net/...'`

This runbook walks through diagnosis, gives you a "ship anyway" fallback via GitHub, and tells you what to do once Forgejo is back.

---

## Step 1 — Diagnose (5 minutes, four commands)

Run these from your local terminal and capture the output:

```bash
# 1) DNS — does the hostname resolve at all?
nslookup git.edusuc.net

# 2) Reachability — does anything answer on the public ports?
timeout 5 nc -zv git.edusuc.net 22  ; echo "ssh exit=$?"
timeout 5 nc -zv git.edusuc.net 443 ; echo "https exit=$?"

# 3) HTTPS handshake — does the TLS layer come up?
curl -v --max-time 5 https://git.edusuc.net 2>&1 | head -20

# 4) SSH key offered to the server (skips repo auth, just tests the connection)
ssh -vT -o ConnectTimeout=5 -o BatchMode=yes git@git.edusuc.net 2>&1 | head -30
```

Interpret the results with this table:

| Pattern | Cause | Action |
|---|---|---|
| `nslookup` returns no IP / NXDOMAIN | DNS broken or domain expired | Ask the Forgejo admin if the host has moved. Check status page. If domain truly expired, mirror to GitHub permanently. |
| DNS resolves; both `nc` calls time out | Server down OR firewall blocking your IP | Try from a phone hotspot (different network). If it works on cellular but not Wi-Fi, your ISP/router is the cause. |
| HTTPS comes up, SSH 22 times out | Server is up but port 22 is firewalled | Push via HTTPS instead. See "Step 3 — HTTPS fallback". |
| SSH key offered but server says `Permission denied (publickey)` | Deploy key removed or has read-only access | Re-add the deploy key (see `docs/runbooks/forgejo-access.md`); make sure "Allow write access" is checked. |
| HTTPS returns 401/403 with a valid token | Token revoked, expired, or scope wrong | Generate a new token: Forgejo → Settings → Applications → Generate New Token → scopes `repository:read` + `repository:write` → store in vault. |

---

## Step 2 — Ship to GitHub right now, retry Forgejo later

Pushing to `origin` (GitHub) is unaffected by Forgejo's status. If your branch landed on GitHub but not Forgejo, you can keep working:

```bash
# Verify what's on GitHub
git log --oneline origin/docs/2026-06-07-s1-backlog-and-master-prompt -1

# Open the GitHub PR
open "https://github.com/alozeus1/ApexPredict/compare/main...docs/2026-06-07-s1-backlog-and-master-prompt"
```

Review and merge there. **This is acceptable temporarily** — the GitHub mirror is the same commit history as Forgejo. When Forgejo is back, we mirror.

---

## Step 3 — HTTPS fallback (when SSH port 22 is blocked but HTTPS works)

Generate a Forgejo personal access token:

1. `https://git.edusuc.net/user/settings/applications` → **Generate New Token**.
2. Name: `cowork-cto-https-push-<YYYY-MM-DD>`.
3. Scopes: **repository:read** + **repository:write** only.
4. Expiry: 90 days.
5. Copy the token (it's only shown once).

Add a credential-stuffed HTTPS remote:

```bash
TOKEN='ghs_xxxxxxxxxxxxxxxx'   # paste; do NOT commit
git remote remove webforx-https 2>/dev/null
git remote add webforx-https "https://x-token-auth:${TOKEN}@git.edusuc.net/WEBFORX/apexpredict-platform.git"
git push -u webforx-https docs/2026-06-07-s1-backlog-and-master-prompt
unset TOKEN
```

The token is in the remote URL on disk after the push — secure it with the OS keychain (`git config --global credential.helper osxkeychain` on macOS) and rotate quarterly.

---

## Step 4 — Re-mirror to Forgejo once it's back

When Forgejo comes back online:

```bash
# Sync everything on origin → webforx-ssh
git fetch origin
git push webforx-ssh main:main develop:develop

# Push every feature branch that exists on origin but not on webforx
for b in $(git branch -r | grep '^  origin/' | grep -v 'HEAD' | sed 's|origin/||'); do
  git push webforx-ssh "origin/$b:refs/heads/$b" 2>&1 | head -3
done
```

Then re-open any PR that originally targeted Forgejo. The commit SHAs are identical, so reviews and approvals on the GitHub PR transfer mentally — but Forgejo's PR record is the audit trail you want for compliance.

---

## Step 5 — Tell the daily-sync task what's going on

The scheduled task `apexpredict-daily-repo-sync` fetches from `webforx`. While Forgejo is down, those fetches will fail silently. Two options:

- **Do nothing.** The task is set to `stop and tell the user` on remote failure. It won't damage anything; you'll see one report a day saying "Forgejo unreachable."
- **Switch the task to fetch from origin temporarily.** Edit the task at `/Users/ocheme/Documents/Claude/Scheduled/apexpredict-daily-repo-sync/SKILL.md` — replace `webforx` with `origin` in the fetch commands. Revert when Forgejo is back.

---

## Step 6 — Decision: is Forgejo permanently down?

If Step 1 shows the domain is gone (NXDOMAIN that doesn't recover within 48h), or the admin tells you the instance is retired:

1. Make GitHub the canonical remote. Rename remotes:

   ```bash
   git remote rename origin webforx-old   # archived
   git remote rename webforx webforx-old-https
   git remote add origin https://github.com/alozeus1/ApexPredict.git   # adjust if a WebForx-owned GitHub org is created
   ```

2. Update every doc referencing `webforx` / forgejo. Top of the list:

   - `README.md` (Forgejo deploy workflow + remote instructions)
   - `docs/strategy/2026-06-04-apexpredict-strategy.md`
   - `docs/runbooks/forgejo-access.md`
   - `docs/runbooks/bootstrap-push.sh` + `bootstrap-push-s1.sh`
   - `.forgejo/workflows/*` — port to `.github/workflows/` if not already.
   - Backlog Status updates: `E00-S2-T6` (branch protection on `main`) reassigned from Forgejo UI to GitHub.

3. Notify the team via the next stakeholder update.

4. Get a WebForx-owned GitHub org so the canonical repo isn't on a personal account.
