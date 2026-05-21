import { describe, it, expect } from 'vitest';
import fixtures from '../fixtures.json';
import { FixturesSchema } from '../fixtures.schema';

describe('fixtures.json', () => {
  it('passes the schema', () => {
    expect(() => FixturesSchema.parse(fixtures)).not.toThrow();
  });
  it('has ≥6 featured matches', () => {
    const featured = (fixtures as Array<{ featured?: boolean }>).filter((m) => m.featured);
    expect(featured.length).toBeGreaterThanOrEqual(6);
  });
  it('all ids are unique', () => {
    const ids = (fixtures as Array<{ id: string }>).map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
