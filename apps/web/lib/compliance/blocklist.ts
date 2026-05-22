export const BLOCKLIST = {
  countries: new Set(['CN', 'KP', 'IR', 'CU', 'SA', 'AE', 'SG', 'FR']),
  usStates: new Set(['WA', 'ID', 'CT', 'TN', 'HI']),
};

export function isBlocked(country: string, region: string | undefined): boolean {
  const c = country.toUpperCase();
  if (BLOCKLIST.countries.has(c)) return true;
  if (c === 'US' && region && BLOCKLIST.usStates.has(region.toUpperCase())) return true;
  return false;
}
