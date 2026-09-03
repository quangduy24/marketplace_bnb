import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { verifyMessage } from 'viem';
import { store, db } from './lib/supabase.ts';
import { ensureSchema } from './lib/bootstrap.ts';
import { buildVerificationMessage } from './lib/auth-message.ts';
import { computeBanditScore } from './lib/bandit.ts';
import { analyzeWalletContext } from './lib/context.ts';
import { CONTRACT_ADDRESSES } from './lib/chain.ts';
import { runSemanticSync, runIncrementalSync, runLatestSync } from './workers/sync.ts';
import { runClassificationWorker } from './workers/classify.ts';
import { runProbeWorker } from './workers/probe.ts';
import { runClassificationUnitTests } from './lib/classify.ts';
import { addSseClient, broadcast } from './lib/sync-broadcast.ts';
import { searchAgentsSemantic, mapRawToAgent } from './lib/8004scan.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT ?? 3000);

  // Ensure Supabase schema exists before serving traffic
  if (db) {
    try {
      await ensureSchema(db);
    } catch (err) {
      console.warn('[Bootstrap] ensureSchema failed (falling back to whatever exists):', err);
    }
  }

  app.use(express.json());

  // API Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Unit tests endpoint
  app.get('/api/tests/classification', (_req, res) => {
    const results = runClassificationUnitTests();
    res.json(results);
  });

  // Portfolio context & heuristics for recommendation engine
  app.get('/api/context', async (req, res) => {
    const wallet = req.query.wallet as string | undefined;
    const context = await analyzeWalletContext(wallet);
    res.json(context);
  });

  // List & Rank Agents with 2-Stage Recommendation Engine
  app.get('/api/agents', async (req, res) => {
    const { category, activeOnly = 'true', verifiedOnly = 'false', includeUncategorized = 'false', live = 'false', wallet, q } = req.query;
    const isActiveOnly = activeOnly === 'true';
    const isVerifiedOnly = verifiedOnly === 'true';
    const includeUncat = includeUncategorized === 'true';
    const categoryStr = (category as string) || 'all';

    // Stage 1: Hard SQL/Store filter (real DB when configured)
    // verifiedOnly adds reachable && hireable; default lists every active labeled agent.
    // includeUncategorized=true dùng cho search ngoài Image 1 để chạm 769 (bao gồm inactive & Other)
    let pool = await store.getAgents(isActiveOnly, categoryStr, isVerifiedOnly, includeUncat);

    // Live registry search (300k+ trên 8004scan) — khi user search Include inactive & Other để có nhiều kết quả hơn
    if (live === 'true' && q && typeof q === 'string') {
      try {
        const liveRaw = await searchAgentsSemantic(String(q), 56, 50, 0);
        const existingIds = new Set(pool.map((a: any) => a.agentId));
        const fresh = liveRaw
          .map((raw) => mapRawToAgent(raw))
          .filter((a: any) => a && a.agentId && !existingIds.has(a.agentId)) as any[];
        pool = [...pool, ...fresh];
        const lower = q.toLowerCase();
        pool = pool.filter(
          (a) => a.name?.toLowerCase().includes(lower) || a.description?.toLowerCase().includes(lower) || a.labels?.some((l: string) => l.toLowerCase().includes(lower))
        );
      } catch (err) {
        console.warn('[LiveSearch] 8004scan search failed, falling back to local pool:', err);
      }
    } else if (q && typeof q === 'string') {
      // Search filter — đa tag: tìm trong name/description/labels
      const lower = q.toLowerCase();
      pool = pool.filter(
        (a) => a.name?.toLowerCase().includes(lower) || a.description?.toLowerCase().includes(lower) || a.labels?.some((l: string) => l.toLowerCase().includes(lower))
      );
    }

    // Stage 2: Hybrid Recommendation Ranking
    const walletContext = await analyzeWalletContext(wallet as string | undefined);
    const wH = walletContext.weightHeuristic;
    const wS = 0.35;
    const wB = 1.0 - (wH + wS);

    const scoredAgents = pool.map((agent) => {
      // 1. Heuristic Score — đa tag: lấy max heuristic trong các labels (1 agent có thể thuộc nhiều category)
      let heuristicScore = 0.5;
      const normalizedLabels = (agent.labels || []).map((l: string) => (l === 'monitoring' ? 'rebalancing' : l)) as (keyof typeof walletContext.heuristicScores)[];
      if (normalizedLabels.length > 0) {
        const scores = normalizedLabels
          .map((lbl) => walletContext.heuristicScores[lbl])
          .filter((v) => v !== undefined) as number[];
        if (scores.length > 0) heuristicScore = Math.max(...scores);
      }

      // 2. Content / Quality Score
      let contentScore = (agent.labelConfidence || 0.8) * 0.5;
      if (agent.supportedProtocols?.includes('erc8183')) contentScore += 0.25;
      if (agent.x402Supported) contentScore += 0.25;

      // 3. Bayesian Thompson Sampling Bandit Score
      const banditScore = computeBanditScore(agent.banditAlpha || 1.0, agent.banditBeta || 1.0);

      // Final hybrid score
      const finalScore = wH * heuristicScore + wS * contentScore + Math.max(0, wB) * banditScore;

      return {
        ...agent,
        heuristicScore,
        contentScore,
        banditScore,
        finalScore: Math.round(finalScore * 1000) / 1000,
      };
    });

    // Sort descending by FinalScore
    scoredAgents.sort((a, b) => b.finalScore - a.finalScore);

    res.json({
      agents: scoredAgents,
      total: scoredAgents.length,
      liveSearched: live === 'true' && typeof q === 'string' && q.trim().length > 0,
      walletContext,
    });
  });

  // SSE: immediate Backend → Frontend sync (no polling) - MUST be before :id route
  app.get('/api/agents/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 10000\n\n');
    const cleanup = addSseClient(res);
    req.on('close', cleanup);
  });

  // Get Agent Detail
  app.get('/api/agents/:id', async (req, res) => {
    const agent = await store.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  });

  // List Hires (optionally filtered by buyer)
  app.get('/api/hires', async (req, res) => {
    const buyer = req.query.buyer as string | undefined;
    const hiresList = await store.getHires(buyer);
    res.json({ hires: hiresList, count: hiresList.length });
  });

  // Prepare quote payload for hiring (ERC-8183 / x402)
  app.post('/api/hires/prepare', async (req, res) => {
    const { agentId, budgetU, rail, taskSummary } = req.body;
    const agent = await store.getAgentById(agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found for quoting' });
    }

    const raw = agent.rawJson as any;
    const hourlyRate = Number(raw?.hourlyCostU || '0.25');
    const budget = Number(budgetU || hourlyRate * 2);
    const deadlineHours = 24;
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadlineHours * 3600;

    const quotePayload = {
      quoteId: `quote_${Date.now()}`,
      agentId,
      agentOwner: agent.owner,
      buyerRequestedRail: rail || (agent.x402Supported ? 'x402' : 'erc8183'),
      budgetU: budget.toFixed(2),
      deadline: deadlineTimestamp,
      taskSummary: taskSummary || 'Autonomous periodic inspection',
      contractAddress:
        agent.chainId === 97
          ? CONTRACT_ADDRESSES.ERC8004_TESTNET
          : CONTRACT_ADDRESSES.ERC8004_MAINNET,
      escrowTerms: {
        timeoutHours: 24,
        releaseRule: 'Client verification upon proof receipt',
      },
    };

    res.json(quotePayload);
  });

  // Create new hire record (buyer confirmed & signed on client)
  app.post('/api/hires', async (req, res) => {
    const { buyer, buyerAddress, chainId, agentId, catalog, rail, jobId, txHash, budgetU, lastAction } = req.body;
    const resolvedBuyer = buyer || buyerAddress;

    if (!resolvedBuyer || !agentId || !catalog || !rail) {
      return res.status(400).json({ error: 'Missing required hire fields (buyer, agentId, catalog, rail)' });
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

    res.status(201).json(hire);
  });

  // Sync on-chain status for a hire
  app.post('/api/hires/:id/sync', async (req, res) => {
    const { state, txHash, artifactUri, lastAction } = req.body;
    const hire = await store.getHireById(req.params.id);

    if (!hire) {
      return res.status(404).json({ error: 'Hire record not found' });
    }

    const updates: any = {};
    if (state) updates.state = state;
    if (artifactUri) updates.artifactUri = artifactUri;
    if (lastAction) updates.lastAction = lastAction;
    if (txHash && !hire.txs?.includes(txHash)) {
      updates.txs = [...(hire.txs || []), txHash];
    }

    const updated = await store.updateHire(req.params.id, updates);
    res.json(updated);
  });

  // Workers trigger endpoints
  app.post('/api/workers/sync', async (req, res) => {
    const mode = req.query.mode || 'semantic';
    const maxPages = Number(req.query.maxPages ?? (mode === 'latest' ? 20 : 3));
    let result: any;
    if (mode === 'latest') {
      result = await runLatestSync();
    } else if (mode === 'incremental') {
      result = await runIncrementalSync(maxPages);
    } else {
      result = await runSemanticSync();
    }
    broadcast({ type: 'agents-updated', mode, result, at: new Date().toISOString() });
    res.json({ success: true, result });
  });

  app.post('/api/workers/classify', async (_req, res) => {
    const result = await runClassificationWorker();
    res.json({ success: true, result });
  });

  app.post('/api/workers/probe', async (_req, res) => {
    const result = await runProbeWorker();
    res.json({ success: true, result });
  });

  // Wallet identity verification: free 0-gas signature check (personal_sign)
  app.post('/api/auth/verify', async (req, res) => {
    const { wallet, signature, chainId } = req.body || {};
    if (!wallet || !signature || typeof wallet !== 'string' || typeof signature !== 'string') {
      return res.status(400).json({ verified: false, error: 'Missing wallet or signature' });
    }

    const message = buildVerificationMessage(wallet, Number(chainId) || 97);
    try {
      const verified = await verifyMessage({
        address: wallet as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
      res.json({ verified, message });
    } catch (err) {
      res.json({ verified: false, error: 'Signature verification failed' });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Agent Villa] Server running on http://0.0.0.0:${PORT}`);
  });

  // Background auto-sync: every 60 min for 1000 latest (filtered), immediate SSE broadcast after each sync
  if (process.env.AUTO_SYNC !== 'false') {
    const intervalMs = Number(process.env.SYNC_INTERVAL_MS ?? 3600000); // 60 min
    setTimeout(async () => {
      try {
        const total = await store.countAgents();
        if (total === 0) {
          console.log('[AutoSync] Agents table empty — running initial semantic sync...');
          const result = await runSemanticSync();
          broadcast({ type: 'agents-updated', mode: 'semantic', result, at: new Date().toISOString() });
          console.log('[AutoSync] Initial semantic sync done:', result);
        } else {
          console.log(`[AutoSync] Agents table has ${total} rows — running immediate latest sync (60m schedule)...`);
          const result = await runLatestSync();
          broadcast({ type: 'agents-updated', mode: 'latest', result, at: new Date().toISOString() });
          console.log('[AutoSync] Immediate latest sync (1000) done:', result);
        }
      } catch (err) {
        console.warn('[AutoSync] Initial sync failed:', err);
      }

      setInterval(async () => {
        try {
          const result = await runLatestSync();
          broadcast({ type: 'agents-updated', mode: 'latest', result, at: new Date().toISOString() });
          console.log('[AutoSync] 60m latest sync (1000) done:', result);
        } catch (err) {
          console.warn('[AutoSync] Interval sync failed:', err);
        }
      }, intervalMs);
      console.log(`[AutoSync] Scheduled every ${intervalMs / 60000} min (SYNC_INTERVAL_MS=${intervalMs})`);
    }, 2000);
  }
}

startServer();
