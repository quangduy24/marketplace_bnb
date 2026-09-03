/**
 * UX Writing & Category Tests — không cần DB/server, chạy độc lập.
 * Covers:
 *  1. classifyAgent — 4 category bắt buộc (rebalancing/grid/health_factor/yield) + uncategorized
 *  2. normalizeCareer (pixelAssets) — legacy alias monitoring → rebalancing
 *  3. mapRawToAgent (8004scan) — tag routing + hireable gate
 *  4. MemoryStore filters — activeOnly, category đa tag, includeUncategorized, alias rebalancing/monitoring
 *
 * Chạy: npx tsx test/ux-writing.test.ts
 */
import { classifyAgent, runClassificationUnitTests } from '../lib/classify.ts';
import { normalizeCareer } from '../src/components/game/pixelAssets.ts';
import { mapRawToAgent } from '../lib/8004scan.ts';
import { MemoryStore } from '../lib/supabase.ts';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function main() {  console.log('[ux-writing] 1. classifyAgent — 4 categories + uncategorized');
  const reb = classifyAgent('PancakeRebalancer', 'Automatically rebalances LP range and resets PancakeSwap V3 concentrated liquidity positions');
  check('rebalancing detected', reb.labels.includes('rebalancing'), reb.labels.join(','));

  const grid = classifyAgent('GridBot', 'Places grid trading orders with dca and limit ladder market-making');
  check('grid detected', grid.labels.includes('grid'), grid.labels.join(','));

  const hf = classifyAgent('VenusShield', 'Monitors health factor, collateral and liquidation risk on Venus');
  check('health_factor detected', hf.labels.includes('health_factor'), hf.labels.join(','));

  const yd = classifyAgent('YieldPro', 'Routes liquidity to the highest apy vault and auto-compounds yield');
  check('yield detected', yd.labels.includes('yield'), yd.labels.join(','));

  const uncat = classifyAgent('ChatBot42', 'Just a casual chatbot greeting people');
  check('uncategorized detected', uncat.labels.includes('uncategorized'), uncat.labels.join(','));

  console.log('[ux-writing] 2. built-in classification unit tests');
  const unit = runClassificationUnitTests();
  check('runClassificationUnitTests all pass', unit.passed, `${unit.testResults.filter((r) => !r.ok).length} failed`);

  console.log('[ux-writing] 3. normalizeCareer — legacy alias monitoring → rebalancing');
  check('normalizeCareer(monitoring) → rebalancing', normalizeCareer('monitoring') === 'rebalancing');
  check('normalizeCareer(watchtower) → rebalancing', normalizeCareer('watchtower') === 'rebalancing');
  check('normalizeCareer(grid) → grid', normalizeCareer('grid') === 'grid');
  check('normalizeCareer(health_factor) → health_factor', normalizeCareer('health_factor') === 'health_factor');
  check('normalizeCareer(yield) → yield', normalizeCareer('yield') === 'yield');
  check('normalizeCareer(demeter) → yield', normalizeCareer('demeter') === 'yield');

  console.log('[ux-writing] 4. mapRawToAgent — tag routing + hireable gate');
  const rawHf = mapRawToAgent({
    agent_id: '56:0xabc:1',
    name: 'Venus Guard',
    description: 'Protects lending positions from liquidation — 0.30 $U/hr',
    tags: ['health-factor', 'venus'],
    is_active: true,
    is_endpoint_verified: true,
    x402_supported: true,
  } as any);
  check('tag health-factor → labels health_factor', (rawHf.labels || []).includes('health_factor'), (rawHf.labels || []).join(','));
  check('hireable gate active+verified+rail', rawHf.hireable === true);
  check('hourlyCostU parsed', (rawHf.rawJson as any)?.hourlyCostU === '0.30');

  const rawInactive = mapRawToAgent({
    agent_id: '56:0xabc:2',
    name: 'Offline Bot',
    description: 'grid trading bot',
    tags: ['grid'],
    is_active: false,
    is_endpoint_verified: true,
    x402_supported: true,
  } as any);
  check('inactive → not hireable', rawInactive.hireable === false);
  check('inactive → labels still grid (đa tag lọc hiển thị)', (rawInactive.labels || []).includes('grid'));

  console.log('[ux-writing] 5. MemoryStore filters (seeds + custom)');
  const ms = new MemoryStore();
  ms.seedAgents();

  const active = await ms.getAgents(true);
  check('activeOnly=true trả về active labeled', active.length > 0);

  const rebPool = await ms.getAgents(false, 'rebalancing');
  check('category=rebalancing gồm alias monitoring', rebPool.some((a) => (a.labels || []).includes('rebalancing')), `rebPool=${rebPool.length}`);

  const gridPool = await ms.getAgents(false, 'grid');
  check('category=grid có agent grid', gridPool.some((a) => (a.labels || []).includes('grid')), `gridPool=${gridPool.length}`);

  const allNoUncat = await ms.getAgents(false);
  check('mặc định loại uncategorized', !allNoUncat.some((a) => (a.labels || []).includes('uncategorized')));

  await ms.upsertAgent({
    chainId: 56,
    agentId: 'ux-uncat-01',
    name: 'Generic Bot',
    description: 'nothing relevant',
    labels: ['uncategorized'],
    active: true,
    reachable: false,
    hireable: false,
    banditAlpha: 1, banditBeta: 1, successCount: 0, failureCount: 0,
  } as any);

  const withUncat = await ms.getAgents(false, 'all', false, true);
  check('includeUncategorized=true hiện uncategorized', withUncat.some((a) => a.agentId === 'ux-uncat-01'), `withUncat=${withUncat.length}`);

  const onlyUncat = await ms.getAgents(false, 'uncategorized', false, true);
  check('category=uncategorized chỉ trả về uncategorized', onlyUncat.length === 1 && onlyUncat[0].agentId === 'ux-uncat-01', `onlyUncat=${onlyUncat.length}`);

  // Đa tag: 1 agent 2 labels hiện ở cả 2 category
  await ms.upsertAgent({
    chainId: 56,
    agentId: 'ux-multi-01',
    name: 'Multi Bot',
    description: 'grid and yield',
    labels: ['grid', 'yield'],
    active: true,
    reachable: true,
    hireable: true,
    banditAlpha: 1, banditBeta: 1, successCount: 0, failureCount: 0,
  } as any);
  const inGrid = await ms.getAgents(false, 'grid');
  const inYield = await ms.getAgents(false, 'yield');
  check('đa tag: hiện ở grid', inGrid.some((a) => a.agentId === 'ux-multi-01'));
  check('đa tag: hiện ở yield', inYield.some((a) => a.agentId === 'ux-multi-01'));

  console.log(`\n[ux-writing] RESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
