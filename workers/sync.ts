/**
 * Worker: Targeted sync from 8004scan
 * NEVER performs blind sweep of 300k registry.
 * Strictly queries 4 categories with a cap of 200 items per category.
 * Persists real on-chain ERC-8004 agents into the store (Supabase).
 */
import { searchAgentsSemantic, fetchRecentAgents, sleep, mapRawToAgent } from '../lib/8004scan.ts';
import { store } from '../lib/supabase.ts';

const CATEGORY_QUERIES = {
  monitoring: ['monitoring agent', 'wallet watcher', 'price alert', 'position monitor'],
  grid: ['grid trading', 'range trading bot', 'DCA grid'],
  health_factor: ['health factor', 'liquidation protection', 'Venus Aave loan agent'],
  yield: ['yield farming', 'APY vault', 'harvest allocate capital'],
};

const MAX_PER_CATEGORY = 200;

export async function runSemanticSync() {
  console.log('[Worker Sync] Starting targeted semantic crawl (capped at 200/category)...');
  const results: Record<string, number> = {
    monitoring: 0,
    grid: 0,
    health_factor: 0,
    yield: 0,
  };

  for (const [category, queries] of Object.entries(CATEGORY_QUERIES)) {
    let count = 0;
    for (const query of queries) {
      if (count >= MAX_PER_CATEGORY) break;

      try {
        const batch = await searchAgentsSemantic(query, 56, 50, 0);
        for (const raw of batch) {
          if (count >= MAX_PER_CATEGORY) break;
          await store.upsertAgent(mapRawToAgent(raw));
          count++;
        }
      } catch (err) {
        console.warn(`[Worker Sync] Error crawling query "${query}":`, err);
      }

      // Safe rate-limit pause
      await sleep(2100);
    }
    results[category] = count;
  }

  console.log('[Worker Sync] Targeted crawl finished:', results);
  return results;
}

export async function runIncrementalSync(maxPages = 3) {
  console.log(`[Worker Sync] Running incremental sync for ${maxPages} pages...`);
  let totalAdded = 0;

  for (let page = 0; page < maxPages; page++) {
    const offset = page * 50;
    const batch = await fetchRecentAgents(56, 50, offset);

    for (const raw of batch) {
      // Recent-list endpoint is lean: only upsert fields it actually carries.
      // Existing rows keep their active/reachable/hireable state (merged in store).
      await store.upsertAgent({
        chainId: raw.chain_id || 56,
        agentId: raw.agent_id,
        tokenId: raw.token_id ?? null,
        owner: raw.owner_address ?? null,
        name: raw.name ?? null,
        description: raw.description ?? null,
        imageUrl: raw.image_url ?? null,
        supportedProtocols: raw.supported_protocols ?? [],
        x402Supported: raw.x402_supported ?? false,
      });
      totalAdded++;
    }

    await sleep(2100);
  }

  return { totalAdded };
}
