import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isDemoDataEnabled } from '../demo-mode';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

const ORIGINAL = { ...process.env };

function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

beforeEach(() => {
  setEnv({ ALLOW_DEMO_FIXTURES: undefined, VERCEL_ENV: undefined, NODE_ENV: 'test' });
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('isDemoDataEnabled', () => {
  it('is off by default', () => {
    expect(isDemoDataEnabled()).toBe(false);
  });

  it('is off when the flag is absent even in development', () => {
    setEnv({ NODE_ENV: 'development' });
    expect(isDemoDataEnabled()).toBe(false);
  });

  it('can be enabled explicitly in development', () => {
    setEnv({ NODE_ENV: 'development', ALLOW_DEMO_FIXTURES: 'true' });
    expect(isDemoDataEnabled()).toBe(true);
  });

  it('is NEVER enabled in production, even if the flag is set', () => {
    // The whole point of the gate: a stray env var must not be able to put
    // fabricated fixtures in front of paying subscribers.
    setEnv({ VERCEL_ENV: 'production', ALLOW_DEMO_FIXTURES: 'true' });
    expect(isDemoDataEnabled()).toBe(false);
  });

  it('is not enabled by a production build outside preview', () => {
    setEnv({ NODE_ENV: 'production', ALLOW_DEMO_FIXTURES: 'true' });
    expect(isDemoDataEnabled()).toBe(false);
  });

  it('allows preview deployments to opt in', () => {
    setEnv({ NODE_ENV: 'production', VERCEL_ENV: 'preview', ALLOW_DEMO_FIXTURES: 'true' });
    expect(isDemoDataEnabled()).toBe(true);
  });

  it('rejects any value other than the exact string "true"', () => {
    for (const value of ['1', 'yes', 'TRUE', 'on']) {
      setEnv({ NODE_ENV: 'development', ALLOW_DEMO_FIXTURES: value });
      expect(isDemoDataEnabled()).toBe(false);
    }
  });
});
