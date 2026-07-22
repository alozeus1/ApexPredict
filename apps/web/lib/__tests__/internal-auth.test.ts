import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { idempotencyKey, requireServiceAuth } from '../internal-auth';

const ORIGINAL = { ...process.env };

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function configure(callers: Array<{ id: string; key: string; scopes: string[] }>) {
  process.env.INTERNAL_SERVICE_KEYS = JSON.stringify(
    callers.map((caller) => ({ id: caller.id, keyHash: hash(caller.key), scopes: caller.scopes })),
  );
}

function req(token?: string, headers: Record<string, string> = {}) {
  return new Request('https://example.test/api/internal/jobs/backtest', {
    method: 'POST',
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
  });
}

beforeEach(() => {
  delete process.env.INTERNAL_SERVICE_KEYS;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('service auth', () => {
  it('fails closed when no callers are configured', async () => {
    // A missing env var is a deployment error, never an open door.
    const result = requireServiceAuth(req('anything'), 'ingestion:write');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });

  it('fails closed on malformed configuration', () => {
    process.env.INTERNAL_SERVICE_KEYS = 'not json';
    const result = requireServiceAuth(req('anything'), 'ingestion:write');
    expect(result.ok).toBe(false);
  });

  it('rejects a missing or malformed authorization header', () => {
    configure([{ id: 'n8n', key: 'k'.repeat(32), scopes: ['ingestion:write'] }]);
    expect(requireServiceAuth(req(), 'ingestion:write').ok).toBe(false);
    expect(
      requireServiceAuth(
        new Request('https://example.test/x', { headers: { authorization: 'Basic abc' } }),
        'ingestion:write',
      ).ok,
    ).toBe(false);
  });

  it('rejects an unknown key', () => {
    configure([{ id: 'n8n', key: 'k'.repeat(32), scopes: ['ingestion:write'] }]);
    const result = requireServiceAuth(req('wrong-key'), 'ingestion:write');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('accepts a known key holding the scope', () => {
    configure([{ id: 'n8n', key: 'k'.repeat(32), scopes: ['ingestion:write'] }]);
    const result = requireServiceAuth(req('k'.repeat(32)), 'ingestion:write');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.caller.id).toBe('n8n');
  });

  it('separates promotion authority from ingestion authority', () => {
    // The core reason this is not requireCronAuth: an ingestion integration
    // must not be able to change which model serves subscribers.
    configure([{ id: 'ingest-bot', key: 'k'.repeat(32), scopes: ['ingestion:write'] }]);
    const result = requireServiceAuth(req('k'.repeat(32)), 'models:promote');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it('never echoes key material in an error response', async () => {
    configure([{ id: 'n8n', key: 'k'.repeat(32), scopes: ['ingestion:write'] }]);
    const secret = 'super-secret-value-123';
    const result = requireServiceAuth(req(secret), 'ingestion:write');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const body = await result.response.json();
      expect(JSON.stringify(body)).not.toContain(secret);
      expect(JSON.stringify(body)).not.toContain(hash(secret));
      expect(JSON.stringify(body)).not.toContain('keyHash');
    }
  });

  it('isolates callers from each other', () => {
    configure([
      { id: 'a', key: 'a'.repeat(32), scopes: ['ingestion:write'] },
      { id: 'b', key: 'b'.repeat(32), scopes: ['models:promote'] },
    ]);
    const asA = requireServiceAuth(req('a'.repeat(32)), 'models:promote');
    expect(asA.ok).toBe(false);
    const asB = requireServiceAuth(req('b'.repeat(32)), 'models:promote');
    expect(asB.ok).toBe(true);
    if (asB.ok) expect(asB.caller.id).toBe('b');
  });
});

describe('idempotency key', () => {
  it('accepts a well-formed key', () => {
    expect(idempotencyKey(req('t', { 'idempotency-key': 'ingest-2026-07-20-001' }))).toBe(
      'ingest-2026-07-20-001',
    );
  });

  it('rejects absent, short, over-long or unsafe keys', () => {
    expect(idempotencyKey(req('t'))).toBeNull();
    expect(idempotencyKey(req('t', { 'idempotency-key': 'short' }))).toBeNull();
    expect(idempotencyKey(req('t', { 'idempotency-key': 'x'.repeat(201) }))).toBeNull();
    expect(idempotencyKey(req('t', { 'idempotency-key': 'has spaces here' }))).toBeNull();
    expect(idempotencyKey(req('t', { 'idempotency-key': 'drop/../../table' }))).toBeNull();
  });
});
