import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { verifyMessage } from 'viem';
import { store } from '../lib/supabase.ts';
import { buildVerificationMessage } from '../lib/auth-message.ts';
import { computeBanditScore } from '../lib/bandit.ts';
import { analyzeWalletContext } from '../lib/context.ts';
import { CONTRACT_ADDRESSES } from '../lib/chain.ts';
import { runSemanticSync, runIncrementalSync, runLatestSync } from '../workers/sync.ts';
import { runClassificationWorker } from '../workers/classify.ts';
import { runProbeWorker } from '../workers/probe.ts';
import { runClassificationUnitTests } from '../lib/classify.ts';

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
  const wallet = c.req.query('wallet');
  const q = c.req.query('q');

  let pool = await store.getAgents(activeOnly, category, verifiedOnly);
  if (q) {
    const lower = q.toLowerCase();
    pool = pool.filter((a) => a.name?.toLowerCase().includes(lower) || a.description?.toLowerCase().includes(lower));
  }

  const walletContext = await analyzeWalletContext(wallet || undefined);
  const wH = walletContext.weightHeuristic;
  const wS = 0.35;
  const wB = 1.0 - (wH + wS);

  const scoredAgents = pool.map((agent: any) => {
    let heuristicScore = 0.5;
    const firstLabel = agent.labels?.[0] as keyof typeof walletContext.heuristicScores;
    if (firstLabel && walletContext.heuristicScores[firstLabel] !== undefined) {
      heuristicScore = walletContext.heuristicScores[firstLabel];
    }
    let contentScore = (agent.labelConfidence || 0.8) * 0.5;
    if (agent.supportedProtocols?.includes('erc8183')) contentScore += 0.25;
    if (agent.x402Supported) contentScore += 0.25;
    const banditScore = computeBanditScore(agent.banditAlpha || 1.0, agent.banditBeta || 1.0);
    const finalScore = wH * heuristicScore + wS * contentScore + Math.max(0, wB) * banditScore;
    return { ...agent, heuristicScore, contentScore, banditScore, finalScore: Math.round(finalScore * 1000) / 1000 };
  });

  scoredAgents.sort((a: any, b: any) => b.finalScore - a.finalScore);
  return c.json({ agents: scoredAgents, total: scoredAgents.length, walletContext });
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
  const buyer = c.req.query('buyer');
  const hiresList = await store.getHires(buyer || undefined);
  return c.json({ hires: hiresList, count: hiresList.length });
});

app.post('/hires/prepare', async (c) => {
  const { agentId, budgetU, rail, taskSummary } = await c.req.json();
  const agent: any = await store.getAgentById(agentId);
  if (!agent) return c.json({ error: 'Agent not found for quoting' }, 404);
  const raw = agent.rawJson as any;
  const hourlyRate = Number(raw?.hourlyCostU || '0.25');
  const budget = Number(budgetU || hourlyRate * 2);
  const deadlineTimestamp = Math.floor(Date.now() / 1000) + 24 * 3600;
  return c.json({
    quoteId: `quote_${Date.now()}`,
    agentId,
    agentOwner: agent.owner,
    buyerRequestedRail: rail || (agent.x402Supported ? 'x402' : 'erc8183'),
    budgetU: budget.toFixed(2),
    deadline: deadlineTimestamp,
    taskSummary: taskSummary || 'Autonomous periodic inspection',
    contractAddress: agent.chainId === 97 ? CONTRACT_ADDRESSES.ERC8004_TESTNET : CONTRACT_ADDRESSES.ERC8004_MAINNET,
    escrowTerms: { timeoutHours: 24, releaseRule: 'Client verification upon proof receipt' },
  });
});

app.post('/hires', async (c) => {
  const { buyer, buyerAddress, chainId, agentId, catalog, rail, jobId, txHash, budgetU, lastAction } = await c.req.json();
  const resolvedBuyer = buyer || buyerAddress;
  if (!resolvedBuyer || !agentId || !catalog || !rail) {
    return c.json({ error: 'Missing required hire fields (buyer, agentId, catalog, rail)' }, 400);
  }
  const hire = await store.addHire({
    buyer: resolvedBuyer,
    chainId: chainId || 97,
    agentId,
    catalog,
    rail,
    jobId: jobId || `job_bsc_${Date.now()}`,
    txs: txHash ? [txHash] : [],
    state: txHash ? 'funded' : 'pending',
    budgetU: budgetU ? String(budgetU) : '10.00',
    artifactUri: null,
    lastAction: lastAction || (txHash ? 'Escrow deposit funded by buyer on BSC' : 'Awaiting on-chain escrow funding'),
  });
  return c.json(hire, 201);
});

app.post('/hires/:id/sync', async (c) => {
  const { state, txHash, artifactUri, lastAction } = await c.req.json();
  const hire: any = await store.getHireById(c.req.param('id'));
  if (!hire) return c.json({ error: 'Hire record not found' }, 404);
  const updates: any = {};
  if (state) updates.state = state;
  if (artifactUri) updates.artifactUri = artifactUri;
  if (lastAction) updates.lastAction = lastAction;
  if (txHash && !hire.txs?.includes(txHash)) updates.txs = [...(hire.txs || []), txHash];
  const updated = await store.updateHire(c.req.param('id'), updates);
  return c.json(updated);
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
