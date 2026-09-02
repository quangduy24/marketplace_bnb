/**
 * Worker: Targeted sync from 8004scan
 * NEVER performs blind sweep of 300k registry.
 * Strictly queries 4 categories with a cap of 200 items per category.
 */
import { searchAgentsSemantic, fetchRecentAgents, sleep } from '../lib/8004scan.ts';
import { memoryStore } from '../lib/supabase.ts';

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

          memoryStore.upsertAgent({
            chainId: raw.chain_id || 56,
            agentId: raw.agent_id,
            tokenId: raw.token_id,
            owner: raw.owner,
            name: raw.name,
            description: raw.description,
            imageUrl: raw.image_url || `/sprites/agent-${category}.png`,
            agentUri: raw.agent_uri,
            supportedProtocols: raw.supported_protocols || ['x402'],
            x402Supported: Boolean(raw.x402_supported),
            status: raw.status || 'registered',
            active: Boolean(raw.active),
            rawJson: raw.raw_json || {},
          });
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
      memoryStore.upsertAgent({
        chainId: raw.chain_id || 56,
        agentId: raw.agent_id,
        tokenId: raw.token_id,
        owner: raw.owner,
        name: raw.name,
        description: raw.description,
        imageUrl: raw.image_url,
        agentUri: raw.agent_uri,
        supportedProtocols: raw.supported_protocols || [],
        x402Supported: Boolean(raw.x402_supported),
        status: raw.status || 'registered',
        active: Boolean(raw.active),
        rawJson: raw.raw_json || {},
      });
      totalAdded++;
    }

    await sleep(2100);
  }

  return { totalAdded };
}
