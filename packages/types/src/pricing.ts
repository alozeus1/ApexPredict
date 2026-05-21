export type CurrencyCode = 'USD' | 'NGN' | 'GBP' | 'EUR' | 'ZAR' | 'KES';
export type RegionCode = 'US' | 'NG' | 'GB' | 'EU' | 'ZA' | 'KE';

export interface PricingRegion {
  region: RegionCode;
  currency: CurrencyCode;
  monthly: number;
  yearly: number;
  pctOffBase: number;
}
