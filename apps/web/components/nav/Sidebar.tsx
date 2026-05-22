import Link from 'next/link';
import { cookies } from 'next/headers';
import { NAV_ITEMS } from './nav-items';
import { cn } from '@apexpredix/ui';
import { SettingsPanel } from './SettingsPanel';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { RegionCode } from '@apexpredix/types';

interface SidebarProps { pathname: string; }

export async function Sidebar({ pathname }: SidebarProps) {
  const cookieStore = await cookies();
  const region = ((cookieStore.get('apexpredix-region')?.value ?? 'US') as RegionCode);
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-white/5 bg-ink-1/80 backdrop-blur">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          <span className="text-edge-cyan">Apex</span>Predix<span className="text-mute-1"> AI</span>
        </Link>
      </div>
      <nav aria-label="Primary" className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-disabled={item.locked || undefined}
                  className={cn(
                    'group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition',
                    active ? 'bg-white/5 text-white' : 'text-mute-1 hover:bg-white/5 hover:text-white',
                    item.locked && 'pointer-events-none opacity-50',
                  )}
                >
                  <span>{item.label}</span>
                  {item.locked && <span className="rounded-md bg-ink-3 px-1.5 py-0.5 text-[10px] uppercase">Sign in</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5">
        <SettingsPanel initialRegion={region} />
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <div className="border-t border-white/5 p-4 text-xs text-mute-2">Powered by Maralito Labs</div>
    </aside>
  );
}
