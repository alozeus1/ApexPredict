/**
 * Placeholder for future PostgreSQL app.user_id request context wiring. Not
 * connected to middleware until RLS moves from draft to active enforcement.
 */
import type { Prisma, PrismaClient } from '@apexpredix/db';

export async function setAuthContext(prisma: PrismaClient | Prisma.TransactionClient, userId: string) {
  await prisma.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
}
