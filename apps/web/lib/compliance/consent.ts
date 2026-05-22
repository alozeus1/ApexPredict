import { CONSENT_VERSION, type ConsentChoices } from '@apexpredix/types';

export const COOKIE_NAME = 'cookie-consent';
export const DEFAULT_CHOICES: ConsentChoices = { essential: true, analytics: false, prefs: false, marketing: false };

export function encodeChoices(c: ConsentChoices): string {
  return Buffer.from(JSON.stringify({ v: CONSENT_VERSION, c })).toString('base64url');
}

export function decodeChoices(value: string | undefined): ConsentChoices | null {
  if (!value) return null;
  try {
    const { v, c } = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (v !== CONSENT_VERSION) return null;
    return c as ConsentChoices;
  } catch {
    return null;
  }
}
