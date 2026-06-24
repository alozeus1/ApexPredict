/**
 * No-data fallback for future programmatic SEO leaf pages. Returns a normal 200
 * page state with a path back to predictions instead of an empty soft-404 page.
 */
import Link from 'next/link';

export function NoFixturesYet() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">No fixtures available yet</h1>
      <p className="mt-3 text-sm text-mute-1">New fixture data will appear here once the schedule is refreshed.</p>
      <Link href="/en/predictions" className="mt-6 inline-flex rounded-lg bg-edge-cyan px-4 py-2 text-sm font-semibold text-ink-0">
        View predictions
      </Link>
    </section>
  );
}
