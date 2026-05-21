import type { RegionCode } from './pricing';

export interface Bookmaker {
  code: string;
  name: string;
  regions: RegionCode[];
  deeplink: string;
  logoUrl: string;
}
