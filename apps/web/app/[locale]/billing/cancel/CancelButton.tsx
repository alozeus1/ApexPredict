'use client';

/**
 * Client-side cancellation action. The server schedules cancellation at the
 * current period end and records the audit trail.
 */
import { useState } from 'react';

export function CancelButton() {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function cancel() {
    setPending(true);
    setMessage('');
    const response = await fetch('/api/billing/cancel', { method: 'POST' });
    const json = (await response.json().catch(() => ({}))) as { cancelAt?: string; error?: string };
    setPending(false);
    setMessage(response.ok ? `Cancellation scheduled for ${json.cancelAt}` : json.error ?? 'Cancellation failed');
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={cancel}
        disabled={pending}
        className="rounded-lg bg-edge-amber px-4 py-2 text-sm font-semibold text-ink-0 disabled:opacity-60"
      >
        {pending ? 'Scheduling...' : 'Schedule cancellation'}
      </button>
      {message ? <p className="mt-3 text-sm text-mute-1" aria-live="polite">{message}</p> : null}
    </div>
  );
}
