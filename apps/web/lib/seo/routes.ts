/**
 * Programmatic SEO route catalog. Leaf pages are future-facing; this module
 * centralizes URL construction and parsing before page implementations land.
 */
import { z } from 'zod';

const slug = z.string().min(1).regex(/^[a-z0-9-]+$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const SEO_ROUTES = {
  freeTips: (league: string, date: string) => `/free-tips/${league}/${date}`,
  team: (teamSlug: string) => `/team/${teamSlug}`,
  h2h: (a: string, b: string) => `/h2h/${a}-vs-${b}`,
  competitionPredictions: (competitionSlug: string) => `/competition/${competitionSlug}/predictions`,
  competitionTable: (competitionSlug: string) => `/competition/${competitionSlug}/table`,
} as const;

export type LeafRoute =
  | { kind: 'freeTips'; league: string; date: string }
  | { kind: 'team'; slug: string }
  | { kind: 'h2h'; a: string; b: string }
  | { kind: 'competitionPredictions'; slug: string }
  | { kind: 'competitionTable'; slug: string };

export function parseLeafPath(path: string): LeafRoute | null {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const parts = clean.split('/');
  const [section, second, third] = parts;

  if (section === 'free-tips' && parts.length === 3 && second && third && slug.safeParse(second).success && isoDate.safeParse(third).success) {
    return { kind: 'freeTips', league: second, date: third };
  }
  if (section === 'team' && parts.length === 2 && second && slug.safeParse(second).success) {
    return { kind: 'team', slug: second };
  }
  if (section === 'h2h' && parts.length === 2 && second) {
    const match = second.match(/^([a-z0-9-]+)-vs-([a-z0-9-]+)$/);
    const a = match?.[1];
    const b = match?.[2];
    if (a && b && slug.safeParse(a).success && slug.safeParse(b).success) {
      return { kind: 'h2h', a, b };
    }
  }
  if (section === 'competition' && parts.length === 3 && second && slug.safeParse(second).success) {
    if (third === 'predictions') return { kind: 'competitionPredictions', slug: second };
    if (third === 'table') return { kind: 'competitionTable', slug: second };
  }
  return null;
}

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
