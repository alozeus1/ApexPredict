import domains from './disposable-email-domains.json';
const set = new Set(domains.map((d) => d.toLowerCase()));

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  return set.has(email.slice(at + 1).toLowerCase());
}
