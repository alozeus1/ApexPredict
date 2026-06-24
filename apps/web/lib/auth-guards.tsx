import type { ReactNode } from 'react';

/** Minimal user shape this guard reads. rgFlags is the Prisma Json column. */
export interface SuspendableUser {
  rgFlags?: { selfExcludedUntil?: string | null } | null;
  disabledAt?: Date | string | null;
}

/** True when the user is self-excluded (cool-off in the future) or disabled. */
export function isSuspended(user: SuspendableUser | null | undefined): boolean {
  if (!user) return false;
  if (user.disabledAt) return true;
  const until = user.rgFlags?.selfExcludedUntil ? new Date(user.rgFlags.selfExcludedUntil) : null;
  return until !== null && !Number.isNaN(until.getTime()) && until.getTime() > Date.now();
}

/**
 * Server-component guard. Returns a banner element when the user is in a
 * self-exclusion / cool-off period (or disabled), in which case all picks UI
 * should be suppressed; returns null otherwise.
 */
export function assertNotSuspended(user: SuspendableUser | null | undefined): ReactNode | null {
  if (!isSuspended(user)) return null;
  const until = user?.rgFlags?.selfExcludedUntil ? new Date(user.rgFlags.selfExcludedUntil) : null;
  return (
    <div
      role="alert"
      className="rounded-2xl border border-edge-amber/30 bg-edge-amber/10 px-5 py-4 text-sm text-edge-amber"
    >
      Your account is in a self-exclusion or cool-off period. Picks are hidden
      {until ? ` until ${until.toLocaleDateString()}` : ''}. If you need support, visit our{' '}
      <a className="underline" href="/legal/responsible-gaming">responsible-gaming page</a>.
    </div>
  );
}
