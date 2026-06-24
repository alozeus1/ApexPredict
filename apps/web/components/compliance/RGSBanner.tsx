'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { RGS_HELPLINES } from '@/lib/compliance/rgs';
import type { RegionCode } from '@apexpredix/types';

interface Props {
  region: RegionCode;
}

export function RGSBanner({ region }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const helpline = RGS_HELPLINES[region];
  return (
    <div role="region" aria-label="Responsible gambling notice" className="border-b border-white/5 bg-ink-2/80 text-mute-1">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs">
        <p>
          🔞 ApexPredict AI is an analytics service, not a gambling operator. 18+. Bet responsibly —{' '}
          <a href={helpline.href} rel="noopener noreferrer" target="_blank" className="text-edge-cyan hover:underline">
            {helpline.label}
          </a>
          .
        </p>
        <button aria-label="Dismiss" onClick={() => setDismissed(true)} className="rounded p-1 hover:bg-white/5">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
