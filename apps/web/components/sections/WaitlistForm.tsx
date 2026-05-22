'use client';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Input, Button } from '@apexpredix/ui';
import Script from 'next/script';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (t: string) => void },
      ) => string;
    };
  }
}

export function WaitlistForm() {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [eighteen, setEighteen] = useState(false);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        locale,
        premiumIntent: false,
        turnstileToken: token || 'dev-mode-no-turnstile',
        honeypot: '',
      }),
    });
    setStatus(res.ok ? 'sent' : 'error');
  };

  if (status === 'sent') {
    return <p className="text-sm text-edge-green">Check your inbox to confirm your seat.</p>;
  }

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      {/* honeypot — hidden from users + assistive tech but visible to bots */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="flex-1">
        <span className="sr-only">Email</span>
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-mute-1">
        <input
          type="checkbox"
          required
          checked={eighteen}
          onChange={(e) => setEighteen(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-ink-2"
        />
        I am 18+
      </label>
      <Button
        type="submit"
        size="lg"
        disabled={!email || !eighteen || status === 'submitting'}
      >
        {status === 'submitting' ? 'Submitting…' : 'Reserve my seat'}
      </Button>
      {siteKey && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
          <div
            className="cf-turnstile"
            data-sitekey={siteKey}
            ref={(el) => {
              if (el && window.turnstile && !el.dataset.rendered) {
                el.dataset.rendered = '1';
                window.turnstile.render(el, {
                  sitekey: siteKey,
                  callback: (t) => setToken(t),
                });
              }
            }}
          />
        </>
      )}
    </form>
  );
}
