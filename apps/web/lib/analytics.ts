const EVENTS = new Set([
  'landing.view', 'predictions.preview.click', 'match.detail.view',
  'waitlist.submit.attempt', 'waitlist.submit.success', 'waitlist.verify.success',
  'consent.choose', 'age.confirm', 'geo.blocked.view',
  'seedance.unmute', 'region.change', 'locale.change',
]);

export function track(event: string, props?: Record<string, unknown>) {
  if (!EVENTS.has(event)) {
    console.warn('[analytics] unknown event', event);
    return;
  }
  if (typeof window === 'undefined') return;
  const data = JSON.stringify({ event, props, ts: Date.now() });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([data], { type: 'application/json' }));
    }
  } catch { /* swallow */ }
}
