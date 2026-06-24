'use client';
import { useEffect, useState } from 'react';
import type { ConsentChoices } from '@apexpredix/types';

const DEVICE_KEY = 'apexpredix-device-id';

function ensureDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [choices, setChoices] = useState<ConsentChoices>({
    essential: true,
    analytics: false,
    prefs: false,
    marketing: false,
  });

  useEffect(() => {
    fetch('/api/consent')
      .then((response) => response.json())
      .then((body: { choices?: ConsentChoices | null }) => {
        if (!body.choices) setOpen(true);
      })
      .catch(() => setOpen(true));
    const onOpen = () => setOpen(true);
    window.addEventListener('apexpredix:open-cookie-consent', onOpen);
    return () => window.removeEventListener('apexpredix:open-cookie-consent', onOpen);
  }, []);

  const submit = async (c: ConsentChoices) => {
    await fetch('/api/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ anonDeviceId: ensureDeviceId(), choices: c }),
    });
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cc-h"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-ink-1/95 backdrop-blur"
    >
      <div className="mx-auto max-w-4xl px-4 py-4">
        <h2 id="cc-h" className="text-sm font-semibold">
          We use cookies
        </h2>
        <p className="mt-1 text-xs text-mute-1">
          Essential cookies keep the site running. We also use analytics and preferences cookies if you opt in. You can
          change this anytime.
        </p>
        {customize ? (
          <fieldset className="mt-4 grid gap-3 text-sm">
            <legend className="sr-only">Cookie categories</legend>
            {(
              [
                ['essential', 'Essential (always on)', true, true],
                ['analytics', 'Analytics (Vercel)', choices.analytics, false],
                ['prefs', 'Preferences (theme/language/region)', choices.prefs, false],
                ['marketing', 'Marketing (off in v1)', choices.marketing, false],
              ] as const
            ).map(([key, label, value, disabled]) => (
              <label key={key} className="flex items-center justify-between rounded-xl bg-ink-2 px-3 py-2">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={value as boolean}
                  disabled={disabled as boolean}
                  onChange={(e) => setChoices({ ...choices, [key]: e.target.checked } as ConsentChoices)}
                  className="h-4 w-4"
                />
              </label>
            ))}
          </fieldset>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-edge-cyan px-4 py-2 text-sm font-medium text-ink-0"
            onClick={() =>
              submit({ essential: true, analytics: true, prefs: true, marketing: true })
            }
          >
            Accept all
          </button>
          <button
            className="rounded-xl bg-ink-2 px-4 py-2 text-sm text-white ring-1 ring-white/10"
            onClick={() =>
              submit({ essential: true, analytics: false, prefs: false, marketing: false })
            }
          >
            Reject all
          </button>
          {!customize ? (
            <button
              className="rounded-xl bg-ink-2 px-4 py-2 text-sm text-white ring-1 ring-white/10"
              onClick={() => setCustomize(true)}
            >
              Customize
            </button>
          ) : (
            <button
              className="rounded-xl bg-ink-2 px-4 py-2 text-sm text-white ring-1 ring-white/10"
              onClick={() => submit(choices)}
            >
              Save my choices
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
