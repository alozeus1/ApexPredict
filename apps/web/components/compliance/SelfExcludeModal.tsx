'use client';

/**
 * Three-step locked confirmation modal for responsible-gaming self-exclusion.
 */
import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';

type WindowValue = '24h' | '7d' | '30d' | 'permanent';

const WINDOWS: Array<{ value: WindowValue; label: string }> = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'permanent', label: 'Permanent' },
];

export function SelfExcludeModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [windowValue, setWindowValue] = useState<WindowValue>('24h');
  const [ack, setAck] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    const response = await fetch('/api/account/self-exclude', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ window: windowValue }),
    });
    const json = (await response.json().catch(() => ({}))) as { selfExcludedUntil?: string; error?: string };
    setMessage(response.ok ? `Self-exclusion active until ${json.selfExcludedUntil}` : json.error ?? 'Request failed');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-white/5"
      >
        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        Start self-exclusion
      </button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-labelledby="self-exclude-title" className="fixed inset-0 z-[70] grid place-items-center bg-ink-0/90 px-4">
          <div className="w-full max-w-md rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10">
            <h2 id="self-exclude-title" className="text-lg font-semibold">Self-exclusion confirmation</h2>
            {step === 1 ? (
              <div className="mt-5 space-y-3">
                {WINDOWS.map((item) => (
                  <label key={item.value} className="flex items-center justify-between rounded-lg bg-ink-2 px-3 py-2 text-sm">
                    <span>{item.label}</span>
                    <input
                      type="radio"
                      name="self-exclude-window"
                      checked={windowValue === item.value}
                      onChange={() => setWindowValue(item.value)}
                    />
                  </label>
                ))}
                <button type="button" className="rounded-lg bg-edge-cyan px-4 py-2 text-sm font-semibold text-ink-0" onClick={() => setStep(2)}>
                  Continue
                </button>
              </div>
            ) : null}
            {step === 2 ? (
              <div className="mt-5 space-y-4 text-sm text-mute-1">
                <p>ApexPredict is decision support only. During self-exclusion, picks and alerts are suppressed.</p>
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} className="mt-1" />
                  <span>I understand this cannot be reversed during the selected window.</span>
                </label>
                <button
                  type="button"
                  disabled={!ack}
                  className="rounded-lg bg-edge-cyan px-4 py-2 text-sm font-semibold text-ink-0 disabled:opacity-50"
                  onClick={() => setStep(3)}
                >
                  Continue
                </button>
              </div>
            ) : null}
            {step === 3 ? (
              <div className="mt-5 space-y-4 text-sm text-mute-1">
                <p>This locks the exclusion window immediately and hides betting-signal surfaces.</p>
                <button type="button" className="rounded-lg bg-edge-amber px-4 py-2 text-sm font-semibold text-ink-0" onClick={submit}>
                  Confirm self-exclusion
                </button>
                {message ? <p aria-live="polite">{message}</p> : null}
              </div>
            ) : null}
            <button type="button" className="mt-5 text-sm text-mute-2 underline" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
