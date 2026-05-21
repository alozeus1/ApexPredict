'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('apexpredix-theme', next ? 'dark' : 'light'); } catch {}
  };

  return (
    <button
      type="button"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-mute-1 ring-1 ring-white/10 hover:text-white"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
