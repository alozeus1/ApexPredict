import { describe, it, expect, vi, beforeEach } from 'vitest';

const incr = vi.fn();
const expire = vi.fn();
const exec = vi.fn().mockResolvedValue([3, 1]);
vi.mock('@vercel/kv', () => ({ kv: { multi: () => ({ incr, expire, exec }) } }));

import { checkRateLimit } from '../rate-limit';

beforeEach(() => { incr.mockClear(); expire.mockClear(); exec.mockClear(); });

describe('checkRateLimit', () => {
  it('allows under-limit requests and reports remaining', async () => {
    exec.mockResolvedValueOnce([3, 1]);
    const res = await checkRateLimit('test', 'ip-1', { limit: 5, windowSec: 3600 });
    expect(res.ok).toBe(true);
    expect(res.remaining).toBe(2);
  });
  it('blocks over-limit requests', async () => {
    exec.mockResolvedValueOnce([6, 1]);
    const res = await checkRateLimit('test', 'ip-2', { limit: 5, windowSec: 3600 });
    expect(res.ok).toBe(false);
    expect(res.remaining).toBe(0);
  });
});
