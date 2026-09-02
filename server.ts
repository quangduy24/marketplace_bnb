import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { memoryStore } from './lib/supabase.ts';
import { computeBanditScore } from './lib/bandit.ts';
import { analyzeWalletContext } from './lib/context.ts';
import { runSemanticSync, runIncrementalSync } from './workers/sync.ts';
import { runClassificationWorker } from './workers/classify.ts';
import { runProbeWorker } from './workers/probe.ts';
import { runClassificationUnitTests } from './lib/classify.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    const { category, activeOnly = 'true', wallet, q } = req.query;
    const isActiveOnly = activeOnly === 'true';
    const categoryStr = (category as string) || 'all';

    // Stage 1: Hard SQL/Store filter
    let pool = memoryStore.getAgents(isActiveOnly, categoryStr);

    // Search filter if provided
    if (q && typeof q === 'string') {
      const lower = q.toLowerCase();
      pool = pool.filter(
        (a) => a.name?.toLowerCase().includes(lower) || a.description?.toLowerCase().includes(lower)
      );
    }

    // Stage 2: Hybrid Recommendation Ranking
    const walletContext = await analyzeWalletContext(wallet as string | undefined);
    const wH = walletContext.weightHeuristic;
    const wS = 0.35;
    const wB = 1.0 - (wH + wS);

    const scoredAgents = pool.map((agent) => {
      // 1. Heuristic Score based on career matching wallet urgent need
      let heuristicScore = 0.5;
      const firstLabel = agent.labels?.[0] as keyof typeof walletContext.heuristicScores;
      if (firstLabel && walletContext.heuristicScores[firstLabel] !== undefined) {
        heuristicScore = walletContext.heuristicScores[firstLabel];
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
      walletContext,
    });
  });

  // Get Agent Detail
  app.get('/api/agents/:id', (req, res) => {
    const agent = memoryStore.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  });

  // List Hires (optionally filtered by buyer)
  app.get('/api/hires', (req, res) => {
    const buyer = req.query.buyer as string | undefined;
    const hiresList = memoryStore.getHires(buyer);
    res.json({ hires: hiresList, count: hiresList.length });
  });

  // Prepare quote payload for hiring (ERC-8183 / x402)
  app.post('/api/hires/prepare', (req, res) => {
    const { agentId, budgetU, rail, taskSummary } = req.body;
    const agent = memoryStore.getAgentById(agentId);

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
      contractAddress: agent.chainId === 97 ? '0x8004A818BFB912233c491871b3d84c89A494BD9e' : '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      escrowTerms: {
        timeoutHours: 24,
        releaseRule: 'Client verification upon proof receipt',
      },
    };

    res.json(quotePayload);
  });

  // Create new hire record (buyer confirmed & signed on client)
  app.post('/api/hires', (req, res) => {
    const { buyer, chainId, agentId, catalog, rail, jobId, txHash, budgetU, lastAction } = req.body;

    if (!buyer || !agentId || !catalog || !rail) {
      return res.status(400).json({ error: 'Missing required hire fields' });
    }

    const hire = memoryStore.addHire({
      buyer,
      chainId: chainId || 97,
      agentId,
      catalog,
      rail,
      jobId: jobId || `job_bsc_${Date.now()}`,
      txs: txHash ? [txHash] : [],
      state: 'funded',
      budgetU: budgetU ? String(budgetU) : '10.00',
      artifactUri: null,
      lastAction: lastAction || 'Escrow deposit funded by buyer on BSC',
    });

    res.status(201).json(hire);
  });

  // Sync on-chain status for a hire
  app.post('/api/hires/:id/sync', (req, res) => {
    const { state, txHash, artifactUri, lastAction } = req.body;
    const hire = memoryStore.getHireById(req.params.id);

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

    const updated = memoryStore.updateHire(req.params.id, updates);
    res.json(updated);
  });

  // Workers trigger endpoints
  app.post('/api/workers/sync', async (req, res) => {
    const mode = req.query.mode || 'semantic';
    if (mode === 'incremental') {
      const result = await runIncrementalSync(3);
      res.json({ success: true, result });
    } else {
      const result = await runSemanticSync();
      res.json({ success: true, result });
    }
  });

  app.post('/api/workers/classify', async (_req, res) => {
    const result = await runClassificationWorker();
    res.json({ success: true, result });
  });

  app.post('/api/workers/probe', async (_req, res) => {
    const result = await runProbeWorker();
    res.json({ success: true, result });
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
}

startServer();
