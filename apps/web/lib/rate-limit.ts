import { kv } from '@vercel/kv';

export interface RateLimitResult { ok: boolean; remaining: number; }
export interface RateLimitOpts { limit: number; windowSec: number; }

export async function checkRateLimit(scope: string, key: string, opts: RateLimitOpts): Promise<RateLimitResult> {
  const bucketKey = `rl:${scope}:${key}`;
  const m = kv.multi();
  m.incr(bucketKey);
  m.expire(bucketKey, opts.windowSec);
  const [count] = (await m.exec()) as [number, number];
  return { ok: count <= opts.limit, remaining: Math.max(0, opts.limit - count) };
}
