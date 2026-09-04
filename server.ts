import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { verifyMessage, keccak256, toHex } from 'viem';
import { store, db } from './lib/supabase.ts';
import { ensureSchema } from './lib/bootstrap.ts';
import { buildVerificationMessage } from './lib/auth-message.ts';
import { computeBanditScore } from './lib/bandit.ts';
import { analyzeWalletContext } from './lib/context.ts';
import { CONTRACT_ADDRESSES, ERC8183_ADDRESSES } from './lib/chain.ts';
import { canonicalJson } from './lib/canonical.ts';
import { runSemanticSync, runIncrementalSync, runLatestSync } from './workers/sync.ts';
import { runClassificationWorker } from './workers/classify.ts';
import { runProbeWorker } from './workers/probe.ts';
import { runClassificationUnitTests } from './lib/classify.ts';
import { addSseClient, broadcast } from './lib/sync-broadcast.ts';
import { searchAgentsSemantic, mapRawToAgent, mergeLiveAgent, isSemanticMatchRelevant } from './lib/8004scan.ts';

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
    const { category, activeOnly = 'true', verifiedOnly = 'false', includeUncategorized = 'false', live = 'false', wallet, q, chainId: chainIdParam, limit: limitParam } = req.query;
    const isActiveOnly = activeOnly === 'true';
    const isVerifiedOnly = verifiedOnly === 'true';
    const includeUncat = includeUncategorized === 'true';
    const categoryStr = (category as string) || 'all';
    const targetChainId = Number(chainIdParam ?? 56) === 97 ? 97 : 56;
    const liveLimit = Math.min(Math.max(Number(limitParam ?? 50) || 50, 1), 100);

    // Stage 1: Hard SQL/Store filter (strictly filtered by targetChainId, default 56 Mainnet)
    // verifiedOnly adds reachable && hireable; default lists active labeled agents.
    let pool: any[] = await store.getAgents(isActiveOnly, categoryStr, isVerifiedOnly, includeUncat, targetChainId);

    // Live registry search (8004scan, real-time via API key) upon user search query
    if (live === 'true' && q && typeof q === 'string') {
      try {
        const liveRaw = await searchAgentsSemantic(String(q), targetChainId, liveLimit, 0);
        const localById = new Map<string, any>(pool.map((a: any) => [a.agentId, a]));
        const semanticMatches = liveRaw
          .map((raw) => mapRawToAgent(raw))
          .filter((a: any) => {
            if (!a || !a.agentId) return false;
            // Similarity threshold: keep relevant semantic matches
            return isSemanticMatchRelevant(a.rawJson?.similarityScore);
          }) as any[];
        const liveCandidates = semanticMatches.map((a: any) => mergeLiveAgent(localById.get(a.agentId), a));

        // Auto-persist relevant 8004scan search results to permanently enrich local store
        for (const candidate of liveCandidates) {
          store.upsertAgent(candidate).catch((err: any) => {
            console.warn('[LiveSearch] Failed to persist agent to store:', candidate.agentId, err);
          });
        }

        // Stage 1 filters applied to live pool as well as local pool (verifiedOnly/category/uncategorized)
        const stage1Filtered = liveCandidates.filter((a: any) => {
          if (isVerifiedOnly && !(a.active && a.reachable && a.hireable)) return false;
          if (!isVerifiedOnly && isActiveOnly && !a.active) return false;
          const labels = (a.labels || []).map((l: string) => (l === 'monitoring' ? 'rebalancing' : l));
          if (categoryStr === 'uncategorized') return labels.includes('uncategorized') || labels.length === 0;
          if (categoryStr !== 'all') return labels.includes(categoryStr);
          if (!includeUncat) return !labels.includes('uncategorized');
          return true;
        });

        // Substring filter applied only to local pool; semantic results kept as-is
        const liveIds = new Set(stage1Filtered.map((a: any) => a.agentId));
        const lower = q.toLowerCase();
        const localMatches = pool.filter(
          (a: any) =>
            !liveIds.has(a.agentId) &&
            (a.name?.toLowerCase().includes(lower) ||
              a.description?.toLowerCase().includes(lower) ||
              a.labels?.some((l: string) => l.toLowerCase().includes(lower)))
        );
        pool = [...localMatches, ...stage1Filtered];
      } catch (err) {
        console.warn('[LiveSearch] 8004scan search failed, falling back to local pool:', err);
      }
    } else if (q && typeof q === 'string') {
      // Multi-tag search filter across name, description, and labels
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
      // 1. Heuristic Score - multi-tag: max heuristic score across assigned labels
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
    const { agentId, budgetU, rail, taskSummary, deadlineHours: customDeadlineHours } = req.body;
    const agent = await store.getAgentById(agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found for quoting' });
    }

    const raw = agent.rawJson as any;
    const hourlyRate = Number(raw?.hourlyCostU || '0.25');
    const budget = Number(budgetU || hourlyRate * 2);
    const deadlineHours = customDeadlineHours ? Number(customDeadlineHours) : 24;
    const deadlineSeconds = Math.max(60, Math.round(deadlineHours * 3600));
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadlineSeconds;

    const quotePayload = {
      quoteId: `quote_${Date.now()}`,
      agentId,
      agentOwner: agent.owner,
      buyerRequestedRail: rail || (agent.x402Supported ? 'x402' : 'erc8183'),
      budgetU: budget.toFixed(2),
      deadline: deadlineTimestamp,
      deadlineHours,
      taskSummary: taskSummary || 'Autonomous periodic inspection',
      contractAddress:
        agent.chainId === 97
          ? CONTRACT_ADDRESSES.ERC8183_COMMERCE_TESTNET
          : CONTRACT_ADDRESSES.ERC8183_COMMERCE_MAINNET,
      escrowTerms: {
        timeoutHours: deadlineHours,
        releaseRule: 'Client verification upon proof receipt',
      },
    };

    res.json(quotePayload);
  });

  // Create new hire record (buyer confirmed & signed on client)
  app.post('/api/hires', async (req, res) => {
    const { buyer, buyerAddress, chainId, agentId, catalog, rail, jobId, txHash, budgetU, paymentToken, paymentAmount, deadlineHours, lastAction } = req.body;
    const resolvedBuyer = buyer || buyerAddress;

    if (!resolvedBuyer || !agentId || !catalog || !rail) {
      return res.status(400).json({ error: 'Missing required hire fields (buyer, agentId, catalog, rail)' });
    }

    // Default strictly to BSC Mainnet (56) unless explicitly set to 97 or agent is testnet
    const resolvedChainId = chainId ? Number(chainId) : (agentId.startsWith('97:') ? 97 : 56);
    let resolvedPaymentToken = (paymentToken || 'U').trim();
    if (resolvedPaymentToken.toLowerCase() === 'tbnb') {
      resolvedPaymentToken = 'tBNB';
    } else {
      resolvedPaymentToken = resolvedPaymentToken.toUpperCase();
    }

    const formatDuration = (hours?: string | number) => {
      if (!hours) return '24h';
      const num = Number(hours);
      if (isNaN(num)) return String(hours);
      if (num < 1) return `${Math.round(num * 60)}m`;
      if (num >= 24 && num % 24 === 0) return `${num / 24}d`;
      return `${num}h`;
    };
    const durationLabel = formatDuration(deadlineHours);

    const hire = await store.addHire({
      buyer: resolvedBuyer,
      chainId: resolvedChainId,
      agentId,
      catalog,
      rail,
      jobId: jobId || `job_bsc_${Date.now()}`,
      txs: txHash ? [txHash] : [],
      state: txHash ? 'funded' : 'pending',
      budgetU: budgetU ? String(budgetU) : '10.00',
      paymentToken: resolvedPaymentToken,
      paymentAmount: paymentAmount ? String(paymentAmount) : (budgetU ? String(budgetU) : '10.00'),
      artifactUri: null,
      lastAction: lastAction || (txHash ? `Escrow deposit funded in ${resolvedPaymentToken} by buyer on BSC (${durationLabel})` : 'Awaiting on-chain escrow funding'),
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

  // Run autonomous strategy & submit canonical deliverable manifest (Seller side)
  app.post('/api/hires/:id/auto-run', async (req, res) => {
    const hire: any = await store.getHireById(req.params.id);
    if (!hire) {
      return res.status(404).json({ error: 'Hire record not found' });
    }

    const chainId = hire.chainId === 97 ? 97 : 56;
    const addresses = chainId === 97 ? ERC8183_ADDRESSES[97] : ERC8183_ADDRESSES[56];
    const jobIdNum = 1000 + Math.abs(hire.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 9000);

    const executedAt = Math.floor(Date.now() / 1000);
    // Canonical ERC-8183 v1 Deliverable Manifest
    const manifest = {
      version: 1,
      job_id: jobIdNum,
      chain_id: chainId,
      contracts: {
        commerce: addresses.commerce,
        router: addresses.router,
        policy: addresses.policy,
      },
      response: {
        content: `Autonomous execution directive completed for ${hire.catalog} on BNB Chain. Venus protocol monitored, health factor guard active.`,
        content_type: 'text/plain',
      },
      metadata: {
        agent_id: hire.agentId,
        buyer: hire.buyer,
        catalog: hire.catalog,
        executed_at: executedAt,
        runtime: 'LANS-Agent-Runner-v2',
      },
    };

    const manifestText = canonicalJson(manifest);
    const deliverableHash = keccak256(toHex(manifestText));
    const artifactUri = `/api/hires/${hire.id}/manifest?t=${executedAt}`;

    const updated = await store.updateHire(req.params.id, {
      state: 'submitted',
      artifactUri,
      lastAction: `Agent executed autonomous strategy and submitted canonical deliverable (${deliverableHash.slice(0, 12)}...)`,
      txs: [...(hire.txs || []), deliverableHash],
    });

    res.json({ ...updated, manifest, manifestText, deliverableHash });
  });

  // Serve verbatim canonical manifest text for cryptographic proof verification
  app.get('/api/hires/:id/manifest', async (req, res) => {
    const hire: any = await store.getHireById(req.params.id);
    if (!hire) {
      return res.status(404).send('Not Found');
    }

    const chainId = hire.chainId === 97 ? 97 : 56;
    const addresses = chainId === 97 ? ERC8183_ADDRESSES[97] : ERC8183_ADDRESSES[56];
    const jobIdNum = 1000 + Math.abs(hire.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 9000);

    let executedAt = Math.floor(new Date(hire.updatedAt || hire.createdAt).getTime() / 1000);
    if (hire.artifactUri && hire.artifactUri.includes('?t=')) {
      const parsedT = Number(hire.artifactUri.split('?t=')[1]);
      if (!isNaN(parsedT) && parsedT > 0) executedAt = parsedT;
    }

    const manifest = {
      version: 1,
      job_id: jobIdNum,
      chain_id: chainId,
      contracts: {
        commerce: addresses.commerce,
        router: addresses.router,
        policy: addresses.policy,
      },
      response: {
        content: `Autonomous execution directive completed for ${hire.catalog} on BNB Chain. Venus protocol monitored, health factor guard active.`,
        content_type: 'text/plain',
      },
      metadata: {
        agent_id: hire.agentId,
        buyer: hire.buyer,
        catalog: hire.catalog,
        executed_at: executedAt,
        runtime: 'LANS-Agent-Runner-v2',
      },
    };

    const manifestText = canonicalJson(manifest);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Deliverable-Hash', keccak256(toHex(manifestText)));
    res.send(manifestText);
  });

  // Dispute deliverable within optimistic dispute window
  app.post('/api/hires/:id/dispute', async (req, res) => {
    const hire: any = await store.getHireById(req.params.id);
    if (!hire) {
      return res.status(404).json({ error: 'Hire record not found' });
    }
    const updated = await store.updateHire(req.params.id, {
      state: 'rejected',
      lastAction: 'Buyer disputed deliverable inside optimistic dispute window',
    });
    res.json(updated);
  });

  // Claim full escrow refund after job deadline expiry
  app.post('/api/hires/:id/claim-refund', async (req, res) => {
    const hire: any = await store.getHireById(req.params.id);
    if (!hire) {
      return res.status(404).json({ error: 'Hire record not found' });
    }
    const updated = await store.updateHire(req.params.id, {
      state: 'expired',
      lastAction: 'Full escrow deposit reclaimed by buyer after job deadline expiry',
    });
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
          console.log(`[AutoSync] Agents table has ${total} rows — running immediate targeted semantic sync (60m schedule)...`);
          const result = await runSemanticSync();
          broadcast({ type: 'agents-updated', mode: 'semantic', result, at: new Date().toISOString() });
          console.log('[AutoSync] Immediate targeted semantic sync done:', result);
        }
      } catch (err) {
        console.warn('[AutoSync] Initial sync failed:', err);
      }

      setInterval(async () => {
        try {
          const result = await runSemanticSync();
          broadcast({ type: 'agents-updated', mode: 'semantic', result, at: new Date().toISOString() });
          console.log('[AutoSync] 60m targeted semantic sync done:', result);
        } catch (err) {
          console.warn('[AutoSync] Interval sync failed:', err);
        }
      }, intervalMs);
      console.log(`[AutoSync] Scheduled every ${intervalMs / 60000} min (SYNC_INTERVAL_MS=${intervalMs})`);
    }, 2000);
  }
}

startServer();
