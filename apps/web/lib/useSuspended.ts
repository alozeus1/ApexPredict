'use client';

/**
 * Client hook for UI surfaces that need to suppress picks while self-exclusion
 * or account suspension is active.
 */
import { useMemo } from 'react';
import { isSuspended, type SuspendableUser } from './auth-guards';

export function useSuspended(user: SuspendableUser | null | undefined) {
  return useMemo(() => isSuspended(user), [user]);
}
