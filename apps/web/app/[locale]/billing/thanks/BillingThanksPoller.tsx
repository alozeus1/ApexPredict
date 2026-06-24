'use client';

/**
 * Polls for subscription activation after a provider redirect. The endpoint is
 * intentionally lightweight until live provider credentials are wired.
 */
import { useEffect, useState } from 'react';

const delays = [1000, 2000, 4000, 8000];

export function BillingThanksPoller({ reference }: { reference: string }) {
  const [status, setStatus] = useState('Checking subscription status');

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll(index: number) {
      if (cancelled) return;
      setStatus(index >= delays.length ? 'Subscription confirmation pending' : 'Checking subscription status');
      if (index >= delays.length) return;
      timer = setTimeout(() => poll(index + 1), delays[index]);
    }

    poll(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reference]);

  return (
    <div className="mt-6 rounded-2xl bg-ink-1 p-5 ring-1 ring-white/10" aria-live="polite">
      <p className="text-sm text-mute-1">{status}</p>
      <p className="mt-2 break-all text-xs text-mute-2">Reference: {reference || 'not provided'}</p>
    </div>
  );
}
