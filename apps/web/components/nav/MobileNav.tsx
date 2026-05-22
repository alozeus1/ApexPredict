'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Menu, X } from 'lucide-react';
import { NAV_ITEMS } from './nav-items';

interface MobileNavProps { pathname: string; }

export function MobileNav({ pathname }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-ink-1/80 px-4 backdrop-blur">
        <Link href={'/' as Route<string>} className="font-semibold tracking-tight">
          <span className="text-edge-cyan">Apex</span>Predix
        </Link>
        <button aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded-lg p-2 ring-1 ring-white/10">
          <Menu size={18} />
        </button>
      </div>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Navigation" className="lg:hidden fixed inset-0 z-40 bg-ink-0/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
            <span className="font-semibold">Menu</span>
            <button aria-label="Close navigation" onClick={() => setOpen(false)} className="rounded-lg p-2 ring-1 ring-white/10">
              <X size={18} />
            </button>
          </div>
          <nav aria-label="Primary mobile" className="px-3 py-4">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      aria-disabled={item.locked || undefined}
                      className="flex items-center justify-between rounded-xl px-3 py-3 text-base text-white hover:bg-white/5"
                    >
                      <span>{item.label}</span>
                      {item.locked && <span className="rounded-md bg-ink-3 px-1.5 py-0.5 text-[10px] uppercase">Sign in</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
