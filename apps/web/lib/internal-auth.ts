import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * Service authentication for internal job endpoints (n8n and similar callers).
 *
 * Deliberately NOT `requireCronAuth`. That checks a single shared `CRON_SECRET`
 * with no caller identity, which is adequate for Vercel's own scheduler but
 * wrong here:
 *
 *   - audit rows would all read "cron", so a bad promote could not be traced
 *   - revoking one integration would revoke the scheduler too
 *   - every caller would hold the authority to promote and roll back models
 *
 * Callers therefore present their own key and receive only the scopes that key
 * carries. Model promotion is a separate scope from ingestion on purpose.
 */

export type ServiceScope =
  | 'ingestion:write'
  | 'training:write'
  | 'backtest:write'
  | 'models:shadow'
  | 'models:promote'
  | 'models:rollback'
  | 'health:read'
  | 'reports:read'
  | 'jobs:read';

export interface ServiceCaller {
  id: string;
  scopes: ServiceScope[];
}

/**
 * Callers are configured as `INTERNAL_SERVICE_KEYS`, a JSON array of
 * `{ id, keyHash, scopes }`. Only the SHA-256 hash of each key is stored, so a
 * leaked environment does not hand over usable credentials.
 *
 * Generate a hash with:
 *   node -e "console.log(require('crypto').createHash('sha256').update('YOUR_KEY').digest('hex'))"
 */
interface ConfiguredCaller {
  id: string;
  keyHash: string;
  scopes: ServiceScope[];
}

function configuredCallers(): ConfiguredCaller[] {
  const raw = process.env.INTERNAL_SERVICE_KEYS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ConfiguredCaller[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A malformed value must not silently disable auth.
    return [];
  }
}

function hashKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Constant-time comparison. Avoids leaking key material through timing. */
function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type AuthResult =
  | { ok: true; caller: ServiceCaller }
  | { ok: false; response: NextResponse };

function deny(status: number, error: string): AuthResult {
  // Never echo the presented key, the expected hash, or the caller list.
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

/**
 * Authenticates a service caller and checks a required scope.
 *
 * Fails closed: no configuration means no access, in every environment. A
 * missing `INTERNAL_SERVICE_KEYS` is a deployment error, not an open door.
 */
export function requireServiceAuth(request: Request, scope: ServiceScope): AuthResult {
  const callers = configuredCallers();
  if (callers.length === 0) return deny(503, 'internal service auth is not configured');

  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return deny(401, 'missing bearer token');

  const presented = hashKey(header.slice('Bearer '.length).trim());
  const caller = callers.find((candidate) => safeEqual(candidate.keyHash, presented));
  if (!caller) return deny(401, 'unknown service caller');

  if (!caller.scopes.includes(scope)) {
    // 403 rather than 401: the caller is known, the authority is not granted.
    return deny(403, `caller lacks required scope: ${scope}`);
  }

  return { ok: true, caller: { id: caller.id, scopes: caller.scopes } };
}

/**
 * Idempotency key from the request.
 *
 * Required for every mutating job endpoint. n8n retries on timeout, and without
 * a key a retry would start a second ingestion run or promote a model twice.
 */
export function idempotencyKey(request: Request): string | null {
  const key = request.headers.get('idempotency-key')?.trim();
  if (!key) return null;
  if (key.length < 8 || key.length > 200) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(key)) return null;
  return key;
}
