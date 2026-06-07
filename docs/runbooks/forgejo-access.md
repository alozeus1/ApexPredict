# Forgejo Access — SSH Deploy Key Handoff

**Audience:** Web Forx Global Inc. — repo owner (Godwill)
**Purpose:** Grant Cowork (CTO advisor) push access to the `webforx` remote so that branches and PRs can be pushed automatically.

---

## Recommended path — SSH deploy key

A deploy key is scoped to a single repository. It is the safest way to grant push access without sharing a personal account or creating a new human user.

### Step 1 — On your local machine, generate a dedicated ed25519 keypair

```bash
ssh-keygen -t ed25519 \
  -C "cowork-cto@apexpredict-platform" \
  -f ~/.ssh/apexpredict_cowork_ed25519 \
  -N ""
```

This creates two files:

- `~/.ssh/apexpredict_cowork_ed25519` — **private key, never share, never commit**
- `~/.ssh/apexpredict_cowork_ed25519.pub` — public key (safe to share)

### Step 2 — Add the public key as a deploy key in Forgejo

1. Open `https://git.edusuc.net/WEBFORX/apexpredict-platform`
2. **Settings → Deploy Keys → Add Deploy Key**
3. **Title:** `Cowork CTO advisor (2026-06-04)`
4. **Content:** paste the full contents of `~/.ssh/apexpredict_cowork_ed25519.pub`
5. **Allow write access:** ✅ **Check this box.** Without it, the key is read-only.
6. **Add Key**

### Step 3 — Share the private key with me, securely

Three options — choose one:

**Option A (preferred): 1Password / Doppler vault.**
- Add a new secret to the `bootstrap` vault named `forgejo-deploy-key-cowork`.
- Paste the contents of `~/.ssh/apexpredict_cowork_ed25519` (the private key).
- Share the vault item with my advisor email or grant me read access to the `bootstrap` vault.

**Option B: paste into our session as an attached `.txt` file.** Less ideal because chat transcripts may be retained, but acceptable for a one-off if the key is dedicated to this repo and easily rotatable. Drag the private-key file into the chat — *do not paste the contents inline as text.*

**Option C: GPG-encrypted attachment.** If you prefer, encrypt the private key against my public PGP key (I'll share my key fingerprint on request) and drop the `.gpg` file in the workspace folder.

### Step 4 — Verify

After I receive the key, I'll run:

```bash
ssh -i ~/.ssh/apexpredict_cowork_ed25519 -T git@git.edusuc.net
```

If the response is `Hi there, ...! You've successfully authenticated, but ...`, the key works. I'll then add a `webforx-ssh` remote:

```bash
git remote add webforx-ssh git@git.edusuc.net:WEBFORX/apexpredict-platform.git
```

And use `webforx-ssh` for pushes while keeping the HTTPS `webforx` remote for fetches.

---

## Fallback path — HTTPS personal access token

Use this only if SSH is blocked by your network or you can't generate the keypair locally.

1. In Forgejo, **Settings → Applications → Generate New Token**.
2. **Name:** `Cowork CTO advisor — apexpredict-platform`
3. **Scopes:** `repository:read`, `repository:write`. **No other scopes.**
4. **Expiry:** 90 days (we'll rotate).
5. Copy the token and share via the same vault path as Option A above.
6. I'll configure the remote URL as `https://x-token-auth:<TOKEN>@git.edusuc.net/WEBFORX/apexpredict-platform.git`.

The HTTPS token route is less safe (the token is repository-write on *every* repo your account can access if user-scope, so use a deploy-only token if Forgejo supports it; otherwise prefer SSH).

---

## What I will and won't do with the key

**Will:**
- Push feature branches (never direct to `main`).
- Open pull requests targeting `develop`.
- Fetch via `git pull --ff-only` in the daily 07:25 sync task.

**Will not:**
- Force-push, rebase, or rewrite history on `main` or `develop`.
- Add or remove other deploy keys.
- Push secrets, large binaries, or anything not committed via a review.
- Use the key from any machine other than this Cowork sandbox.

---

## Rotation

I'll prompt you to rotate the deploy key every 90 days. Rotation procedure: regenerate ed25519, add new public key to Forgejo, remove the old one, share new private key via vault. Old key is invalid immediately.

---

## If you ever need to revoke

1. Forgejo: Settings → Deploy Keys → Delete the `Cowork CTO advisor` row.
2. Tell me; I'll wipe the private key from my sandbox and confirm.
3. We assume any commits I push are signed-off by you via PR review — revoking the key does not invalidate prior commits, only prevents future ones.

---

## Quick reference

| Action | Where | Cost |
|---|---|---|
| Generate ed25519 keypair | Your terminal | 30 sec |
| Add deploy key to Forgejo | Web UI | 2 min |
| Share private key | Vault | 2 min |
| Verify on my side | Sandbox | 1 min |

Total: ~5 minutes of your time.
