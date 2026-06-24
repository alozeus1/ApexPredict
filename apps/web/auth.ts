import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { prisma } from '@apexpredix/db';
import { verifyPassword } from '@/lib/password';
import { logAudit } from '@/lib/audit';

/**
 * Auth.js v5 configuration. Providers: Credentials + Email (Resend) + Google,
 * backed by the Prisma adapter with database sessions.
 *
 * NOTE: the spec mandates `session.strategy: 'database'`. Email + Google work
 * fully under database sessions. The Credentials provider is scaffolded here so
 * the surface compiles and the login form has a handler, but Auth.js does not
 * persist a DB Session for credential logins out of the box (credentials assume
 * JWT). Completing credential login under database sessions (manual Session row
 * creation on success) is a tracked follow-up. No live signups run in this PR.
 *
 * This module imports argon2 (native) + the Prisma adapter, so it must only run
 * in the Node.js runtime — never import it into edge middleware.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  pages: { signIn: '/login', verifyRequest: '/verify-email', error: '/login' },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY ?? '',
      from: process.env.RESEND_FROM_ADDRESS ?? 'ApexPredict AI <noreply@mail.apexpredix.ai>',
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === 'string' ? credentials.email.toLowerCase() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.disabledAt) {
          await logAudit(`user:${user?.id ?? 'unknown'}`, 'auth.login.fail', email).catch(() => {});
          return null;
        }
        const ok = await verifyPassword(user.passwordHash, password);
        if (!ok) {
          await logAudit(`user:${user.id}`, 'auth.login.fail', `user:${user.id}`).catch(() => {});
          return null;
        }
        await logAudit(`user:${user.id}`, 'auth.login.success', `user:${user.id}`).catch(() => {});
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
