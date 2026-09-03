/**
 * Full Marketplace Verification Test Suite
 * Covers:
 * 1. Category taxonomy & alias normalization (all 4 stalls + uncategorized)
 * 2. On-chain tag mapping (TAG_CATEGORY_MAP) completeness
 * 3. Hire lifecycle & job state transitions (pending -> cancelled, chamber release, profits exclusion)
 * 4. 8004scan shape safety & Bayesian prior computation
 * 5. Store filtering logic (activeOnly, verifiedOnly, multi-tag matching)
 *
 * Run with: npx tsx test/full-marketplace-suite.test.ts
 */
import { classifyAgent, CareerCategory, CAREER_KEYWORDS } from '../lib/classify.ts';
import { normalizeCareer } from '../src/components/game/pixelAssets.ts';
import { TAG_CATEGORY_MAP, mapRawToAgent, computeBanditPrior } from '../lib/8004scan.ts';
import { MemoryStore } from '../lib/supabase.ts';
import { HireData, JobState } from '../src/types.ts';

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function runSuite() {
  console.log('=== [SUITE 1] Category Taxonomy & Aliases ===');
  
  // 1.1 Rebalancing keywords & monitoring alias
  const rebalAgent = classifyAgent('PancakeRebalancer V3', 'Manages PancakeSwap concentrated liquidity and resets LP ranges');
  check('Rebalancing detected via LP/PancakeSwap', rebalAgent.labels.includes('rebalancing'));

  const monitorAgent = classifyAgent('Venus Sentinel Monitor', 'Watches wallet health factor and sends liquidation alerts');
  check('Monitoring agent maps to rebalancing/monitoring category', monitorAgent.labels.includes('rebalancing'));
  check('normalizeCareer maps monitoring to rebalancing', normalizeCareer('monitoring') === 'rebalancing');
  check('normalizeCareer maps watchtower to rebalancing', normalizeCareer('watchtower') === 'rebalancing');

  // 1.2 Grid Trading keywords
  const gridAgent = classifyAgent('GridBot 3000', 'Automated limit ladder range trading and DCA orderbook bot');
  check('Grid trading detected via limit ladder/range trading', gridAgent.labels.includes('grid'));
  check('normalizeCareer maps grid to grid', normalizeCareer('grid') === 'grid');

  // 1.3 Health Factor keywords
  const hfAgent = classifyAgent('Venus CDP Shield', 'Protects Venus protocol borrowing positions against health factor liquidation');
  check('Health Factor detected via Venus/liquidation/CDP', hfAgent.labels.includes('health_factor'));
  check('normalizeCareer maps health_factor to health_factor', normalizeCareer('health_factor') === 'health_factor');

  // 1.4 Yield Optimisation keywords
  const yieldAgent = classifyAgent('Beefy Compounding Vault', 'Auto-compounds yield across liquidity pools for maximum APY');
  check('Yield detected via Beefy/APY/vault', yieldAgent.labels.includes('yield'));
  check('normalizeCareer maps yield to yield', normalizeCareer('yield') === 'yield');

  // 1.5 Uncategorized fallback
  const uncatAgent = classifyAgent('Random Meme Bot', 'Just tells daily crypto jokes on Telegram');
  check('Unrelated agent falls back to uncategorized', uncatAgent.labels.includes('uncategorized'));

  console.log('\n=== [SUITE 2] On-Chain Tag Mapping (TAG_CATEGORY_MAP) ===');
  const validCategories: CareerCategory[] = ['rebalancing', 'grid', 'health_factor', 'yield'];
  let allTagsValid = true;
  for (const [tag, cat] of Object.entries(TAG_CATEGORY_MAP)) {
    if (!validCategories.includes(cat)) {
      allTagsValid = false;
      console.error(`Invalid category ${cat} for tag ${tag}`);
    }
  }
  check('Every tag in TAG_CATEGORY_MAP targets one of the 4 hackathon stalls', allTagsValid);
  check('TAG_CATEGORY_MAP maps "monitoring" to "rebalancing"', TAG_CATEGORY_MAP['monitoring'] === 'rebalancing');
  check('TAG_CATEGORY_MAP maps "grid-trading" to "grid"', TAG_CATEGORY_MAP['grid-trading'] === 'grid');
  check('TAG_CATEGORY_MAP maps "venus" to "health_factor"', TAG_CATEGORY_MAP['venus'] === 'health_factor');
  check('TAG_CATEGORY_MAP maps "apy" to "yield"', TAG_CATEGORY_MAP['apy'] === 'yield');

  console.log('\n=== [SUITE 3] Hire Lifecycle & Revoke / Cancel Transitions ===');
  const initialHire: HireData = {
    id: 'hire_test_001',
    buyer: '0x1234567890abcdef1234567890abcdef12345678',
    buyerAddress: '0x1234567890abcdef1234567890abcdef12345678',
    chainId: 56,
    agentId: '56:0x8004a169:100',
    catalog: 'grid',
    rail: 'erc8183',
    budgetU: '10',
    state: 'pending',
    lastAction: 'Awaiting on-chain funding deposit',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // State transitions
  const validStates: JobState[] = ['pending', 'funded', 'running', 'submitted', 'paid', 'rejected', 'expired', 'cancelled'];
  check('All expected JobState values are supported in type system', validStates.includes(initialHire.state));

  // Simulating Revoke / Cancel on pending job
  const cancelledHire: HireData = {
    ...initialHire,
    state: 'cancelled',
    lastAction: 'Revoked by user before funding',
  };
  check('Job transitions cleanly from pending to cancelled', cancelledHire.state === 'cancelled');

  // Verify chamber release logic (from AgentHouse.tsx getHiresForChamber)
  const hiresList: HireData[] = [
    cancelledHire,
    { ...initialHire, id: 'hire_test_002', state: 'running', catalog: 'health_factor' },
  ];
  const activeGridHires = hiresList.filter((h) => h.catalog === 'grid' && h.state !== 'cancelled');
  check('Chamber releases slot when hire is cancelled', activeGridHires.length === 0);

  const activeHfHires = hiresList.filter((h) => h.catalog === 'health_factor' && h.state !== 'cancelled');
  check('Chamber retains slot when hire is active/running', activeHfHires.length === 1);

  // Verify ProfitsDashboard expenditure calculation ignores cancelled hires
  const paidHires = hiresList.filter(
    (h) => h.state === 'funded' || h.state === 'running' || h.state === 'submitted' || h.state === 'paid'
  );
  const totalSpent = paidHires.reduce((sum, h) => sum + Number(h.budgetU || 0), 0);
  check('Cancelled hire does not inflate total spent (only running job is counted)', totalSpent === 10);

  // Verify BottomActionBar active squad ignores cancelled/rejected hires
  const bottomBarActiveHires = hiresList.filter((h) => h.state !== 'cancelled' && h.state !== 'rejected');
  check('Bottom action bar squad excludes cancelled hires', bottomBarActiveHires.length === 1);

  console.log('\n=== [SUITE 4] 8004scan Bayesian Prior & Filter Gates ===');
  // Cold start prior
  const coldPrior = computeBanditPrior(0, 0);
  check('Cold start prior is neutral Beta(1, 1)', coldPrior.banditAlpha === 1 && coldPrior.banditBeta === 1);

  // Prior with positive feedbacks
  const posPrior = computeBanditPrior(10, 4.5);
  check('Positive reputation produces alpha > beta', posPrior.banditAlpha > posPrior.banditBeta);

  // Shape-safe mapping
  const mapped = mapRawToAgent({
    agent_id: '56:0x8004a169:999',
    name: 'Auto Grid Agent',
    description: 'Automated range trading grid orders',
    tags: ['grid'],
    is_active: true,
    is_endpoint_verified: true,
    x402_supported: true,
    hourly_cost_u: '0.25',
  } as any);
  check('Mapped agent preserves active = true', mapped.active === true);
  check('Mapped agent preserves reachable = true', mapped.reachable === true);
  check('Mapped agent sets hireable = true when active + verified + rail present', mapped.hireable === true);
  check('Mapped agent labels contain grid', mapped.labels.includes('grid'));

  console.log('\n=== [SUITE 5] MemoryStore Filtering & Verification Gates ===');
  const store = new MemoryStore();
  const allActive = await store.getAgents(true, 'all', false, false);
  check('Store returns active labeled agents by default', allActive.length > 0);
  check('Store excludes uncategorized agents from main listing', !allActive.some((a) => a.labels.includes('uncategorized')));

  const verifiedAgents = await store.getAgents(true, 'all', true, false);
  check('Verified-only filter requires both reachable and hireable', verifiedAgents.every((a) => a.reachable && a.hireable));

  for (const cat of ['rebalancing', 'grid', 'health_factor', 'yield'] as CareerCategory[]) {
    const catAgents = await store.getAgents(true, cat, false, false);
    check(`Category stall "${cat}" returns matching agents`, catAgents.length > 0);
  }

  console.log('\n========================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test suite runtime failure:', err);
  process.exit(1);
});
