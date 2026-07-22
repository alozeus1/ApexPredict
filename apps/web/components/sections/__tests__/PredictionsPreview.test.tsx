import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PredictionsPreview } from '../PredictionsPreview';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

/**
 * This suite previously asserted that the homepage always renders 6 featured
 * MatchCards. That only ever passed because `getFixtures()` fell back to
 * `data/fixtures.json` — invented matches with invented model scores and
 * `valueBet: true` — whenever live data was unavailable.
 *
 * The test was therefore encoding the fabrication defect (gap G1) as expected
 * behaviour. It now covers both paths explicitly: demo mode renders demo data,
 * and the absence of live data renders an empty state rather than fiction.
 */

const ORIGINAL = { ...process.env };

beforeEach(() => {
  delete process.env.ALLOW_DEMO_FIXTURES;
  delete process.env.VERCEL_ENV;
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
});

describe('PredictionsPreview', () => {
  it('always renders its heading', async () => {
    render(await PredictionsPreview({ locale: 'en' }));
    expect(screen.getByRole('heading', { name: /live predictions/i })).toBeInTheDocument();
  });

  it('renders an empty state — not demo fixtures — when live data is unavailable', async () => {
    render(await PredictionsPreview({ locale: 'en' }));

    expect(screen.getByRole('status')).toHaveTextContent(/no predictions available/i);

    // The critical assertion: nothing from data/fixtures.json reaches the page.
    const fabricated = screen
      .queryAllByRole('link')
      .filter((anchor) => anchor.getAttribute('href')?.startsWith('/predictions/featured-'));
    expect(fabricated).toHaveLength(0);
  });

  it('renders demo fixtures when demo mode is explicitly enabled', async () => {
    process.env.ALLOW_DEMO_FIXTURES = 'true';

    render(await PredictionsPreview({ locale: 'en' }));

    const featured = screen
      .getAllByRole('link')
      .filter((anchor) => anchor.getAttribute('href')?.startsWith('/predictions/featured-'));
    expect(featured.length).toBeGreaterThanOrEqual(6);
  });

  it('refuses demo fixtures in production even when the flag is set', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.ALLOW_DEMO_FIXTURES = 'true';

    render(await PredictionsPreview({ locale: 'en' }));

    expect(screen.getByRole('status')).toHaveTextContent(/no predictions available/i);
  });
});
