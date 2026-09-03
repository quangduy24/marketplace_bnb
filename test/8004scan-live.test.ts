/**
 * 8004scan Real-time Live Pipeline Tests — không cần DB/server, chạy độc lập.
 * Covers:
 *  1. computeBanditPrior — seed Thompson prior từ total_feedbacks + average_score
 *  2. apiHeaders — X-API-Key gửi khi có key (server-side), vắng khi không có
 *  3. backoffFromRateLimit — đọc X-Ratelimit-Remaining-Minute
 *  4. mapRawToAgent — semantic full shape: active/reachable/hireable + bandit seed + rawJson enrichment
 *  5. mapRawToAgent — lean list shape: KHÔNG ghi đè active/reachable/hireable (shape-safe)
 *
 * Chạy: npx tsx test/8004scan-live.test.ts
 */
import {
  apiHeaders,
  backoffFromRateLimit,
  computeBanditPrior,
  isSemanticMatchRelevant,
  mapRawToAgent,
  mergeLiveAgent,
} from '../lib/8004scan.ts';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

function main() {
  console.log('[8004scan-live] 1. computeBanditPrior — seed Thompson prior từ registry reputation');
  const cold = computeBanditPrior(0, 0);
  check('cold-start (0 feedbacks) → prior 1/1', cold.banditAlpha === 1 && cold.banditBeta === 1, JSON.stringify(cold));

  const good = computeBanditPrior(10, 4);
  check('10 feedbacks, avg 4.0 → alpha 9 / beta 3', good.banditAlpha === 9 && good.banditBeta === 3, JSON.stringify(good));

  const perfect = computeBanditPrior(4, 5);
  check('4 feedbacks, avg 5.0 → alpha 5 / beta 1', perfect.banditAlpha === 5 && perfect.banditBeta === 1, JSON.stringify(perfect));

  const bad = computeBanditPrior(10, 0);
  check('10 feedbacks, avg 0 → alpha 1 / beta 11', bad.banditAlpha === 1 && bad.banditBeta === 11, JSON.stringify(bad));

  const noAvg = computeBanditPrior(10, null);
  check('avg null → prior 1/1 (không bịa reputation)', noAvg.banditAlpha === 1 && noAvg.banditBeta === 1, JSON.stringify(noAvg));

  const noN = computeBanditPrior(null, 4);
  check('feedbacks null → prior 1/1', noN.banditAlpha === 1 && noN.banditBeta === 1, JSON.stringify(noN));

  console.log('[8004scan-live] 2. apiHeaders — X-API-Key chỉ khi có key');
  const savedKey = process.env.API_8004scan_key;
  try {
    process.env.API_8004scan_key = '8004_test_key_123';
    const withKey = apiHeaders();
    check('có key → gửi X-API-Key', withKey['X-API-Key'] === '8004_test_key_123');
    check('luôn gửi Accept application/json', withKey['Accept'] === 'application/json');

    delete process.env.API_8004scan_key;
    const noKey = apiHeaders();
    check('không key → không có X-API-Key header', !('X-API-Key' in noKey), JSON.stringify(noKey));
  } finally {
    if (savedKey !== undefined) process.env.API_8004scan_key = savedKey;
    else delete process.env.API_8004scan_key;
  }

  console.log('[8004scan-live] 3. backoffFromRateLimit — đọc quota header');
  check(
    'remaining 5 → backoff 3000ms',
    backoffFromRateLimit(new Headers({ 'X-Ratelimit-Remaining-Minute': '5' })) === 3000
  );
  check(
    'remaining 100 → không cần backoff',
    backoffFromRateLimit(new Headers({ 'X-Ratelimit-Remaining-Minute': '100' })) === null
  );
  check('không có header → null', backoffFromRateLimit(new Headers()) === null);
  check('similarity 0.75 → giữ', isSemanticMatchRelevant(0.75));
  check('similarity 0.49 → loại', !isSemanticMatchRelevant(0.49));
  check('similarity null → giữ khi upstream không trả score', isSemanticMatchRelevant(null));

  console.log('[8004scan-live] 4. mapRawToAgent — semantic full shape (fixture response thật)');
  const semantic = mapRawToAgent({
    id: '905579a9-4004-45ad-9f5b-a0583be71686',
    agent_id: '56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:3127',
    token_id: '3127',
    chain_id: 56,
    chain_type: 'evm',
    owner_address: '0xbf0e0e7afde9b7f42f5d93d3aebde53af14bba70',
    creator_address: '0xbf0e0e7afde9b7f42f5d93d3aebde53af14bba70',
    agent_wallet: '0xbf0e0e7afde9b7f42f5d93d3aebde53af14bba70',
    name: 'Aegis Rebalancer',
    description: 'Automated portfolio rebalancing — 0.30 $U/hr',
    tags: ['rebalancing', 'pancake'],
    is_active: true,
    is_endpoint_verified: true,
    x402_supported: true,
    total_feedbacks: 10,
    average_score: 4,
    similarity_score: 0.81,
    scores: { rank: 94153, quality: 0.7, activity: 0.5, freshness: 0.4, popularity: 0.6 },
  } as any);
  check('labels chứa rebalancing', (semantic.labels || []).includes('rebalancing'), (semantic.labels || []).join(','));
  check('active = true', semantic.active === true);
  check('reachable = true (is_endpoint_verified)', semantic.reachable === true);
  check('hireable = true (active + verified + rail)', semantic.hireable === true);
  check('bandit seed: alpha 9 / beta 3', semantic.banditAlpha === 9 && semantic.banditBeta === 3, `${semantic.banditAlpha}/${semantic.banditBeta}`);
  check('rawJson.agentWallet lưu ví agent', (semantic.rawJson as any)?.agentWallet === '0xbf0e0e7afde9b7f42f5d93d3aebde53af14bba70');
  check('rawJson.similarityScore = 0.81', (semantic.rawJson as any)?.similarityScore === 0.81);
  check('rawJson.registryRank lấy từ scores.rank', (semantic.rawJson as any)?.registryRank === 94153);
  check('rawJson.creatorAddress lưu creator', (semantic.rawJson as any)?.creatorAddress === '0xbf0e0e7afde9b7f42f5d93d3aebde53af14bba70');
  check('hourlyCostU parsed', (semantic.rawJson as any)?.hourlyCostU === '0.30');

  console.log('[8004scan-live] 5. mergeLiveAgent — refresh registry data, preserve marketplace outcomes');
  const merged = mergeLiveAgent({
    chainId: 56,
    agentId: semantic.agentId,
    name: 'Old cached name',
    successCount: 3,
    failureCount: 1,
    banditAlpha: 4,
    banditBeta: 2,
    rawJson: { localMetric: 'kept', similarityScore: 0.1 },
  } as any, semantic);
  check('live identity refreshes cached record', merged.name === 'Aegis Rebalancer', String(merged.name));
  check('local success/failure counts preserved', merged.successCount === 3 && merged.failureCount === 1);
  check('registry prior + local outcomes combine to 12/4', merged.banditAlpha === 12 && merged.banditBeta === 4, `${merged.banditAlpha}/${merged.banditBeta}`);
  check('rawJson keeps local-only metrics', (merged.rawJson as any)?.localMetric === 'kept');
  check('rawJson refreshes live similarity', (merged.rawJson as any)?.similarityScore === 0.81);

  console.log('[8004scan-live] 6. mapRawToAgent — lean list shape (fixture response thật)');
  const lean = mapRawToAgent({
    id: '44627d48-3703-4294-83c2-1f2389c66922',
    agent_id: '56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:332381',
    token_id: '332381',
    chain_id: 56,
    chain_type: 'evm',
    owner_address: '0xb9bae6b78bc99bdd5d1fe5304133b7346af141df',
    name: 'IynHWPozQ.agent',
    description: 'IynHWPozQ.agent on Termix Platform',
    supported_protocols: ['A2A'],
    x402_supported: false,
    is_verified: false,
    total_feedbacks: 0,
    average_score: 0,
    health_score: null,
  } as any);
  check('lean: không ghi đè active (field vắng)', !('active' in lean), JSON.stringify({ active: lean.active }));
  check('lean: không ghi đè status (field vắng)', !('status' in lean));
  check('lean: không ghi đè reachable (field vắng)', !('reachable' in lean));
  check('lean: không ghi đè hireable (field vắng)', !('hireable' in lean));
  check('lean: bandit prior vẫn seed từ feedbacks (0 → 1/1)', lean.banditAlpha === 1 && lean.banditBeta === 1);
  check('lean: identity fields vẫn map đủ', lean.agentId === '56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:332381' && lean.owner === '0xb9bae6b78bc99bdd5d1fe5304133b7346af141df');

  console.log(`\n[8004scan-live] RESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
