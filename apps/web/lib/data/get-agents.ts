import { prisma } from '@apexpredix/db';
import agents from '@/data/agents.json';
import type { AgentJSON } from '@/data/agents.schema';

function toUiStatus(status: string): AgentJSON['status'] {
  if (status === 'live') return 'live';
  if (status === 'paused') return 'paused';
  return 'idle';
}

export async function getAgents(): Promise<AgentJSON[]> {
  const baseAgents = agents as AgentJSON[];
  if (!process.env.DATABASE_URL) return baseAgents;

  try {
    const merged = await Promise.all(
      baseAgents.map(async (agent) => {
        const latest = await prisma.agentHeartbeat.findFirst({
          where: { agentId: agent.id },
          orderBy: { createdAt: 'desc' },
        });
        if (!latest) return agent;

        return {
          ...agent,
          status: toUiStatus(latest.status),
          heartbeatJitterSec: Math.max(10, Math.round((Date.now() - latest.createdAt.getTime()) / 1000)),
        };
      }),
    );

    return merged;
  } catch {
    return baseAgents;
  }
}
