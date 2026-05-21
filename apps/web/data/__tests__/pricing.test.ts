import { describe, it, expect } from 'vitest';
import pricing from '../pricing.json';
import { PricingSchema } from '../pricing.schema';

describe('pricing.json', () => {
  it('passes the schema', () => {
    expect(() => PricingSchema.parse(pricing)).not.toThrow();
  });
  it('Nigeria has the 85% discount marker', () => {
    const ng = (pricing as Array<{ region: string; pctOffBase: number }>).find((r) => r.region === 'NG');
    expect(ng?.pctOffBase).toBe(85);
  });
});
