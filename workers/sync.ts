/**
 * Worker: Targeted sync from 8004scan
 * NEVER performs blind sweep of 300k registry.
 * Strictly queries 4 categories with a cap of 200 items per category.
 * Persists real on-chain ERC-8004 agents into the store (Supabase).
 */
import { searchAgentsSemantic, fetchRecentAgents, sleep, mapRawToAgent } from '../lib/8004scan.ts';
import { store } from '../lib/supabase.ts';

const CATEGORY_QUERIES = {
  rebalancing: [
    'rebalancing agent',
    'PancakeSwap V3 LP range',
    'concentrated liquidity reset',
    'uniswap v3 liquidity manager',
    'thena clmm rebalancer',
  ],
  grid: [
    'grid trading',
    'range trading bot',
    'DCA grid',
    'limit ladder market-making',
    'automated orderbook grid bot',
  ],
  health_factor: [
    'health factor',
    'liquidation protection',
    'Venus Aave loan agent',
    'collateral ratio guard',
    'lending position protector',
  ],
  yield: [
    'yield farming',
    'APY vault',
    'harvest allocate capital',
    'auto-compounding vault',
    'beefy alpaca yield optimizer',
  ],
};

const MAX_PER_CATEGORY = Number(process.env.MAX_PER_CATEGORY ?? 200);
const MAX_TOTAL_LATEST = Number(process.env.MAX_TOTAL_LATEST ?? 1000);

export async function runSemanticSync() {
  console.log('[Worker Sync] Starting targeted semantic crawl (capped at 200/category)...');
  const results: Record<string, number> = {
    rebalancing: 0,
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

  // Classify and probe crawled agents to assign categories and active signals
  try {
    const { runClassificationWorker } = await import('./classify.ts');
    await runClassificationWorker();
  } catch {}
  try {
    const { runProbeWorker } = await import('./probe.ts');
    await runProbeWorker();
  } catch {}

  console.log('[Worker Sync] Targeted crawl finished:', results);
  return results;
}

export async function runIncrementalSync(maxPages = 20) {
  const PAGE_SIZE = 100;
  const effectiveMax = Math.min(maxPages, Math.ceil(MAX_TOTAL_LATEST / PAGE_SIZE));
  console.log(`[Worker Sync] Running incremental sync for ${effectiveMax} pages (latest ${MAX_TOTAL_LATEST})...`);
  let totalAdded = 0;

  for (let page = 0; page < effectiveMax; page++) {
    const offset = page * PAGE_SIZE;
    const batch = await fetchRecentAgents(56, PAGE_SIZE, offset);
    if (batch.length === 0) break;

    for (const raw of batch) {
      // mapRawToAgent is shape-safe: lean list fields omitted — never overwrites existing DB values
      await store.upsertAgent(mapRawToAgent(raw as any));
      totalAdded++;
    }

    await sleep(2100);
  }

  return { totalAdded };
}

export async function runLatestSync() {
  // Convenience for 60m cron: fetch 1000 latest, then classify + probe to ensure filtered
  const inc = await runIncrementalSync(20);
  // Classify to apply labels filtering logic (excludes uncategorized)
  try {
    const { runClassificationWorker } = await import('./classify.ts');
    await runClassificationWorker();
  } catch {}
  try {
    const { runProbeWorker } = await import('./probe.ts');
    await runProbeWorker();
  } catch {}
  return inc;
}
