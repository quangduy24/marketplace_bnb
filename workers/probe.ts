/**
 * Worker: 5s Health & Reachability Prober
 * Sends HTTP HEAD/GET with 5-second timeout to agentUri.
 * Computes the hireable status flag.
 */
import { memoryStore } from '../lib/supabase.ts';

export async function probeAgentEndpoint(agentUri: string): Promise<boolean> {
  if (!agentUri || !agentUri.startsWith('http')) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(agentUri, {
      method: 'HEAD',
      signal: controller.signal,
    }).catch(async () => {
      // If HEAD is rejected or fails, try a lightweight GET
      return await fetch(agentUri, {
        method: 'GET',
        signal: controller.signal,
      });
    });

    clearTimeout(timeoutId);
    return res.status >= 200 && res.status < 400;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

export async function runProbeWorker() {
  const allAgents = memoryStore.getAllAgents();
  let reachableCount = 0;
  let hireableCount = 0;

  for (const agent of allAgents) {
    let reachable = false;

    if (agent.labelSource === 'seed') {
      reachable = true; // Seeds are pre-verified reliable endpoints
    } else if (agent.agentUri) {
      reachable = await probeAgentEndpoint(agent.agentUri);
    }

    const hasEscrowConfig = agent.supportedProtocols?.includes('erc8183') || false;
    const isHireable =
      Boolean(agent.active) &&
      reachable &&
      (Boolean(agent.x402Supported) || hasEscrowConfig || agent.labelSource === 'seed');

    if (reachable) reachableCount++;
    if (isHireable) hireableCount++;

    memoryStore.upsertAgent({
      chainId: agent.chainId,
      agentId: agent.agentId,
      reachable,
      hireable: isHireable,
    });
  }

  return { reachableCount, hireableCount, total: allAgents.length };
}
