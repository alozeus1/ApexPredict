/**
 * Loads a local .env file into `process.env` as a module side effect.
 *
 * Why this is a separate module: `tsx` does not load .env files, and Prisma
 * Client (unlike the Prisma CLI) does not either, so `DATABASE_URL` never
 * reaches a standalone script. Import declarations are evaluated in source
 * order, so importing this module BEFORE `@apexpredix/db` guarantees the
 * environment is populated before the Prisma client module is evaluated.
 *
 * Do not reorder it below other imports. Prisma also connects lazily, so this
 * would probably still work — but "probably" is not a property worth relying on
 * for the credential that decides which database you write to.
 */
import fs from 'node:fs';
import path from 'node:path';

function envFileArg(): string | undefined {
  const index = process.argv.indexOf('--env-file');
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function resolveCandidates(): string[] {
  const explicit = envFileArg();
  if (explicit) return [path.resolve(process.cwd(), explicit)];

  // __dirname is available because tsx transpiles these scripts to CJS.
  const webRoot = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(webRoot, '../..');

  return [path.join(webRoot, '.env.local'), path.join(repoRoot, '.env.local'), path.join(repoRoot, '.env')];
}

function load(): string | null {
  for (const candidate of resolveCandidates()) {
    if (fs.existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return candidate;
    }
  }
  return null;
}

export const loadedEnvFile = load();

/** Host and database name only — never log credentials from a connection string. */
export function databaseHost(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'NOT SET';
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return 'unparsable';
  }
}
