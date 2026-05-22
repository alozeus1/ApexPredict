'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const COOKIE = 'apexpredix-age-confirmed';

export function AgeGate() {
  const [show, setShow] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const seen = document.cookie.split('; ').some((p) => p.startsWith(`${COOKIE}=1`));
    if (!seen) setShow(true);
  }, []);
  if (!show) return null;
  const confirm = () => {
    document.cookie = `${COOKIE}=1; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
    setShow(false);
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-h"
      className="fixed inset-0 z-[60] grid place-items-center bg-ink-0/95 backdrop-blur"
    >
      <div className="m-6 w-full max-w-md rounded-2xl bg-ink-1 p-6 ring-1 ring-white/10 animate-rise">
        <h2 id="age-h" className="text-xl font-semibold">
          Are you 18 or older?
        </h2>
        <p className="mt-2 text-sm text-mute-1">
          ApexPredix AI is intended for adults only. We are an analytics service, not a gambling operator.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={confirm}
            className="flex-1 rounded-xl bg-edge-cyan px-4 py-3 font-medium text-ink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0"
          >
            I am 18 or older
          </button>
          <button
            type="button"
            onClick={() => router.push('/under-age')}
            className="flex-1 rounded-xl bg-ink-2 px-4 py-3 text-white ring-1 ring-white/10"
          >
            I am under 18
          </button>
        </div>
      </div>
    </div>
  );
}
