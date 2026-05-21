'use client';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { LOCALES } from '@apexpredix/types';

const LABELS: Record<string, string> = { en: 'English', es: 'Español', yo: 'Yorùbá', ha: 'Hausa', zu: 'Zulu' };

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const change = (next: string) => {
    document.cookie = `apexpredix-language=${next}; path=/; max-age=31536000; samesite=lax`;
    const segments = pathname.split('/');
    segments[1] = next;
    router.push(segments.join('/'));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mute-1 ring-1 ring-white/10 hover:text-white"
      >
        {LABELS[locale]} <ChevronDown size={14} />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 z-40 mt-2 w-48 rounded-xl bg-ink-2 p-1 ring-1 ring-white/10">
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                role="option"
                aria-selected={locale === l}
                onClick={() => change(l)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-white hover:bg-white/5"
              >
                <span>{LABELS[l]}</span>
                {l !== 'en' && <span className="rounded bg-edge-amber/15 px-1.5 py-0.5 text-[10px] uppercase text-edge-amber">Beta</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
