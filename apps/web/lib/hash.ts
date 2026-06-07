const enc = new TextEncoder();

async function hmacHex(secret: string, input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(input));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison for equal-length hex digests. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Hash PII for at-rest storage. Encoding always uses HASH_SECRET_PRIMARY.
 * @throws if HASH_SECRET_PRIMARY is not configured.
 */
export async function hashPII(input: string): Promise<string> {
  const secret = process.env.HASH_SECRET_PRIMARY;
  if (!secret) throw new Error('HASH_SECRET_PRIMARY env var is required');
  return hmacHex(secret, input);
}

/**
 * Verify a plaintext value against a stored hash with primary→secondary
 * fallback. New writes are hashed under HASH_SECRET_PRIMARY; values written
 * under a previous key still verify while HASH_SECRET_SECONDARY holds that old
 * key. This enables zero-downtime key rotation: promote new→primary, keep
 * old→secondary until all stored hashes are re-encoded, then drop secondary.
 *
 * @throws if HASH_SECRET_PRIMARY is not configured.
 */
export async function verifyHashedPII(input: string, storedHash: string): Promise<boolean> {
  const primary = process.env.HASH_SECRET_PRIMARY;
  if (!primary) throw new Error('HASH_SECRET_PRIMARY env var is required');

  if (timingSafeEqualHex(await hmacHex(primary, input), storedHash)) return true;

  const secondary = process.env.HASH_SECRET_SECONDARY;
  if (secondary && timingSafeEqualHex(await hmacHex(secondary, input), storedHash)) return true;

  return false;
}
