/**
 * Worker: 5s Health & Reachability Prober
 * Uses the indexer's endpoint verification as the primary reachable signal,
 * and falls back to real HTTP HEAD/GET probes against agentUri.
 * Computes the hireable status flag from real data.
 */
import { store } from '../lib/supabase.ts';

/**
 * Resolve a probe target from the agent URI.
 * A2A endpoints from the indexer often contain {agentId} placeholders —
 * substitute the real token id before probing.
 */
function resolveProbeUri(agent: any): string | null {
  let uri = agent?.agentUri;
  if (!uri || typeof uri !== 'string') return null;
  const token = agent.tokenId || String(agent.agentId || '').split(':').pop() || '';
  uri = uri
    .replace(/\{agentId\}/g, token)
    .replace(/\{agent_id\}/g, token)
    .replace(/\{tokenId\}/g, token);
  if (!uri.startsWith('http') || uri.includes('{') || uri.includes('}')) return null;
  return uri;
}

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
    // Any HTTP response (including 404/405 on a wrong path) proves the server is alive
    return res.status < 500;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

export async function runProbeWorker() {
  const allAgents = await store.getAllAgents();
  let reachableCount = 0;
  let hireableCount = 0;

  const CHUNK_SIZE = 25;
  for (let i = 0; i < allAgents.length; i += CHUNK_SIZE) {
    const chunk = allAgents.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (agent) => {
        const raw = (agent.rawJson as any) || {};

        // Primary verification: verified on 8004scan indexer or previously marked reachable
        const isVerifiedOnChain =
          raw.endpointVerified === true ||
          raw.endpointVerified === 'true' ||
          raw.isVerified === true ||
          raw.isVerified === 'true' ||
          agent.reachable === true;

        let reachable = isVerifiedOnChain;

        // Fallback: live probe of the A2A endpoint
        if (!reachable) {
          const uri = resolveProbeUri(agent);
          if (uri) {
            reachable = await probeAgentEndpoint(uri);
          }
        }

        const hasEscrowConfig = agent.supportedProtocols?.includes('erc8183') || false;
        const hasPaymentRail =
          Boolean(agent.x402Supported) ||
          Boolean(agent.agentUri) ||
          (Array.isArray(agent.supportedProtocols) && agent.supportedProtocols.length > 0) ||
          Boolean(raw.hourlyCostU) ||
          hasEscrowConfig;

        // An agent is active if it has verification, reachable endpoint, or previous active state
        const isActive = Boolean(agent.active) || reachable || hasPaymentRail;

        // An agent is hireable if it is active and has a verifiable payment or interaction rail
        const isHireable = isActive && (hasPaymentRail || reachable || isVerifiedOnChain);

        if (reachable) reachableCount++;
        if (isHireable) hireableCount++;

        await store.upsertAgent({
          chainId: agent.chainId,
          agentId: agent.agentId,
          active: isActive,
          status: isActive ? 'active' : 'inactive',
          reachable,
          hireable: isHireable,
        });
      })
    );
  }

  return { reachableCount, hireableCount, total: allAgents.length };
}
