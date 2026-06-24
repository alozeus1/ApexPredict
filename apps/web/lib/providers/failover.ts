/**
 * Provider failover state machine. Keeps a local hot cache and mirrors health
 * state to Upstash Redis so serverless instances converge on the same provider.
 */
import * as Sentry from '@sentry/nextjs';
import { kv } from '@vercel/kv';

const COOLDOWN_MS = 30 * 60 * 1000;
const FAILURE_THRESHOLD = 3;

interface ProviderHealth {
  consecutivePrimaryFailures: number;
  active: 'primary' | 'secondary';
  retryPrimaryAt: number | null;
  updatedAt: number;
}

const memory = new Map<string, ProviderHealth>();

function initialState(): ProviderHealth {
  return {
    consecutivePrimaryFailures: 0,
    active: 'primary',
    retryPrimaryAt: null,
    updatedAt: Date.now(),
  };
}

function key(name: string) {
  return `provider:health:${name}`;
}

function shouldCountFailure(error: unknown) {
  const status =
    typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
      ? error.status
      : undefined;
  return status === undefined || (status >= 400 && status <= 599);
}

async function readState(name: string): Promise<ProviderHealth> {
  const cached = memory.get(name);
  if (cached) return cached;
  try {
    const remote = await kv.get<ProviderHealth>(key(name));
    if (remote) {
      memory.set(name, remote);
      return remote;
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'provider.failover.read', provider: name } });
  }
  const state = initialState();
  memory.set(name, state);
  return state;
}

async function writeState(name: string, state: ProviderHealth) {
  const next = { ...state, updatedAt: Date.now() };
  memory.set(name, next);
  try {
    await kv.set(key(name), next, { ex: 60 * 60 });
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'provider.failover.write', provider: name } });
  }
}

function warnSwitch(name: string, from: 'primary' | 'secondary', to: 'primary' | 'secondary') {
  Sentry.captureMessage(`Provider ${name} switched from ${from} to ${to}`, {
    level: 'warning',
    tags: { area: 'provider.failover', provider: name, from, to },
  });
}

export function resetFailoverMemoryForTests() {
  memory.clear();
}

export async function withFailover<T>(
  name: string,
  primary: () => Promise<T>,
  secondary: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const state = await readState(name);

  if (state.active === 'secondary' && state.retryPrimaryAt && state.retryPrimaryAt > now) {
    return secondary();
  }

  try {
    const result = await primary();
    if (state.active === 'secondary') warnSwitch(name, 'secondary', 'primary');
    await writeState(name, { ...initialState(), active: 'primary' });
    return result;
  } catch (error) {
    if (!shouldCountFailure(error)) throw error;

    const failures = state.consecutivePrimaryFailures + 1;
    if (failures >= FAILURE_THRESHOLD) {
      if (state.active !== 'secondary') warnSwitch(name, 'primary', 'secondary');
      await writeState(name, {
        consecutivePrimaryFailures: failures,
        active: 'secondary',
        retryPrimaryAt: now + COOLDOWN_MS,
        updatedAt: now,
      });
      return secondary();
    }

    await writeState(name, { ...state, consecutivePrimaryFailures: failures, updatedAt: now });
    throw error;
  }
}
