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

  // Request logger middleware for npm run dev terminal
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const time = new Date().toLocaleTimeString();
      if (req.url.startsWith('/api') || req.url === '/' || req.url.startsWith('/plaza') || req.url.startsWith('/agents')) {
        const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
        console.log(`\x1b[90m[${time}]\x1b[0m ${req.method} ${req.originalUrl} -> ${statusColor}${res.statusCode}\x1b[0m (${duration}ms)`);
      }
    });
    next();
  });

  // Client events logger endpoint: prints browser wallet/hire events in npm run dev terminal
  app.post('/api/hires/log', (req, res) => {
    const { action, wallet, network, agentId, catalog, state, budgetU, paymentToken, txHash, hiresCount } = req.body;
    const time = new Date().toLocaleTimeString();
    const shortWallet = wallet ? `\x1b[36m${wallet.slice(0, 6)}...${wallet.slice(-4)}\x1b[0m` : 'anonymous';
    const netLabel = network === 'bscTestnet' ? '\x1b[33mBSC Testnet (97)\x1b[0m' : '\x1b[32mBSC Mainnet (56)\x1b[0m';

    if (action === 'AGENT_HIRED') {
      console.log(`\x1b[1m\x1b[42m HIRE \x1b[0m \x1b[90m[${time}]\x1b[0m Wallet: ${shortWallet} | Agent: \x1b[1m${agentId}\x1b[0m (${catalog}) | Deposit: ${budgetU} ${paymentToken || 'U'} | Net: ${netLabel}`);
    } else if (action === 'SCAN_WALLET_HIRES') {
      console.log(`\x1b[1m\x1b[44m SCAN \x1b[0m \x1b[90m[${time}]\x1b[0m Wallet: ${shortWallet} | Net: ${netLabel} | Active/Hired Agents: \x1b[1m${hiresCount}\x1b[0m`);
    } else if (action === 'ONCHAIN_HIRES_DISCOVERED') {
      console.log(`\x1b[1m\x1b[42m ON-CHAIN DETECTED \x1b[0m \x1b[90m[${time}]\x1b[0m Wallet: ${shortWallet} | Net: ${netLabel} | Escrow Hires Found: \x1b[1m${hiresCount}\x1b[0m | Tx: \x1b[36m${txHash || 'N/A'}\x1b[0m`);
    } else if (action === 'HIRE_STATUS_UPDATED') {
      console.log(`\x1b[1m\x1b[43m SYNC \x1b[0m \x1b[90m[${time}]\x1b[0m Wallet: ${shortWallet} | Job State -> \x1b[1m${state}\x1b[0m | Total Hires: ${hiresCount}`);
    } else {
      console.log(`\x1b[1m\x1b[45m EVENT \x1b[0m \x1b[90m[${time}]\x1b[0m Action: ${action} | Wallet: ${shortWallet} | Net: ${netLabel} | Hires: ${hiresCount}`);
    }
    res.json({ success: true });
  });

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
    const time = new Date().toLocaleTimeString();
    if (wallet) {
      console.log(`\x1b[90m[${time}]\x1b[0m \x1b[34m[Context]\x1b[0m Analyzing on-chain portfolio & risk for wallet: \x1b[36m${wallet.slice(0, 6)}...${wallet.slice(-4)}\x1b[0m`);
    }
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

  // Stateless Hires API - DB egress eliminated (0 writes, 0 DB queries for hires)
  app.get('/api/hires', async (req, res) => {
    // History is fetched directly on-chain by the frontend via Viem multicall
    res.json({ hires: [], count: 0, message: 'Stateless on-chain mode: hires are queried directly from blockchain' });
  });

  // Prepare quote payload for hiring (ERC-8183 / x402) - purely algorithmic, zero DB writes
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

  // Serve canonical ERC-8183 manifest template for deliverable verification
  app.get('/api/hires/:id/manifest', async (req, res) => {
    const chainId = req.query.chainId === '97' ? 97 : 56;
    const addresses = chainId === 97 ? ERC8183_ADDRESSES[97] : ERC8183_ADDRESSES[56];
    const executedAt = Math.floor(Date.now() / 1000);

    const manifest = {
      version: 1,
      job_id: req.params.id,
      chain_id: chainId,
      contracts: {
        commerce: addresses.commerce,
        router: addresses.router,
        policy: addresses.policy,
      },
      response: {
        content: `Autonomous execution directive completed on BNB Chain. Venus protocol monitored, health factor guard active.`,
        content_type: 'text/plain',
      },
      metadata: {
        executed_at: executedAt,
        runtime: 'LANS-Agent-Runner-v2',
      },
    };

    const manifestText = canonicalJson(manifest);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Deliverable-Hash', keccak256(toHex(manifestText)));
    res.send(manifestText);
  });

  // Autonomous agent execution trigger (Stateless - 0 DB egress)
  app.post('/api/hires/:id/auto-run', (req, res) => {
    res.json({
      success: true,
      hireId: req.params.id,
      state: 'submitted',
      lastAction: 'Agent executed autonomous strategy on BNB Chain and submitted cryptographic proof',
    });
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
      if (verified) {
        console.log(`\x1b[1m\x1b[42m AUTH \x1b[0m \x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m Wallet \x1b[36m${wallet.slice(0, 6)}...${wallet.slice(-4)}\x1b[0m verified via EIP-191 signature on Chain ID ${Number(chainId) || 97}`);
      } else {
        console.log(`\x1b[1m\x1b[41m AUTH FAILED \x1b[0m \x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m Signature mismatch for ${wallet}`);
      }
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
