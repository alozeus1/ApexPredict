import type { RegionCode } from '@apexpredix/types';

export const RGS_HELPLINES: Record<RegionCode, { label: string; href: string }> = {
  GB: { label: 'BeGambleAware 0808 8020 133', href: 'https://www.begambleaware.org/' },
  US: { label: '1-800-GAMBLER', href: 'https://www.1800gambler.net/' },
  NG: { label: 'Nigerian Gambling Regulatory Helpline', href: 'https://ngrc.gov.ng/' },
  ZA: { label: 'NRGP 0800 006 008', href: 'https://www.responsiblegambling.org.za/' },
  KE: { label: 'BCLB Helpline', href: 'https://bclb.go.ke/' },
  EU: { label: 'BeGambleAware', href: 'https://www.begambleaware.org/' },
};
