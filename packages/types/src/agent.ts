export type AgentStatus = 'live' | 'idle' | 'paused';

export interface Agent {
  id: string;
  name: string;
  capability: string;
  status: AgentStatus;
  heartbeatJitterSec: number;
  sparkline: [number, number, number, number, number, number, number];
}
