# Secrets Incident Response

Use this runbook when any credential, token, private key, `.env.local`, or local
CLI credential cache is committed, pushed, pasted into an issue, or exposed in a
build log.

## 1. Contain

1. Stop deploys from the affected branch.
2. Do not reuse the exposed secret for further testing.
3. Capture the commit SHA, branch, file path, exposure time, and affected
   service in the incident notes.

## 2. Rotate

1. Rotate the secret in the source system first.
2. Update the vault entry after rotation.
3. Update Vercel, Forgejo, GitHub Actions, or local ignored `.env` files from
   the vault only.
4. Revoke the exposed value and verify the old value no longer authenticates.

## 3. Purge

1. Remove the secret from the working tree.
2. If the secret reached a shared remote, coordinate a history purge with the
   repo owner. Do not force-push without explicit approval.
3. Delete any exposed CI logs or artefacts where the platform supports it.
4. Re-run gitleaks against the cleaned branch.

## 4. Audit

1. Review provider audit logs for use of the exposed value.
2. Check deploy logs, webhook logs, and API logs for suspicious calls.
3. Record whether the secret had read-only, write, admin, billing, or production
   access.

## 5. Notify

1. Notify the CTO and SRE owner with impact, rotation status, and evidence.
2. Notify legal/DPO if customer data, production billing, or regulated data may
   have been exposed.
3. Add a follow-up ticket for prevention work if the existing guardrails missed
   the file type.

## Vercel CLI Token Cache

`apps/web/.vercelrc.json` is local-only and must never be committed. It can hold
a live Vercel token. If it is exposed, rotate the Vercel token manually in the
Vercel dashboard or CLI, then verify both gitleaks and `.gitignore` block the
file from recurring.
