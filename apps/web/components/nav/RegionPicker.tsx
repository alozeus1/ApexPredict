'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { RegionCode } from '@apexpredix/types';

const REGIONS: ReadonlyArray<{ code: RegionCode; name: string }> = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'EU', name: 'Europe' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KE', name: 'Kenya' },
];

export function RegionPicker({ initial }: { initial: RegionCode }) {
  const [region, setRegion] = useState<RegionCode>(initial);
  const [open, setOpen] = useState(false);
  const choose = (code: RegionCode) => {
    document.cookie = `apexpredix-region=${code}; path=/; max-age=31536000; samesite=lax`;
    setRegion(code);
    setOpen(false);
  };
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Change region"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mute-1 ring-1 ring-white/10 hover:text-white"
      >
        Region: {region} <ChevronDown size={14} />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 z-40 mt-2 w-56 rounded-xl bg-ink-2 p-1 ring-1 ring-white/10">
          {REGIONS.map((r) => (
            <li key={r.code}>
              <button
                role="option"
                aria-selected={region === r.code}
                onClick={() => choose(r.code)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-white hover:bg-white/5"
              >
                <span>{r.name}</span>
                <span className="text-xs text-mute-2">{r.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
