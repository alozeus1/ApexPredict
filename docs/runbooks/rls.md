# Row-Level Security Draft Runbook

## Scope

`packages/db/sql/rls/2026-06-07-user-scoped-rls.sql` is a draft. It is not applied by migrations in this sprint.

## Apply Manually

After app request auth-context wiring lands, apply from a reviewed shell:

```sh
psql "$DATABASE_URL" -f packages/db/sql/rls/2026-06-07-user-scoped-rls.sql
```

## Request Context

Future request middleware must set:

```sql
SET LOCAL app.user_id = '<authenticated-user-id>';
```

The placeholder helper is `apps/web/lib/db/auth-context.ts`. It is intentionally not wired into middleware yet.

## Rollback

Disable policies explicitly if app traffic cannot set `app.user_id`:

```sql
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPick" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" DISABLE ROW LEVEL SECURITY;
```
