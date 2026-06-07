import argon2 from 'argon2';

// argon2id with conservative interactive params: 19 MiB memory, 2 iterations,
// parallelism 1 (per the auth spec). bcrypt is intentionally not used.
const OPTS = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB, in KiB
  timeCost: 2,
  parallelism: 1,
} as const;

/** Hash a plaintext password for storage. */
export function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, OPTS);
}

/** Verify a plaintext password against a stored argon2id hash. */
export function verifyPassword(storedHash: string, plaintext: string): Promise<boolean> {
  return argon2.verify(storedHash, plaintext);
}
