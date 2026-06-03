import { getAgents } from '@/lib/data/get-agents';
import { AgentTile } from './AgentTile';

export async function Network() {
  const agents = await getAgents();

  return (
    <section id="network" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Live Intelligence Grid</h2>
        <p className="mb-10 max-w-prose text-mute-1">
          14 autonomous agents. Daily provider sync, standings capture, prediction snapshots, and result settlement.
        </p>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {agents.map((a) => <AgentTile key={a.id} agent={a} />)}
        </ul>
      </div>
    </section>
  );
}
