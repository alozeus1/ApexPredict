const enc = new TextEncoder();

export async function hashPII(input: string): Promise<string> {
  const secret = process.env.HASH_SECRET_PRIMARY;
  if (!secret) throw new Error('HASH_SECRET_PRIMARY env var is required');
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
