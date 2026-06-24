/**
 * Billing/admin route auth helpers. Session role is intentionally resolved from
 * the database because Auth.js database sessions do not currently expose role.
 */
import { prisma, type UserRole } from '@apexpredix/db';
import { auth } from '@/auth';

export interface BillingUser {
  id: string;
  email: string;
  role: UserRole;
}

export async function getCurrentBillingUser(): Promise<BillingUser | null> {
  const session = await auth().catch(() => null);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;

  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });
}

export async function requireAdminBillingUser(): Promise<BillingUser | null> {
  const user = await getCurrentBillingUser();
  return user?.role === 'ADMIN' ? user : null;
}
