import { describe, it, expect } from 'vitest';
import agents from '../agents.json';
import { AgentsSchema } from '../agents.schema';

describe('agents.json', () => {
  it('passes the schema', () => {
    expect(() => AgentsSchema.parse(agents)).not.toThrow();
  });
  it('has exactly 14 agents', () => {
    expect((agents as Array<unknown>).length).toBe(14);
  });
});
