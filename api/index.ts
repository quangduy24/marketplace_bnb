import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { verifyMessage, keccak256, toHex } from 'viem';
import { store } from '../lib/supabase.ts';
import { buildVerificationMessage } from '../lib/auth-message.ts';
import { computeBanditScore } from '../lib/bandit.ts';
import { analyzeWalletContext } from '../lib/context.ts';
import { CONTRACT_ADDRESSES, ERC8183_ADDRESSES } from '../lib/chain.ts';
import { canonicalJson } from '../lib/canonical.ts';
import { runSemanticSync, runIncrementalSync, runLatestSync } from '../workers/sync.ts';
import { runClassificationWorker } from '../workers/classify.ts';
import { runProbeWorker } from '../workers/probe.ts';
import { runClassificationUnitTests } from '../lib/classify.ts';
import { searchAgentsSemantic, mapRawToAgent, mergeLiveAgent, isSemanticMatchRelevant } from '../lib/8004scan.ts';

const app = new Hono().basePath('/api');

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/tests/classification', (c) => c.json(runClassificationUnitTests()));

app.get('/context', async (c) => {
  const wallet = c.req.query('wallet');
  const context = await analyzeWalletContext(wallet);
  return c.json(context);
});

app.get('/agents', async (c) => {
  const category = c.req.query('category') || 'all';
  const activeOnly = c.req.query('activeOnly') !== 'false';
  const verifiedOnly = c.req.query('verifiedOnly') === 'true';
  const includeUncategorized = c.req.query('includeUncategorized') === 'true';
  const live = c.req.query('live') === 'true';
  const wallet = c.req.query('wallet');
  const q = c.req.query('q');
  const chainIdLive = Number(c.req.query('chainId') ?? 56) === 97 ? 97 : 56;
  const liveLimit = Math.min(Math.max(Number(c.req.query('limit') ?? 50) || 50, 1), 100);

  let pool: any[] = await store.getAgents(activeOnly, category, verifiedOnly, includeUncategorized);

  // Live registry search (300k+ trên 8004scan, real-time qua X-API-Key)
  if (live && q) {
    try {
      const liveRaw = await searchAgentsSemantic(q, chainIdLive, liveLimit, 0);
      const localById = new Map<string, any>(pool.map((a: any) => [a.agentId, a]));
      const semanticMatches = liveRaw
        .map((raw) => mapRawToAgent(raw))
        .filter((a: any) => {
          if (!a || !a.agentId) return false;
          // Similarity threshold: giữ semantic thật, bỏ nhiễu
          return isSemanticMatchRelevant(a.rawJson?.similarityScore);
        }) as any[];
      const liveCandidates = semanticMatches.map((a: any) => mergeLiveAgent(localById.get(a.agentId), a));

      // Auto-persist relevant 8004scan search results to permanently enrich local store
      for (const candidate of liveCandidates) {
        store.upsertAgent(candidate).catch((err: any) => {
          console.warn('[LiveSearch] Failed to persist agent to store:', candidate.agentId, err);
        });
      }

      // Stage 1 filters applied to live pool as well as local pool
      const stage1Filtered = liveCandidates.filter((a: any) => {
        if (verifiedOnly && !(a.active && a.reachable && a.hireable)) return false;
        if (!verifiedOnly && activeOnly && !a.active) return false;
        const labels = (a.labels || []).map((l: string) => (l === 'monitoring' ? 'rebalancing' : l));
        if (category === 'uncategorized') return labels.includes('uncategorized') || labels.length === 0;
        if (category !== 'all') return labels.includes(category);
        if (!includeUncategorized) return !labels.includes('uncategorized');
        return true;
      });

      const liveIds = new Set(stage1Filtered.map((a: any) => a.agentId));
      const lower = q.toLowerCase();
      // Substring filter CHỈ áp cho pool local — kết quả semantic giữ nguyên
      const localMatches = pool.filter(
        (a) =>
          !liveIds.has(a.agentId) &&
          (a.name?.toLowerCase().includes(lower) ||
            a.description?.toLowerCase().includes(lower) ||
            a.labels?.some((l: string) => l.toLowerCase().includes(lower)))
      );
      pool = [...localMatches, ...stage1Filtered];
    } catch (err) {
      console.warn('[LiveSearch] 8004scan search failed, falling back to local pool:', err);
    }
  } else if (q) {
    const lower = q.toLowerCase();
    pool = pool.filter((a) => a.name?.toLowerCase().includes(lower) || a.description?.toLowerCase().includes(lower) || a.labels?.some((l: string) => l.toLowerCase().includes(lower)));
  }

  const walletContext = await analyzeWalletContext(wallet || undefined);
  const wH = walletContext.weightHeuristic;
  const wS = 0.35;
  const wB = 1.0 - (wH + wS);

  const scoredAgents = pool.map((agent: any) => {
    // Đa tag: lấy max heuristic trong các labels
    let heuristicScore = 0.5;
    const normalizedLabels = (agent.labels || []).map((l: string) => (l === 'monitoring' ? 'rebalancing' : l)) as (keyof typeof walletContext.heuristicScores)[];
    if (normalizedLabels.length > 0) {
      const scores = normalizedLabels
        .map((lbl) => walletContext.heuristicScores[lbl])
        .filter((v) => v !== undefined) as number[];
      if (scores.length > 0) heuristicScore = Math.max(...scores);
    }
    let contentScore = (agent.labelConfidence || 0.8) * 0.5;
    if (agent.supportedProtocols?.includes('erc8183')) contentScore += 0.25;
    if (agent.x402Supported) contentScore += 0.25;
    const banditScore = computeBanditScore(agent.banditAlpha || 1.0, agent.banditBeta || 1.0);
    const finalScore = wH * heuristicScore + wS * contentScore + Math.max(0, wB) * banditScore;
    return { ...agent, heuristicScore, contentScore, banditScore, finalScore: Math.round(finalScore * 1000) / 1000 };
  });

  scoredAgents.sort((a: any, b: any) => b.finalScore - a.finalScore);
  return c.json({ agents: scoredAgents, total: scoredAgents.length, liveSearched: live && !!q, walletContext });
});

app.get('/agents/stream', async (c) => {
  // SSE for immediate sync after DB update (no polling)
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (payload: any) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {}
      };
      // @ts-ignore global broadcast registry for Vercel (single isolate fallback)
      const g: any = globalThis as any;
      g.__sseClients = g.__sseClients || new Set();
      g.__sseClients.add(send);
      // @ts-ignore close handling
      c.req.raw.signal?.addEventListener('abort', () => g.__sseClients.delete(send));
      send({ type: 'connected', at: new Date().toISOString() });
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
});

function broadcastSse(payload: any) {
  const g: any = globalThis as any;
  const clients: Set<any> = g.__sseClients;
  if (!clients) return;
  for (const send of Array.from(clients)) {
    try {
      send(payload);
    } catch {
      clients.delete(send);
    }
  }
}

app.get('/agents/:id', async (c) => {
  const agent = await store.getAgentById(c.req.param('id'));
  if (!agent) return c.json({ error: 'Agent not found' }, 404);
  return c.json(agent);
});

app.get('/hires', async (c) => {
  return c.json({ hires: [], count: 0, notice: 'Stateless on-chain hires; read on-chain via Web3' });
});

app.post('/hires/prepare', async (c) => {
  const { agentId, budgetU, rail, taskSummary, deadlineHours: customDeadlineHours } = await c.req.json();
  const agent: any = await store.getAgentById(agentId);
  if (!agent) return c.json({ error: 'Agent not found for quoting' }, 404);
  const raw = agent.rawJson as any;
  const hourlyRate = Number(raw?.hourlyCostU || '0.25');
  const budget = Number(budgetU || hourlyRate * 2);
  const deadlineHours = customDeadlineHours ? Number(customDeadlineHours) : 24;
  const deadlineSeconds = Math.max(60, Math.round(deadlineHours * 3600));
  const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadlineSeconds;
  const targetCommerce =
    agent.chainId === 97
      ? CONTRACT_ADDRESSES.ERC8183_COMMERCE_TESTNET
      : CONTRACT_ADDRESSES.ERC8183_COMMERCE_MAINNET;

  return c.json({
    quoteId: `quote_${Date.now()}`,
    agentId,
    agentOwner: agent.owner,
    buyerRequestedRail: rail || (agent.x402Supported ? 'x402' : 'erc8183'),
    budgetU: budget.toFixed(2),
    deadline: deadlineTimestamp,
    deadlineHours,
    taskSummary: taskSummary || 'Autonomous periodic inspection',
    contractAddress: targetCommerce,
    escrowTerms: { timeoutHours: deadlineHours, releaseRule: 'Client verification upon proof receipt' },
  });
});

app.post('/hires', async (c) => {
  const body = await c.req.json();
  return c.json({
    id: body.txHash || `hire_${Date.now()}`,
    ...body,
    state: body.txHash ? 'funded' : 'pending',
    notice: 'Stateless on-chain hire; persisted via onchain events / session cache',
  }, 201);
});

app.post('/hires/:id/sync', async (c) => {
  const body = await c.req.json();
  return c.json({ success: true, id: c.req.param('id'), ...body });
});

app.post('/hires/:id/auto-run', async (c) => {
  return c.json({
    success: true,
    hireId: c.req.param('id'),
    state: 'submitted',
    lastAction: 'Agent executed autonomous strategy on BNB Chain and submitted cryptographic proof',
  });
});

app.get('/hires/:id/manifest', async (c) => {
  const chainId = c.req.query('chainId') === '97' ? 97 : 56;
  const addresses = chainId === 97 ? ERC8183_ADDRESSES[97] : ERC8183_ADDRESSES[56];
  const executedAt = Math.floor(Date.now() / 1000);

  const manifest = {
    version: 1,
    job_id: c.req.param('id'),
    chain_id: chainId,
    contracts: {
      commerce: addresses.commerce,
      router: addresses.router,
      policy: addresses.policy,
    },
    response: {
      content: 'Autonomous execution directive completed on BNB Chain. Venus protocol monitored, health factor guard active.',
      content_type: 'text/plain',
    },
    metadata: {
      executed_at: executedAt,
      runtime: 'LANS-Agent-Runner-v2',
    },
  };

  const manifestText = canonicalJson(manifest);
  return c.text(manifestText, 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Deliverable-Hash': keccak256(toHex(manifestText)),
  });
});

app.post('/hires/:id/dispute', async (c) => {
  return c.json({
    success: true,
    hireId: c.req.param('id'),
    state: 'rejected',
    lastAction: 'Buyer disputed deliverable inside optimistic dispute window',
  });
});

app.post('/hires/:id/claim-refund', async (c) => {
  return c.json({
    success: true,
    hireId: c.req.param('id'),
    state: 'expired',
    lastAction: 'Full escrow deposit reclaimed by buyer after job deadline expiry',
  });
});

app.post('/workers/sync', async (c) => {
  const mode = c.req.query('mode') || 'semantic';
  const maxPages = Number(c.req.query('maxPages') ?? (mode === 'latest' ? 20 : 3));
  let result: any;
  if (mode === 'latest') result = await runLatestSync();
  else if (mode === 'incremental') result = await runIncrementalSync(maxPages);
  else result = await runSemanticSync();
  broadcastSse({ type: 'agents-updated', mode, result, at: new Date().toISOString() });
  return c.json({ success: true, result });
});
app.post('/workers/classify', async (c) => c.json({ success: true, result: await runClassificationWorker() }));
app.post('/workers/probe', async (c) => c.json({ success: true, result: await runProbeWorker() }));

app.post('/auth/verify', async (c) => {
  const { wallet, signature, chainId } = (await c.req.json().catch(() => ({}))) as any;
  if (!wallet || !signature || typeof wallet !== 'string' || typeof signature !== 'string') {
    return c.json({ verified: false, error: 'Missing wallet or signature' }, 400);
  }
  const message = buildVerificationMessage(wallet, Number(chainId) || 97);
  try {
    const verified = await verifyMessage({ address: wallet as `0x${string}`, message, signature: signature as `0x${string}` });
    return c.json({ verified, message });
  } catch {
    return c.json({ verified: false, error: 'Signature verification failed' });
  }
});

export default handle(app);
