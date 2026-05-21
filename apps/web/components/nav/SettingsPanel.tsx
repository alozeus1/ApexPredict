'use client';
import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { RegionPicker } from './RegionPicker';
import type { RegionCode } from '@apexpredix/types';

interface Props { initialRegion: RegionCode; }

export function SettingsPanel({ initialRegion }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Settings"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-mute-1 ring-1 ring-white/10 hover:text-white"
      >
        <Settings size={16} />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Settings" className="fixed inset-0 z-50 flex">
          <button aria-label="Close" onClick={() => setOpen(false)} className="flex-1 bg-black/60 backdrop-blur" />
          <aside className="ml-auto h-full w-full max-w-sm bg-ink-1 p-6 shadow-2xl ring-1 ring-white/10">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button aria-label="Close" onClick={() => setOpen(false)} className="rounded-lg p-2 ring-1 ring-white/10"><X size={16} /></button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-medium text-mute-1">Language</h3>
                <LanguageSwitcher />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-mute-1">Region</h3>
                <RegionPicker initial={initialRegion} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-mute-1">Theme</h3>
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('apexpredix:open-cookie-consent'));
                }}
                className="text-sm text-edge-cyan hover:underline"
              >
                Manage cookies
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
