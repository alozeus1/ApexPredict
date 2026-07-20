import * as Sentry from '@sentry/nextjs';

/**
 * Demo-fixture policy.
 *
 * `data/fixtures.json` contains invented matches with invented model scores and
 * `valueBet: true`. It exists for local development and marketing previews.
 *
 * It was previously returned from `getFixtures()` on three separate paths —
 * missing DATABASE_URL, an empty result set, and a bare `catch {}`. That meant a
 * transient database fault could serve fabricated predictions to paying
 * subscribers, rendered identically to real model output, with nothing marking
 * them as demo data.
 *
 * Demo data is now opt-in, and can never be enabled in production.
 */

/** True only when demo fixtures are explicitly enabled AND we are not in production. */
export function isDemoDataEnabled(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false;
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') return false;
  return process.env.ALLOW_DEMO_FIXTURES === 'true';
}

/**
 * Records a real data-source failure.
 *
 * Callers must degrade to an empty state — never to invented content. A user
 * seeing "no predictions available" is correct; a user seeing a fabricated
 * value bet is a product defect and a compliance problem.
 */
export function reportDataSourceFailure(source: string, error: unknown): void {
  Sentry.captureException(error, {
    level: 'error',
    tags: { area: 'data.source-failure', source },
  });
}

/** Records that a live query returned nothing, which is legitimate but worth watching. */
export function reportEmptyDataSource(source: string): void {
  Sentry.captureMessage(`Data source ${source} returned no rows`, {
    level: 'warning',
    tags: { area: 'data.empty', source },
  });
}
