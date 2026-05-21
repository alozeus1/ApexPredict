import { describe, it, expect } from 'vitest';
import books from '../bookmakers.json';
import { BookmakersSchema } from '../bookmakers.schema';

describe('bookmakers.json', () => {
  it('passes schema', () => {
    expect(() => BookmakersSchema.parse(books)).not.toThrow();
  });
  it('has at least one bookmaker per region', () => {
    const regions = new Set((books as Array<{ regions: string[] }>).flatMap((b) => b.regions));
    expect(regions.has('US')).toBe(true);
    expect(regions.has('NG')).toBe(true);
    expect(regions.has('GB')).toBe(true);
    expect(regions.has('EU')).toBe(true);
    expect(regions.has('ZA')).toBe(true);
    expect(regions.has('KE')).toBe(true);
  });
});
