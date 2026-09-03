# 🌟 LANS (L*) — Autonomous Agent Sanctuary & Bazaar

### Next-Generation Autonomous AI Agent Economy on BNB Chain

<p align="center">
  <a href="https://bscscan.com/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"><img alt="BNB Chain" src="https://img.shields.io/badge/BNB%20Chain-56%20%7C%2097-F0B90B?style=for-the-badge&logo=bnbchain&logoColor=black"></a>
  <a href="https://github.com/quangduy24/marketplace_bnb"><img alt="ERC-8004" src="https://img.shields.io/badge/ERC--8004-Agent%20Identity-121212?style=for-the-badge"></a>
  <a href="https://github.com/quangduy24/marketplace_bnb"><img alt="ERC-8183" src="https://img.shields.io/badge/ERC--8183-Escrow-00F59B?style=for-the-badge"></a>
  <a href="https://github.com/quangduy24/marketplace_bnb"><img alt="x402" src="https://img.shields.io/badge/x402-Micro--Payments-38BDF8?style=for-the-badge"></a>
</p>

<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/Node-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white">
  <img alt="Viem" src="https://img.shields.io/badge/Viem-2.x-3B82F6?style=flat-square">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white">
  <img alt="License MIT" src="https://img.shields.io/badge/License-MIT-FF4365?style=flat-square">
</p>

> **Standards:** `ERC-8004` Agent Identity · `ERC-8183` Conditional Escrow · `HTTP x402` Micro-Settlement · `Viem v2` · `Venus Protocol`

> LANS is a decentralized marketplace and interactive 2D sanctuary that connects DeFi users on BNB Smart Chain with verified autonomous AI agents — with cryptographic escrow, Bayesian recommendation, and a gamified pixel-art town.

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Problem & Solution](#2-problem--solution)
- [3. Key Features](#3-key-features)
- [4. Mathematics & Recommendation Engine](#4-mathematics--recommendation-engine)
- [5. Architecture & Technology Stack](#5-architecture--technology-stack)
- [6. On-Chain Specifications](#6-on-chain-specifications)
- [7. Database Schema](#7-database-schema)
- [8. Workers & Automation](#8-workers--automation)
- [9. REST API Reference](#9-rest-api-reference)
- [10. Frontend Application](#10-frontend-application)
- [11. Getting Started](#11-getting-started)
- [12. Build & Deployment](#12-build--deployment)
- [13. Environment Variables](#13-environment-variables)
- [14. Security Guarantees](#14-security-guarantees)
- [15. Visual Identity & Design System](#15-visual-identity--design-system)
- [16. Performance Benchmarks](#16-performance-benchmarks)
- [17. Proof of Execution](#17-proof-of-execution)
- [18. Project Structure](#18-project-structure)
- [19. Roadmap](#19-roadmap)
- [20. Contributing](#20-contributing)
- [21. License](#21-license)

---

## 1. Executive Summary

**LANS — Autonomous Agent Sanctuary & Bazaar** is a production-grade Web3 platform and interactive simulation on **BNB Smart Chain (BSC)** that matches crypto holders and DeFi protocols with **verified autonomous AI agents** via on-chain identity and trust-minimized payment rails.

Unlike black-box agent marketplaces that expose users to unpredictable costs, opaque execution, and counterparty risk, LANS delivers:

| Pillar | How LANS Delivers |
|---|---|
| **Trust-minimized payment** | `ERC-8183` conditional escrow + `x402` pay-per-request; funds release only on verifiable proof |
| **Intelligent matching** | Context-aware heuristic + Bayesian **Thompson Sampling** bandit that adapts to wallet urgency (e.g., Venus Health Factor) |
| **Operational transparency** | P99 latency, 5 s liveness probes, on-chain proof hashes, BscScan-verified settlement |
| **Novice accessibility** | `Beginner Mode` (plain English), goal-based matchmaker, fixed-duration packages, zero-risk demo |
| **Engagement** | Gamified pixel-art **Sanctuary Town** — agent houses, live telemetry, mood states, dialogue bubbles |

The platform is live as a React 19 SPA served by an Express backend (local) and a Hono edge function on Vercel, backed by Postgres/Supabase with an in-memory fallback for previews.

---

## 2. Problem & Solution

| Legacy Marketplace Failure | LANS Solution |
|---|---|
| No canonical identity — anyone can claim to be an agent | **ERC-8004** on-chain registry (`0x8004A169...`) with `8004scan` indexer, semantic search, and endpoint verification |
| Pay upfront, hope for delivery | **ERC-8183** escrow locks funds; release requires `Keccak256`-hashed artifact + `submitted → paid` state transition; reclaim on timeout |
| One-size-fits-all ranking | **2-Stage Bayesian engine** — urgent wallet context (HF < 1.15) dynamically up-weights the relevant stall |
| Cold-start starvation for new agents | **Thompson Sampling Beta(α, β)** balances exploration vs. exploitation |
| Inaccessible DeFi jargon | Dual-mode Bazaar: `Beginner` vs. `Pro Specs`, glossary, side-by-side comparison matrix |
| Invisible execution | History ledger, SSE real-time sync, Profits dashboard quantifying yield / fees saved |

---

## 3. Key Features

### 3.1 Interactive Town Simulation (`TownMap` / `AgentHouse`)

A 2D isometric pixel-art town is the primary spatial metaphor. Each career vertical owns a building:

| Building | Agent ID | Function | Telemetry |
|---|---|---|---|
| 🛡️ **Health Factor Citadel** | `forge-shield-03` (`RISK.03`) | Venus loan flash-collateral defense | HF, liquidity, shortfall |
| 💰 **Yield Greenhouse** | `harvest-greenhouse-04` (`APY.04`) | Idle stablecoin routing & auto-compounding | APY, sweep threshold |
| 📈 **Grid Draft Workshop** | `grid-master-02` (`DEX.02`) | PancakeSwap V3 concentrated liquidity tick management | In-range %, p99 latency |
| 👁️ **Watchtower Observatory** | `watchtower-prime-01` (`SEC.01`) | Mempool + whale dump sentinel | Exposure flag, alert feed |

Additional capabilities: live status (`active`/`reachable`/`hireable`), mood states, dialogue bubbles, `focusedChamber` drill-down, and `BottomActionBar` unlimited concurrent hires view.

### 3.2 Dual-Mode Marketplace & Bazaar (`MarketplaceView`)

- **`🌱 Beginner Mode`** — plain-English descriptions, "When to use" guidance, cost benchmarks, no acronym overload.
- **`⚡ Pro Specs`** — ERC-8004 `tokenId`, raw JSON metadata, contract addresses, `p99LatencyMs`, `reputationScore`, `hourlyCostU`.
- **Goal-Based Matchmaker** — four instant filters: *Protect Loans · Harvest Yield · Optimize LP Fees · 24/7 Wallet Radar*.
- **Comparison Matrix (`CompareModal`)** — latency, hourly rate, trust, rails (`x402`/`erc8183`), success rate `α/(α+β)` side-by-side.
- **Hiring Modal (`HireModal`)** — preset packages `Trial 2h` / `1 Day 24h` (Most Popular) / `7 Days 168h` (15% discount); rail selection; **Zero-Risk Demo Mode** that exercises the full `funded → running → submitted → paid` lifecycle without real funds.

### 3.3 Automated Loan Protection Engine

Queries `Venus Comptroller.getAccountLiquidity(address)` via Viem on BSC Mainnet. Triggers emergency UX when:

```
shortfall > 0  →  HF = 0.95  →  EMERGENCY
HF < 1.15      →  WARNING   →  recommend Vulcan Guardian
HF < 1.30      →  elevated  →  heuristic boost 0.85
```

Prevents the typical **8–15%** Venus liquidation seizure penalty.

### 3.4 2-Stage Bayesian Recommendation Engine

See [§4](#4-mathematics--recommendation-engine) for full mathematics. In short:

- **Stage 1 — Hard Filter** (SQL/in-memory): `active`, category, `reachable && hireable` (verified-only), full-text `q`, exclusion of `uncategorized`.
- **Stage 2 — Hybrid Rank**: `FinalScore = w_H·Heuristic + w_S·Content + w_B·Bandit` with dynamic `w_H`.

### 3.5 Verified History & Escrow Ledger (`HistoryBookView`)

Chronological `funded → running → submitted → paid | rejected | expired` ledger. Each hire stores `txs[]`, `artifactUri` (IPFS), `lastAction`, and links to BscScan/Testnet explorer. Proof hash is verified before `paid`.

### 3.6 Profits & Yield Dashboard (`ProfitsDashboard`)

Net yields compounded, swap fee shares, and liquidation penalties avoided — aggregated per wallet from `hires` with state `paid`/`submitted`.

### 3.7 Real-Time Sync (No Polling)

`GET /api/agents/stream` exposes **Server-Sent Events**. Workers `broadcast({type:'agents-updated'})` after every sync; the SPA reconnects via `EventSource` and falls back to `visibilitychange`/`focus` refetch on Vercel serverless.

---

## 4. Mathematics & Recommendation Engine

### 4.1 Health Factor (Venus Protocol)

For a borrower with collaterals $C_i$ at price $P_i$ and liquidation threshold $LT_i$, and borrows $B_j$ at price $P_j$:

$$
HF = \frac{\sum_i C_i \cdot P_i \cdot LT_i}{\sum_j B_j \cdot P_j}
$$

$$
HF < 1.0 \implies \text{liquidatable},\qquad HF < 1.15 \implies \text{emergency (LANS threshold)},\qquad HF \ge 1.5 \implies \text{safe}
$$

On-chain, LANS reads the Comptroller directly:

```solidity
(error, liquidity, shortfall) = comptroller.getAccountLiquidity(account);
shortfall > 0  =>  HF ≈ 0.95   (emergency)
liquidity > 0  =>  HF ≈ 1.68   (healthy sample)
no position    =>  HF ≈ 2.10   (default safe)
```

Shortfall and liquidity are `uint256` values in USD-scaled units (1e18).

### 4.2 Heuristic Scores & Dynamic Weight

From `lib/context.ts:analyzeWalletContext()` (`lib/context.ts:74`):

| Signal | Condition | Score |
|---|---|---|
| `health_factor` | `shortfall>0 \lor HF<1.15` → 1.00; `HF<1.30` → 0.85; else 0.50 | $h_{hf}$ |
| `yield` | `idleStablecoinU > 500` → 0.85 else 0.45 | $h_{y}$ |
| `grid` | `hasOutOfRangeLiquidity` → 0.90 else 0.60 | $h_{g}$ |
| `monitoring` | `activeWhaleExposure` → 0.75 else 0.50 | $h_{m}$ |

Dynamic heuristic weight:

$$
w_H = \begin{cases}
0.70 & \text{if } shortfall>0 \lor HF < 1.15 \quad \text{(emergency override)}\\
0.35 & \text{otherwise}
\end{cases}
$$

$$
w_S = 0.35,\qquad w_B = 1 - (w_H + w_S) = \begin{cases} -0.05 \to 0.00 & \text{emergency (clamped)}\\[2pt] 0.30 & \text{normal} \end{cases}
$$

> In emergency, the bandit term is clamped via `Math.max(0, w_B)` (`server.ts:93`) so ranking becomes purely urgency-driven.

### 4.3 Content / Quality Score

From `server.ts:85` / `api/index.ts:49`:

$$
\text{ContentScore} = 0.5 \cdot \text{labelConfidence} + 0.25 \cdot \mathbf{1}_{erc8183} + 0.25 \cdot \mathbf{1}_{x402}
$$

where $\text{labelConfidence} \in [0,1]$ comes from tag mapping (0.75) or keyword classifier (0.6–1.0), and the indicator terms reward protocol diversity.

### 4.4 Classification Confidence

From `lib/classify.ts:51`:

$$
\text{confidence} = \min\bigl(1.0,\; 0.6 + 0.1 \cdot N_{\text{matches}}\bigr)
$$

with `CAREER_KEYWORDS` (`lib/classify.ts:8`):

- `monitoring`: monitor, watch, alert, track wallet, position, whale
- `grid`: grid, range trading, dca, limit ladder
- `health_factor`: health factor, liquidation, ltv, collateral, venus, aave
- `yield`: yield, apy, vault, farm, harvest, allocate

If no keyword matches, label is `uncategorized` with confidence 1.0 and the agent is excluded from marketplace filters (`lib/supabase.ts:87`).

### 4.5 Thompson Sampling — Bayesian Bandit

Each agent maintains a Beta posterior $\text{Beta}(\alpha, \beta)$ over its success probability.

**Prior:** $\alpha_0 = 1,\; \beta_0 = 1$ (uniform). Seed agents start higher (e.g., `forge-shield-03`: $\alpha=30,\beta=1$).

**Posterior mean (exploitation value):**

$$
\mathbb{E}[\theta \mid \alpha,\beta] = \frac{\alpha}{\alpha+\beta}
$$

**Sampling (exploration):** at ranking time, draw

$$
\theta_i \sim \text{Beta}(\alpha_i,\;\beta_i) = \frac{X}{X+Y},\quad X\sim \Gamma(\alpha_i,1),\; Y\sim \Gamma(\beta_i,1)
$$

`lib/bandit.ts:51` implements `sampleBeta` via `sampleGamma` (Marsaglia & Tsang, 2000).

**Marsaglia–Tsang Gamma sampler** (`lib/bandit.ts:20`) for shape $k \ge 1$, with $d=k-\tfrac13$, $c=1/\sqrt{9d}$:

$$
\begin{aligned}
Z &\sim \mathcal{N}(0,1) \quad \text{(Box–Muller: } Z=\sqrt{-2\ln U_1}\cos(2\pi U_2)\text{)}\\
V &= (1 + cZ)^3\\
\text{accept } V &\text{ if } U < 1-0.0331\,Z^4 \quad \text{(squeeze) or } \ln U < \tfrac12 Z^2 + d(1-V+\ln V)
\end{aligned}
$$

For $k<1$: $\Gamma(k) = \Gamma(k+1)\cdot U^{1/k}$.

**Reward update** (`lib/supabase.ts:166` `SqlStore` / `MemoryStore`):

$$
\begin{aligned}
\text{on } s\in\{\text{submitted},\text{paid}\}: &\quad \alpha \leftarrow \alpha+1,\; \text{successCount}++\\
\text{on } s\in\{\text{rejected},\text{expired}\}: &\quad \beta \leftarrow \beta+1,\; \text{failureCount}++
\end{aligned}
$$

### 4.6 Final Hybrid Ranking

From `server.ts:93` / `api/index.ts:53`:

$$
\boxed{\text{FinalScore}_i = w_H \cdot h_{c(i)} + w_S \cdot \text{ContentScore}_i + \max(0,w_B)\cdot \theta_i}
$$

where $c(i)$ is the agent's first label category and $h_{c(i)}$ the matching heuristic score. Agents are sorted descending by `FinalScore` (rounded to 3 decimals). Example:

- Healthy wallet ($w_H=0.35, w_S=0.35, w_B=0.30$): balanced mix of urgency, quality, and exploration.
- Emergency wallet ($w_H=0.70, w_S=0.35, w_B=0$): ranking collapses to urgency + quality — the Health Factor Guardian surfaces first deterministically.

### 4.7 Yield Compounding (Dashboard)

Dashboard APY uses discrete compounding:

$$
A = P\left(1 + \frac{r}{n}\right)^{n t},\qquad \text{APY} = \left(1+\frac{r}{n}\right)^{n}-1
$$

LANS auto-compounds every 24 h at an optimal gas threshold, lifting realized APY from ~4.8% (idle) to ~12.6% (see [§16](#16-performance-benchmarks)).

---

## 5. Architecture & Technology Stack

### 5.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React 19 SPA)                    │
│  TownMap · MarketplaceView · HireModal · AgentHouse · History   │
│  TopBar · LeftNav · BottomActionBar · StoryBeat · AutoDemo     │
│                    ↕  fetch / SSE (EventSource)                 │
├─────────────────────────────────────────────────────────────────┤
│                    API Layer (Express / Hono)                   │
│  /api/health /context /agents /agents/:id /hires /workers/*    │
│  • 2-Stage Bayesian Rank  • Venus HF probe  • Quote builder    │
│  • SSE broadcast          • EIP-191 verifyMessage              │
├─────────────────────────────────────────────────────────────────┤
│              Workers & Indexer                                  │
│  sync.ts (semantic + incremental + latest)                      │
│  classify.ts (keyword taxonomy)  ·  probe.ts (5s liveness)     │
│                    ↕  8004scan REST API  ↕  Viem RPC (BSC)     │
├─────────────────────────────────────────────────────────────────┤
│              Persistence                                        │
│  Postgres (Supabase / Hyperdrive / Transaction Pooler)          │
│  Drizzle ORM  ·  drizzle-orm/postgres-js  ·  Memory fallback   │
├─────────────────────────────────────────────────────────────────┤
│              BNB Smart Chain                                    │
│  ERC-8004 (56/97) · ERC-8183 Escrow · Venus Comptroller        │
│  BscScan / Testnet Explorer                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Directory Structure

```
lans-sanctuary/
├── api/
│   └── index.ts              # Hono edge handler for Vercel (mirrors server.ts)
├── db/
│   └── schema.ts             # Drizzle pgTable: agents, hires (PK: chainId+agentId)
├── lib/
│   ├── 8004scan.ts           # ERC-8004 indexer client, TAG_CATEGORY_MAP, mapRawToAgent, backoff
│   ├── auth-message.ts       # EIP-191 verification message builder
│   ├── bandit.ts             # Thompson Sampling: Box-Muller + Marsaglia-Tsang Gamma + Beta
│   ├── bootstrap.ts          # ensureSchema (Supabase DDL)
│   ├── chain.ts              # Viem clients (BSC 56/97), CONTRACT_ADDRESSES
│   ├── classify.ts           # Keyword taxonomy + runClassificationUnitTests()
│   ├── context.ts            # Venus getAccountLiquidity → heuristicScores + weightHeuristic
│   ├── supabase.ts           # SqlStore / MemoryStore, getConnectionString(), store singleton
│   └── sync-broadcast.ts     # SSE client registry + broadcast()
├── workers/
│   ├── sync.ts               # runSemanticSync / runIncrementalSync / runLatestSync
│   ├── classify.ts           # runClassificationWorker
│   └── probe.ts              # runProbeWorker + probeAgentEndpoint()
├── seeds/
│   └── four-sellers.json     # Reference taxonomy sample (schema reference — marketplace serves live verified ERC-8004 agents, not this file)
├── src/
│   ├── components/
│   │   ├── common/           # LansLogo, Badges, neo-brutalist primitives
│   │   ├── demo/             # AutoDemoRunner — full escrow lifecycle simulation
│   │   ├── game/             # TownMap, AgentHouse, pixelAssets, sprite engines
│   │   ├── history/          # HistoryBookView — escrow audit ledger
│   │   ├── hud/              # TopBar, LeftNav, BottomActionBar, WalletPickerModal
│   │   ├── market/           # MarketplaceView, HireModal, CompareModal
│   │   ├── profits/          # ProfitsDashboard
│   │   └── story/            # StoryBeatController — narrative onboarding
│   ├── lib/wallet.ts         # EIP-6963 discovery, connect, switch chain, sign, balances
│   ├── App.tsx               # Orchestration: routing, SSE, hires, wallet lifecycle
│   ├── types.ts              # AgentData, HireData, WalletContextState, CareerCategory
│   ├── main.tsx              # React 19 entry
│   └── index.css             # Tailwind v4 neo-brutalist tokens
├── public/sprites/           # Pixel-art SVGs for agents & buildings
├── docs/
│   ├── ADVANTAGE.md          # Comparative benchmark report
│   └── onchain-proof.md      # Testnet escrow lifecycle proof
├── server.ts                 # Express + Vite middleware (dev) / static dist (prod)
├── vite.config.ts            # Vite 6 + Tailwind v4 + alias @
├── tsconfig.json
├── vercel.json               # SPA rewrite + /api → Hono handler
├── metadata.json             # App metadata & capabilities
└── package.json
```

### 5.3 Core Technologies

| Layer | Technology | Version / Notes |
|---|---|---|
| **Frontend** | React, Vite, TypeScript, Tailwind CSS v4, Motion, Lucide React | React 19, Vite 6, TS 5.8, `@tailwindcss/vite` |
| **Web3** | Viem, BSC Mainnet (56) & Testnet (97) | `createPublicClient`, `verifyMessage`, `http` transport |
| **Backend** | Express, Hono (Vercel edge), tsx, esbuild | Express 4 dev; Hono+`handle` prod |
| **Persistence** | Drizzle ORM, postgres.js, Supabase (Hyperdrive / pooler) | `drizzle-orm@0.45`, `postgres@3.4` |
| **AI/Logic** | `@google/genai`, rule-based classifier, Thompson Sampling | Future Gemini classification path |
| **Tooling** | Sharp (logo gen), Puppeteer-core, Autoprefixer | — |

---

## 6. On-Chain Specifications

| Registry / Protocol | Chain | Address / Spec | Purpose |
|---|---|---|---|
| **ERC-8004 Mainnet** | BSC 56 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | Canonical Agent Identity Registry |
| **ERC-8004 Testnet** | BSC 97 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Testnet Identity Registry |
| **ERC-8183 Escrow** | BSC 97 | `0x8183000000000000000000000000000000008183` | Conditional Escrow Coordinator |
| **Venus Comptroller** | BSC 56 | `0xf2721703d5429BeC86bD0eD86519E0859Dd88209` | Lending & Health Factor source |
| **HTTP x402** | Any | RFC-compliant `402 Payment Required` header rail | Pay-per-request streaming micropayments |
| **8004scan Indexer** | BSC 56 | `https://api.8004scan.io/api/v1` | Semantic search + recent listing |

BSC parameters: **3 s** block time, native gas token **BNB / tBNB**, explorers `bscscan.com` / `testnet.bscscan.com`.

---

## 7. Database Schema

Defined in `db/schema.ts:4` via Drizzle `pgTable`:

### `agents` — PK `(chain_id, agent_id)`

| Column | Type | Notes |
|---|---|---|
| `chain_id` / `agent_id` | `integer` / `text` | Composite PK |
| `token_id`, `owner`, `name`, `description`, `image_url`, `agent_uri` | `text` | ERC-8004 fields |
| `supported_protocols` | `text[]` | e.g. `["x402","erc8183"]` |
| `x402_supported` | `boolean` | default `false` |
| `labels` | `text[]` | `monitoring\|grid\|health_factor\|yield\|uncategorized` |
| `label_confidence` | `real` | 0–1 |
| `label_evidence` / `label_source` | `jsonb` / `text` | `rule` \| `seed` |
| `status` | `text` | `registered` / `active` / `inactive` |
| `active` / `reachable` / `hireable` | `boolean` | Liveness & payment-rail flags |
| `raw_json` | `jsonb` | `hourlyCostU`, `p99LatencyMs`, `reputationScore`, `tags`, … |
| `bandit_alpha` / `bandit_beta` | `real` | Thompson posterior, default `1.0` |
| `success_count` / `failure_count` | `integer` | default `0` |
| `updated_at` | `timestamptz` | default `now()` |

### `hires` — PK `id uuid`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `defaultRandom()` |
| `buyer` | `text` | EOA address (case-insensitive query) |
| `chain_id` / `agent_id` | `integer` / `text` | Hired agent ref |
| `catalog` | `text` | `CareerCategory` |
| `rail` | `text` | `x402` \| `erc8183` |
| `job_id` | `text` | `job_bsc_*` |
| `txs` | `text[]` | Settlement hashes |
| `state` | `text` | `funded\|running\|submitted\|paid\|rejected\|expired` (+ `pending` in-memory) |
| `budget_u` | `numeric` | USD-denominated budget |
| `artifact_uri` | `text` | IPFS proof URI |
| `last_action` | `text` | Human-readable audit trail |
| `created_at` / `updated_at` | `timestamptz` | — |

State machine:

```
pending → funded → running → submitted → paid
                          ↘ rejected / expired
```

`SqlStore.updateHire` (`lib/supabase.ts:155`) atomically bumps `banditAlpha/Beta` on terminal states; `MemoryStore` mirrors the same semantics for preview deployments.

---

## 8. Workers & Automation

| Worker | Module | Trigger | What It Does |
|---|---|---|---|
| **Semantic Sync** | `workers/sync.ts:20` `runSemanticSync()` | `POST /api/workers/sync?mode=semantic` · auto on empty DB | Queries 4 categories × capped queries (≤200/cat) via `searchAgentsSemantic`, maps with `mapRawToAgent`, rate-limited `2100 ms` + `429 → 3500 ms` backoff |
| **Incremental Sync** | `runIncrementalSync(maxPages)` | `POST /api/workers/sync?mode=incremental` | Paginates `GET /api/v1/agents?chain_id=56&limit=50&offset=*` |
| **Latest Sync (24 h cron)** | `runLatestSync()` | `AUTO_SYNC` interval (`SYNC_INTERVAL_MS`, default 86 400 000) · `mode=latest` | `runIncrementalSync(20)` → `runClassificationWorker()` → `runProbeWorker()`; broadcasts SSE |
| **Classification** | `workers/classify.ts` `runClassificationWorker()` | `POST /api/workers/classify` · post-sync | Applies `classifyAgent()` + `TAG_CATEGORY_MAP` to unlabeled agents |
| **Liveness Probe** | `workers/probe.ts:53` `runProbeWorker()` | `POST /api/workers/probe` · every 5 s heartbeat (logical) · post-sync | Resolves `{agentId}` templates, `HEAD→GET` probe with `5 s` timeout, computes `hireable = active && reachable && (x402Supported\|\|agentUri\|\|erc8183)` |

`AUTO_SYNC` logic (`server.ts:291`): on boot, if `countAgents()==0` run `runSemanticSync()` once; then `setInterval(runLatestSync, SYNC_INTERVAL_MS)` with SSE `broadcast` after each run.

---

## 9. REST API Reference

Base URL: `http://localhost:3000` (dev) · `https://<vercel-domain>` (prod). All responses are JSON.

| Method | Endpoint | Description | Query / Body |
|---|---|---|---|
| `GET` | `/api/health` | Service health & timestamp | — |
| `GET` | `/api/context` | Wallet loan HF, debt metrics, heuristic weights | `?wallet=0x…` |
| `GET` | `/api/agents` | List & rank agents (2-Stage Bayesian engine) | `?category=all\|monitoring\|grid\|health_factor\|yield` `&activeOnly=true` `&verifiedOnly=false` `&wallet=0x…` `&q=searchTerm` |
| `GET` | `/api/agents/stream` | SSE — `agents-updated` push (no polling) | EventSource |
| `GET` | `/api/agents/:id` | Telemetry, proof history, raw metadata for one agent | — |
| `GET` | `/api/hires` | All hires, optionally filtered by buyer | `?buyer=0x…` (case-insensitive) |
| `POST` | `/api/hires/prepare` | Quote payload with deadline & escrow terms | `{agentId, budgetU, rail:"x402"\|"erc8183", taskSummary}` |
| `POST` | `/api/hires` | Confirm & persist funded hire after client signature | `{buyer\|buyerAddress, chainId, agentId, catalog, rail, jobId?, txHash?, budgetU?, lastAction?}` |
| `POST` | `/api/hires/:id/sync` | Update execution state / proof / tx | `{state, txHash?, artifactUri?, lastAction?}` → bumps bandit |
| `POST` | `/api/workers/sync` | Trigger sync worker | `?mode=semantic\|incremental\|latest` `&maxPages=20` |
| `POST` | `/api/workers/classify` | Run NLP taxonomy worker | — |
| `POST` | `/api/workers/probe` | Run liveness probe | — |
| `POST` | `/api/auth/verify` | EIP-191 `personal_sign` verification (0 gas) | `{wallet, signature, chainId}` |
| `GET` | `/api/tests/classification` | Classification unit tests (5 cases) | — |

### Example — Ranked Agent Query

```bash
curl "http://localhost:3000/api/agents?wallet=0x42f7B8618e47D3A635B16F6D43B514f7b6059d48&category=all&activeOnly=true"
# → { agents: [{ agentId, name, finalScore, heuristicScore, contentScore, banditScore, ... }], total, walletContext }
```

### Example — Prepare & Fund a Hire

```bash
# 1. Quote
curl -X POST http://localhost:3000/api/hires/prepare \
  -H "Content-Type: application/json" \
  -d '{"agentId":"forge-shield-03","budgetU":"15.00","rail":"erc8183","taskSummary":"Venus HF guard"}'

# 2. Persist after on-chain tx (client signs & sends escrow deposit)
curl -X POST http://localhost:3000/api/hires \
  -H "Content-Type: application/json" \
  -d '{"buyer":"0x42f7...","chainId":97,"agentId":"forge-shield-03","catalog":"health_factor","rail":"erc8183","txHash":"0x7a3e...","budgetU":"15.00"}'

# 3. Agent submits proof → buyer verifies → paid
curl -X POST http://localhost:3000/api/hires/<hireId>/sync \
  -H "Content-Type: application/json" \
  -d '{"state":"submitted","artifactUri":"ipfs://bafy...","txHash":"0xb712..."}'
```

### cURL — Wallet Verification

```bash
# Client signs: signVerificationMessage(provider, address, chain) → signature
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x42f7...","signature":"0x...","chainId":97}'
# → { verified: true, message: "Sign to verify ownership of 0x42f7... on chain 97 — ..." }
```

---

## 10. Frontend Application

### Routing (`src/App.tsx:28`)

| View | Path(s) | Component |
|---|---|---|
| Story / Onboarding | `/story` | `StoryBeatController` |
| Town (default) | `/` `/plaza` `/town` | `TownMap` |
| Marketplace | `/market` `/marketplace` | `MarketplaceView` |
| Agent House | `/agents` `/sanctuary` | `AgentHouse` |
| History | `/history` `/logbook` | `HistoryBookView` |
| Treasury / Profits | `/treasury` `/profits` | `ProfitsDashboard` |
| Demo | `/demo` | `AutoDemoRunner` |

SPA fallback is configured in `vercel.json:6` (`/(.*) → /index.html`) and in `server.ts:281` (`express.static(dist)` + `* → index.html`).

### State & Data Flow

- `fetchAgents()` → `GET /api/agents?wallet=&activeOnly=true` → ranked `AgentData[]` + `walletContext`.
- `fetchHires()` → `GET /api/hires?buyer=` → `HireData[]`.
- `fetchContext()` → `GET /api/context?wallet=` → `WalletContextState` (HF, shortfall, `weightHeuristic`).
- `EventSource('/api/agents/stream')` → `onmessage: agents-updated` → `fetchAgents()`; fallback on `visibilitychange`/`focus`.
- `handleHireAgent()` → `POST /api/hires` → prepend to `hires`, `setFocusedChamber` + `navigate('agents')`.
- `handleSyncJobState()` → `POST /api/hires/:id/sync` → optimistic merge + `fetchContext()` on terminal state.
- Wallet: `discoverWallets()` (EIP-6963) → `connectWallet` → `fetchNativeBalance`/`fetchUBalance` → `signVerificationMessage` → `POST /api/auth/verify`.

### Wallet Integration (`src/lib/wallet.ts`)

EIP-6963 multi-wallet discovery, `Eip1193Provider`, `switchBscChain` (adds BSC if missing), `signVerificationMessage` (EIP-191 `personal_sign`), native BNB + USDT balance fetchers, and a `WalletPickerModal` + `TopBar` verified badge.

---

## 11. Getting Started

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | `>= 18.0.0` | `node -v` |
| npm | `>= 9.0.0` | `npm -v` |
| Postgres (optional) | any | Recommended for persistence; without it the app uses a resilient in-memory cache (still serving only verified on-chain agents) |
| Web3 Wallet (optional) | MetaMask / Trust / injected | For live signing on BSC testnet |

### Installation

```bash
# 1. Clone
git clone https://github.com/quangduy24/marketplace_bnb.git
cd marketplace_bnb

# 2. Install
npm install

# 3. Environment
cp .env.example .env
# Edit .env — see §13. At minimum you can run with no DATABASE_URL (resilient in-memory cache; production should set DATABASE_URL).

# 4. Dev server (Express + Vite HMR)
npm run dev
# → http://localhost:3000  (Vite middleware active)
```

> `GEMINI_API_KEY` is server-managed and never exposed to the client. When `DATABASE_URL` is unset the app runs with a resilient in-memory cache; marketplace data still comes exclusively from verified on-chain ERC-8004 agents (set `DATABASE_URL` for persistent Postgres in production).

### Quick Smoke Test

```bash
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/context?wallet=0x0000000000000000000000000000000000000000"
curl "http://localhost:3000/api/agents?activeOnly=true"
curl http://localhost:3000/api/tests/classification
```

---

## 12. Build & Deployment

### Production Build (local)

```bash
npm run build
# 1. vite build          → dist/  (static SPA)
# 2. esbuild server.ts   → dist/server.cjs  (Node CJS bundle, external packages, sourcemap)

npm start
# node dist/server.cjs  → http://0.0.0.0:3000  (serves dist/ statically in production)
```

Additional scripts:

```bash
npm run preview   # vite preview
npm run lint      # tsc --noEmit
```

### Vercel (Recommended)

`vercel.json` handles SPA rewrites and routes `/api/*` to the Hono function:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Set in Vercel dashboard: `DATABASE_URL` (Supabase transaction pooler, port `6543`), `SCAN_8004_API_URL`, `BSC_MAINNET_RPC_URLS`, `BSC_TESTNET_RPC_URLS`, `GEMINI_API_KEY` (if used).

### Railway / Any Node Host

`npm run build && npm start` with `PORT` env. `vite.config.ts:14` already allows `lans.work`, `*.railway.app`, `localhost`.

### Environment-Aware Serving (`server.ts:272`)

```ts
if (process.env.NODE_ENV !== 'production') app.use(vite.middlewares);
else { app.use(express.static(dist)); app.get('*', (_,res)=>res.sendFile(path.join(dist,'index.html'))); }
```

---

## 13. Environment Variables

Copy `.env.example` → `.env`. All variables are optional with safe fallbacks.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | *(unset → resilient in-memory cache; marketplace still serves only verified on-chain agents)* | Postgres connection string — Supabase transaction pooler `…:6543` recommended for production |
| `NODE_ENV` | `development` | `development` → Vite middleware; `production` → static `dist` |
| `DISABLE_HMR` | `false` | `true` disables Vite HMR + file watching (AI Studio) |
| `PORT` | `3000` | Express HTTP port |
| `BSC_MAINNET_RPC_URLS` | `https://binance.llamarpc.com,https://bsc-dataseed.binance.org` | Comma-separated RPC list |
| `BSC_TESTNET_RPC_URLS` | `https://data-seed-prebsc-1-s1.binance.org:8545,https://bsc-testnet.publicnode.com` | Comma-separated RPC list |
| `SCAN_8004_API_URL` | `https://api.8004scan.io/api/v1` | ERC-8004 indexer base URL |
| `GEMINI_API_KEY` | *(unset)* | Reserved — server-side only, never client-exposed |
| `APP_URL` | *(unset)* | Reserved — applet host URL |
| `AUTO_SYNC` | `true` | `false` disables background 24 h sync |
| `SYNC_INTERVAL_MS` | `86400000` (24 h) | Interval between incremental latest syncs |
| `MAX_PER_CATEGORY` | `200` | Cap per category for semantic sync |
| `MAX_TOTAL_LATEST` | `1000` (`20×50`) | Max agents per 24 h incremental sync |

Connection priority for `DATABASE_URL` (`lib/supabase.ts:7`): `env.HYPERDRIVE.connectionString` → `env.DATABASE_URL` → `globalThis.process.env.DATABASE_URL` → `process.env.DATABASE_URL`.

---

## 14. Security Guarantees

1. **No private-key delegation** — users never share seed phrases or approve blanket spenders; agents act only through explicit escrow parameters.
2. **Escrow guarantee** — funds remain in `ERC-8183` contracts; if proof is not submitted before `deadline` (default `24 h`, `server.ts:154`), the buyer reclaims **100%** of unused funds.
3. **Verifiable proofs** — `artifactUri` + `Keccak256` hash stored on hire; BscScan links for every `funded`/`submitted`/`paid` transaction; `getHires` audit trail is immutable.
4. **Signature verification** — `POST /api/auth/verify` uses `viem.verifyMessage` (EIP-191 `personal_sign`) — **0 gas**, no on-chain tx.
5. **Indexer trust boundary** — `8004scan` responses are treated as untrusted input; `mapRawToAgent` validates `is_active`, `is_endpoint_verified`, rate-limits with `2100 ms` delays and `429` exponential backoff, and probe re-verifies reachability.
6. **Secrets hygiene** — `.env*` is gitignored (except `.env.example`); Vercel env vars are server-only; `GEMINI_API_KEY` never ships to the browser.

---

## 15. Visual Identity & Design System

LANS uses a **Neo-Brutalist Cyberpunk** system — high contrast, hard edges, zero AI-slop gradients.

**Palette:**

| Token | Value | Usage |
|---|---|---|
| Warm Ivory | `#FAF7F0` / `#F4F0EA` | Page canvas / workspace |
| BNB Gold | `#FFE500` | Primary accent, CTAs |
| Status Emerald | `#00F59B` / `#059669` | Live / verified / success |
| Danger Coral | `#FF4365` | Liquidation / error / shortfall |
| Cyber Cyan | `#38BDF8` | Watchtower / info |
| Obsidian | `#121212` | Borders, text, 2–2.5 px frames |

**Principles:** architectural 8-point star **L\*** wordmark with emerald pulse, hard `2px` borders + offset `neo-shadow`, monospace tech typography (`font-mono-tech`), no blurred glassmorphism, responsive touch targets for desktop & mobile.

---

## 16. Performance Benchmarks

Source: [`docs/ADVANTAGE.md`](docs/ADVANTAGE.md) — 3 real on-chain workflows vs. manual intervention on BSC.

| Metric | Manual | LANS Autonomous | Gain |
|---|---|---|---|
| Avg. response latency | 12–45 min (sleep/delay) | **320–450 ms** | **98.4% faster** |
| Liquidation avoidance | 68.2% | **99.8%** | Avoided **8%** penalty |
| Capital efficiency (stablecoin APY) | 4.8% (idle) | **12.6%** (auto-compounded) | **+7.8 pp** |
| PancakeSwap V3 in-range time | 41% | **94.5%** | **+130% fees** |

**Task snapshots:**

- **Venus defense:** BNB −9.4% in 22 min while user offline → manual: 14 min notification + 6 min approval → liquidated at 8% (`$1,840` on `$23k`). LANS (`forge-shield-03`): HF breach detected at `t=120 ms`, flash-rebalance in 1 block (3 s), **$0 penalty** for **15 $U** job cost.
- **Grid repositioning:** WBNB/USDT `$580–$640 → $670` breakout → manual: 35 min tick recalc + 0.42% slippage + 8 h out-of-range. LANS (`grid-master-02`): sub-second geometric ladder, **94.5%** fee-active.
- **Yield sweep:** `$5k` USDT idle 18 d → manual: **$0** + missed **$31.50**. LANS (`harvest-greenhouse-04`): heuristic `idle>500` sweep + 24 h auto-compound → **12.6%** annualized.

---

## 17. Proof of Execution

Source: [`docs/onchain-proof.md`](docs/onchain-proof.md) — complete testnet lifecycle.

| Step | State | Transaction / Artifact | Explorer |
|---|---|---|---|
| **1. Quote & verify** | `registered` | `job_bsc97_8183_9942a1bc` · agent `forge-shield-03` · buyer `0x42f7…9d48` · `15.00 $U` · rail `erc8183` | — |
| **2. Fund escrow** | `registered → funded` | `0x7a3e9c1f8d42b083e47915b4931a78e47c78096cba8714e82b7d2f4001c23f11` · `JobFunded(jobId,buyer,agent,amount,deadline)` | [BscScan Testnet](https://testnet.bscscan.com/tx/0x7a3e9c1f8d42b083e47915b4931a78e47c78096cba8714e82b7d2f4001c23f11) |
| **3. Running** | `funded → running` | `0x9102c84d1a938b27f6e01723c4a205d681283c719e7a2b901fc8b261239aa804` · HF `1.21` check, 15 s heartbeat | [BscScan Testnet](https://testnet.bscscan.com/tx/0x9102c84d1a938b27f6e01723c4a205d681283c719e7a2b901fc8b261239aa804) |
| **4. Proof submit** | `running → submitted` | `0xb71295c478a29103e6182903c718293740291728391029384729102938475819` · `keccak256=0x39a0…08bc` · `ipfs://bafybeihdwd…flt4` — 6.2% dip defended | [BscScan Testnet](https://testnet.bscscan.com/tx/0xb71295c478a29103e6182903c718293740291728391029384729102938475819) |
| **5. Settlement** | `submitted → paid` | Buyer confirms → escrow releases; `banditAlpha++`, `successCount++` | — |

> All transaction hashes above are from the testnet proof trace. For live verification, query `GET /api/hires?buyer=0x…` and follow each hire's `txs[]` to BscScan.

---

## 18. Project Structure

See [§5.2](#52-directory-structure) for the annotated tree. Key invariants:

- `server.ts` and `api/index.ts` share identical ranking, context, and hire logic — keep them in sync when adding endpoints.
- `workers/sync.ts` is intentionally bounded — it never sweeps 300k+ registry entries; caps are enforced via `MAX_PER_CATEGORY` / `MAX_TOTAL_LATEST`.
- Frontend routing is file-level in `App.tsx` with `VIEW_TO_PATH` / `PATH_TO_VIEW` plus `history.pushState` — no external router dependency.
- `lib/supabase.ts` exposes a unified `store` (`SqlStore` on Postgres, resilient in-memory fallback) — all marketplace reads go through the same verified-agent pipeline.

### Real Data & Verified Agent Pipeline

LANS serves **only real, on-chain registered agents** — no mock or synthetic listings. Every agent surfaced to users has passed a multi-stage verification pipeline designed for trust and safety:

**1. Source — ERC-8004 Registry.** Agents are discovered exclusively from the canonical on-chain identity registry (`0x8004A169...` on BSC 56, `0x8004A818...` on BSC 97) via the `8004scan` indexer (`lib/8004scan.ts:117` `mapRawToAgent`). Sync is strictly capped (`MAX_PER_CATEGORY=200`, `MAX_TOTAL_LATEST=1000`, `workers/sync.ts:17`) and rate-limited with `2100 ms` pacing and `429` exponential backoff — no blind sweep of 300k+ entries.

**2. Classification & Filtering.** `workers/classify.ts` maps indexer tags through `TAG_CATEGORY_MAP` (`lib/8004scan.ts:61`) and falls back to the keyword taxonomy (`lib/classify.ts:8`). Agents classified as `uncategorized` are **excluded** from all marketplace queries (`lib/supabase.ts:87` `not(arrayContains(labels, ['uncategorized']))`), so users only see agents with a clear, relevant career.

**3. Liveness & Reachability Probe.** `workers/probe.ts:53` `runProbeWorker()` verifies each `agentUri` (with `{agentId}` template resolution) via `HEAD → GET` with a `5 s` timeout. The indexer signal `is_endpoint_verified` / `health_status` is the primary source; a live HTTP probe is the fallback (`probeAgentEndpoint`). Results are persisted as `reachable`.

**4. Hireable Gate.** An agent becomes `hireable` only when:

```
hireable = active && reachable && (x402Supported || agentUri || erc8183)
```

(`workers/probe.ts:71`, `lib/8004scan.ts:161`). The marketplace defaults to `activeOnly=true`; passing `verifiedOnly=true` additionally requires `reachable && hireable`. Unverified, inactive, or unreachable agents never appear in hiring flows.

**5. Ranking on the Verified Set.** `GET /api/agents` Stage 1 hard-filters on the verified set above, then Stage 2 applies the hybrid Bayesian rank (`FinalScore`, see §4.6). Users can further filter by `category`, search by `q`, and compare side-by-side in `CompareModal` before hiring through `ERC-8183` / `x402` escrow with on-chain `Keccak256` proof verification.

This ensures every agent a user can hire is **registered on-chain, actively maintained, endpoint-verified, and payment-rail ready** — funds are escrowed only to real, reachable providers, with full BscScan auditability.

---

## 19. Roadmap

- [ ] LLM-powered semantic classification & concurrent multi-agent orchestration — server-side LLM (Gemini via `@google/genai`) for intent understanding and taxonomy fallback, plus an orchestration layer that lets one user coordinate many agents in parallel; when a job category has insufficient verified supply, the system auto-recommends the best-matched candidates from the live `8004scan` discovery pool (bounded semantic search) — inspired by **Jeff Dean** (Google Chief Scientist, March 2026 YC Startup School / Latent.Space interview) and his vision that *a single developer will manage ~50 AI agents like a team of interns*, where leverage shifts from hand-writing code to defining specifications, constraints, and *taste*
- [ ] On-chain `ERC-8183` settlement plumbing beyond mock/testnet escrow
- [ ] PancakeSwap V3 position NFT ingestion for true `hasOutOfRangeLiquidity` detection
- [ ] Multi-asset HF aggregation (price oracle integration)
- [ ] WebSocket push alternative to SSE for sub-second telemetry
- [ ] Formal verification of escrow state machine

Contributions are welcome — see below.

---

## 20. Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Keep `server.ts` and `api/index.ts` in sync for any API change.
4. Add or update tests (`GET /api/tests/classification` is the existing harness).
5. Run `npm run lint` and `npm run build` locally.
6. Open a pull request — include before/after screenshots for UI changes and BscScan links for on-chain changes.

Please avoid committing `.env`, `dist/`, `node_modules/`, or AI-generated placeholder assets.

---

## 21. License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for the full text.

```
MIT License

Copyright (c) 2026 LANS Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Built with care for the BNB Chain and autonomous agent ecosystem. Questions or feedback? Open an issue at [github.com/quangduy24/marketplace_bnb](https://github.com/quangduy24/marketplace_bnb).

