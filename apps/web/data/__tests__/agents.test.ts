import { describe, it, expect } from 'vitest';
import agents from '../agents.json';
import { AgentsSchema } from '../agents.schema';

describe('agents.json', () => {
  it('passes the schema', () => {
    expect(() => AgentsSchema.parse(agents)).not.toThrow();
  });
  it('keeps the original agent baseline plus any specialist additions', () => {
    expect((agents as Array<unknown>).length).toBeGreaterThanOrEqual(14);
  });
});
