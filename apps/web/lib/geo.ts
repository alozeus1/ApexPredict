import type { RegionCode } from '@apexpredix/types';

const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE']);

export const regionFromCountry = (country: string | undefined | null): RegionCode => {
  if (!country) return 'US';
  const c = country.toUpperCase();
  if (c === 'NG') return 'NG';
  if (c === 'ZA') return 'ZA';
  if (c === 'KE') return 'KE';
  if (c === 'GB' || c === 'UK') return 'GB';
  if (EU.has(c)) return 'EU';
  return 'US';
};
