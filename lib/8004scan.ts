/**
 * 8004scan REST API Client
 * Interacts with the ERC-8004 identity registry indexer on BSC (Chain ID 56)
 */

export interface Raw8004Agent {
  chain_id: number;
  agent_id: string;
  token_id?: string;
  owner?: string;
  name?: string;
  description?: string;
  image_url?: string;
  agent_uri?: string;
  supported_protocols?: string[];
  x402_supported?: boolean;
  status?: string;
  active?: boolean;
  raw_json?: any;
}

const BASE_URL = 'https://api.8004scan.io/api/v1';

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch semantic search results with rate-limit protection and exponential backoff
 */
export async function searchAgentsSemantic(
  query: string,
  chainId = 56,
  limit = 50,
  offset = 0
): Promise<Raw8004Agent[]> {
  const url = `${BASE_URL}/agents/search/semantic?q=${encodeURIComponent(query)}&chain_id=${chainId}&limit=${limit}&offset=${offset}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (res.status === 429) {
      console.warn('[8004scan] 429 Rate Limit hit. Backing off 3.5s...');
      await sleep(3500);
      return [];
    }

    if (!res.ok) {
      console.warn(`[8004scan] Non-200 response: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : data.agents || data.items || [];
  } catch (err) {
    console.warn('[8004scan] Semantic search fetch error (falling back):', err);
    return [];
  }
}

/**
 * Incremental sync fetching top 3-5 pages only (NEVER blind scan)
 */
export async function fetchRecentAgents(chainId = 56, limit = 50, offset = 0): Promise<Raw8004Agent[]> {
  const url = `${BASE_URL}/agents?chain_id=${chainId}&limit=${limit}&offset=${offset}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (res.status === 429) {
      await sleep(3000);
      return [];
    }

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.agents || data.items || [];
  } catch (err) {
    console.warn('[8004scan] Recent agents fetch error:', err);
    return [];
  }
}
