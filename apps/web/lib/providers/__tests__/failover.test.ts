import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetFailoverMemoryForTests, withFailover } from '../failover';

const store = new Map<string, unknown>();

vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
      return 'OK';
    }),
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

function providerError(status = 500) {
  return Object.assign(new Error(`provider ${status}`), { status });
}

describe('withFailover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T00:00:00Z'));
    store.clear();
    resetFailoverMemoryForTests();
  });

  it('switches to secondary after three primary failures', async () => {
    const primary = vi.fn().mockRejectedValue(providerError());
    const secondary = vi.fn().mockResolvedValue('secondary');

    await expect(withFailover('fixtures', primary, secondary)).rejects.toThrow('provider 500');
    await expect(withFailover('fixtures', primary, secondary)).rejects.toThrow('provider 500');
    await expect(withFailover('fixtures', primary, secondary)).resolves.toBe('secondary');

    expect(primary).toHaveBeenCalledTimes(3);
    expect(secondary).toHaveBeenCalledTimes(1);
  });

  it('respects the 30-minute cooldown before retrying primary', async () => {
    const primary = vi.fn().mockRejectedValue(providerError());
    const secondary = vi.fn().mockResolvedValue('secondary');

    await withFailover('fixtures', primary, secondary).catch(() => undefined);
    await withFailover('fixtures', primary, secondary).catch(() => undefined);
    await expect(withFailover('fixtures', primary, secondary)).resolves.toBe('secondary');
    await expect(withFailover('fixtures', primary, secondary)).resolves.toBe('secondary');
    expect(primary).toHaveBeenCalledTimes(3);

    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    primary.mockResolvedValueOnce('primary');
    await expect(withFailover('fixtures', primary, secondary)).resolves.toBe('primary');
    expect(primary).toHaveBeenCalledTimes(4);
  });
});
