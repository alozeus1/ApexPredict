import { z } from 'zod';

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  capability: z.string(),
  status: z.enum(['live', 'idle', 'paused']),
  heartbeatJitterSec: z.number().int().nonnegative(),
  sparkline: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
});

export const AgentsSchema = z.array(AgentSchema).length(14);
export type AgentJSON = z.infer<typeof AgentSchema>;
