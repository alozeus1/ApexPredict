import { prisma, type Prisma } from '@apexpredix/db';

/**
 * Append an immutable audit-log row. Pass a transaction client when auditing a
 * write so the log and the write commit atomically; otherwise it runs standalone
 * against the shared client.
 *
 * Convention: `actor` is namespaced — `user:<id>`, `system:<job>`, `admin:<id>`.
 * `action` is dotted — e.g. `auth.signup`, `auth.login.success`, `auth.lockout`.
 */
export async function logAudit(
  actor: string,
  action: string,
  target: string,
  meta: Record<string, unknown> = {},
  client: Prisma.TransactionClient = prisma,
): Promise<void> {
  await client.auditLog.create({
    data: { actor, action, target, meta: meta as Prisma.InputJsonValue },
  });
}
