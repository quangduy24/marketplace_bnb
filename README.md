# 🌟 LANS (L*) — Autonomous DeFi Agent Marketplace

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

> LANS is a decentralized marketplace on BNB Smart Chain that connects DeFi users with verified autonomous AI agents — with cryptographic escrow, Bayesian recommendation, and an interactive map overview.

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
- [19. Hackathon Compliance — Build the Era & Altana](#19-hackathon-compliance--build-the-era--altana)
- [20. Roadmap](#20-roadmap)
- [21. Contributing](#21-contributing)
- [22. License](#22-license)

---

## 1. Executive Summary

**LANS — Autonomous DeFi Agent Marketplace** is a production-grade Web3 platform and interactive simulation on **BNB Smart Chain (BSC)** that matches crypto holders and DeFi protocols with **verified autonomous AI agents** via on-chain identity and trust-minimized payment rails.

Unlike black-box agent marketplaces that expose users to unpredictable costs, opaque execution, and counterparty risk, LANS delivers:

| Pillar | How LANS Delivers |
|---|---|
| **Trust-minimized payment** | `ERC-8183` conditional escrow + `x402` pay-per-request; funds release only on verifiable proof |
| **Intelligent matching** | Context-aware heuristic + Bayesian **Thompson Sampling** bandit that adapts to wallet urgency (e.g., Venus Health Factor) |
| **Operational transparency** | P99 latency, 5 s liveness probes, on-chain proof hashes, BscScan-verified settlement |
| **Novice accessibility** | Plain-English UX, goal-based matchmaker, fixed-duration packages, escrow protection |
| **Engagement** | Interactive map overview with live telemetry, job status, and a guided walkthrough |

The platform is live as a React 19 SPA served by an Express backend (local) and a Hono edge function on Vercel, backed by Postgres/Supabase with an in-memory fallback for previews.

---

## 2. Problem & Solution

| Legacy Marketplace Failure | LANS Solution |
|---|---|
| No canonical identity — anyone can claim to be an agent | **ERC-8004** on-chain registry (`0x8004A169...`) with `8004scan` indexer, semantic search, and endpoint verification |
| Pay upfront, hope for delivery | **ERC-8183** escrow locks funds; release requires `Keccak256`-hashed artifact + `submitted → paid` state transition; reclaim on timeout |
| One-size-fits-all ranking | **2-Stage Bayesian engine** — urgent wallet context (HF < 1.15) dynamically up-weights the relevant category |
| Cold-start starvation for new agents | **Thompson Sampling Beta(α, β)** balances exploration vs. exploitation |
| Inaccessible DeFi jargon | Plain-English categories, glossary, side-by-side comparison matrix |
| Invisible execution | History ledger, SSE real-time sync, Performance dashboard quantifying yield / fees saved |

---

## 3. Key Features

### 3.1 Interactive Home Map (`TownMap` / `AgentHouse`)

A 2D pixel-art map is the primary navigation metaphor. Four sections:

| Section | What It Does |
|---|---|
| 🛒 **Marketplace** | Browse all registered agents across 4 categories, live registry search |
| 🤖 **My Agents** | Track your active agents by category with live job status |
| 📖 **History** | On-chain records & explorer proofs |
| 📈 **Performance** | Cost vs value dashboard |

The marketplace surfaces **4 equal categories** (see [§19.2](#192-four-categories--all-first-class-equal-depth-no-afterthought)):

| Category | What the Agent Does | Example Agent |
|---|---|---|
| **Rebalancing** | Manages LP ranges, resets positions automatically | `Aegis Rebalancing Bot` |
| **Grid Trading** | Places and manages automated grid orders | `Chronos Grid Trading Bot` |
| **Yield Optimisation** | Routes liquidity to the highest available APR | `Demeter Yield Optimiser` |
| **Health Factor Monitoring** | Protects lending positions from liquidation | `Vulcan Health Factor Monitor` |

Additional capabilities: live status (`active`/`reachable`/`hireable`), `focusedChamber` drill-down, and `BottomActionBar` unlimited concurrent hires view.

### 3.2 Marketplace (`MarketplaceView`)

- **Plain-English categories** — each category shows a one-line purpose: *Manages LP ranges · Places grid orders · Routes to highest APR · Protects from liquidation*.
- **Pro Specs** — ERC-8004 `tokenId`, raw JSON metadata, contract addresses, `p99LatencyMs`, `reputationScore`, `hourlyCostU`.
- **Category Matchmaker** — four instant filters: *Rebalancing · Grid Trading · Yield Optimisation · Health Factor Monitoring*, plus an `Uncategorized` tab and a **live registry search** (8004scan, 300k+ agents) right from the search box.
- **Comparison Matrix (`CompareModal`)** — latency, hourly rate, trust, rails (`x402`/`erc8183`), success rate `α/(α+β)` side-by-side.
- **Hire Modal (`HireModal`)** — USD budget presets ($5/10/25/50 + custom), deadline options (5m–7d), token rail selection, relay-quoted gas funding, copyable error reports; escrow-protected hire.

### 3.3 Automated Loan Protection Engine

Queries `Venus Comptroller.getAccountLiquidity(address)` via Viem on BSC Mainnet. Triggers emergency UX when:

```
shortfall > 0  →  HF = 0.95  →  EMERGENCY
HF < 1.15      →  WARNING   →  recommend a Health Factor Monitoring agent
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
| `rebalancing` | `hasOutOfRangeLiquidity` → 0.90 else 0.60 | $h_{r}$ |
| `grid` | `activeWhaleExposure` → 0.70 else 0.55 | $h_{g}$ |

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

- `rebalancing`: rebalance, rebalancing, lp range, reset position, pancake, concentrated liquidity
- `grid`: grid, range trading, dca, limit ladder, grid trading, market-making
- `health_factor`: health factor, liquidation, ltv, collateral, venus, aave
- `yield`: yield, apy, vault, farm, harvest, allocate

If no keyword matches, label is `uncategorized` with confidence 1.0. The marketplace shows it under the `Uncategorized` tab; it is excluded from the 4 category cards (`lib/supabase.ts:87`).

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

where $c(i)$ is the agent's category and $h_{c(i)}$ the matching heuristic score — for multi-tag agents the max across labels is used (`server.ts:82`). Agents are sorted descending by `FinalScore` (rounded to 3 decimals). Example:

- Healthy wallet ($w_H=0.35, w_S=0.35, w_B=0.30$): balanced mix of urgency, quality, and exploration.
- Emergency wallet ($w_H=0.70, w_S=0.35, w_B=0$): ranking collapses to urgency + quality — Health Factor Monitoring surfaces first deterministically.

### 4.7 Yield Compounding (Dashboard)

Dashboard APY uses discrete compounding:

$$
A = P\left(1 + \frac{r}{n}\right)^{n t},\qquad \text{APY} = \left(1+\frac{r}{n}\right)^{n}-1
$$

LANS auto-compounds every 24 h at an optimal gas threshold, lifting realized APY from ~4.8% (idle) to ~12.6% (see [§16](#16-performance-benchmarks)).

---

## 5. Architecture & Technology Stack

```
┌──────────────────────────────────────────────────────────────┐
│ Client (React 19 SPA)                                        │
│ TownMap · MarketplaceView (+PancakeSwap strip) · HireModal   │
│ CompareModal · AgentHouse · History · Profits · Report TermiX│
│ TopBar · LeftNav · BottomActionBar · StoryBeat · AutoDemo    │
│              ↕ fetch / SSE (EventSource)                     │
├──────────────────────────────────────────────────────────────┤
│ API Layer (Express dev / Hono on Vercel)                     │
│ /api/health /context /agents /agents/stream /agents/:id     │
│ /api/hires/prepare /workers/* /auth/verify                  │
│ • Bayesian rank • Venus HF probe • SSE broadcast            │
├──────────────────────────────────────────────────────────────┤
│ Workers & Indexer: sync · classify · probe (5 s liveness)   │
│              ↕ 8004scan REST API  ↕  Viem RPC (BSC)          │
├──────────────────────────────────────────────────────────────┤
│ Persistence: Postgres (Supabase) · Drizzle (agents only)    │
│ Session hires in browser (localStorage) — hires API is stub │
├──────────────────────────────────────────────────────────────┤
│ BNB Smart Chain: ERC-8004 (56/97) · ERC-8183 escrow (97)    │
│ Altana relay + Keystore · Venus Comptroller · BscScan       │
└──────────────────────────────────────────────────────────────┘
```

### Directory (short)

```
api/index.ts             # Hono handler for Vercel (subset of server.ts — see §9)
db/schema.ts             # Drizzle: agents table only (hires DDL lives in lib/bootstrap.ts)
lib/                     # 8004scan · bandit · chain · classify · context · supabase · canonical
src/components/market/   # MarketplaceView (+PancakeSwap strip) · HireModal · CompareModal
src/components/report/   # AdvantageReport (Report TermiX view)
src/components/game/     # TownMap · AgentHouse      src/components/history/  # HistoryBookView
src/components/hud/      # TopBar · LeftNav · BottomActionBar · WalletPickerModal
src/lib/                 # wallet.ts (EIP-6963) · onchain-hires.ts · relay-quote.ts
workers/                 # sync · classify · probe          seeds/four-sellers.json
server.ts                # Express + Vite dev / static dist prod
docs/ADVANTAGE.md        # Benchmark report (Methodology + Task 4 live hire)
```

| Layer | Stack |
|---|---|
| Frontend | React 19 · Vite 6 · TS 5.8 · Tailwind v4 · Motion · Lucide |
| Web3 | Viem 2 · `@altananetwork/sdk@0.9.0` · BSC 56 / 97 |
| Backend | Express 4 (dev) · Hono (Vercel) · tsx/esbuild |
| Data | Drizzle 0.45 · postgres.js · Supabase (optional; memory fallback) |

---

## 6. On-Chain Specifications (BSC Testnet 97 unless noted)

| Contract | Address | Purpose |
|---|---|---|
| ERC-8004 registry (56 / 97) | `0x8004A169…39a432` / `0x8004A818…4BD9e` | Agent identity |
| ERC-8183 Commerce (97) | `0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE` | Escrow kernel (job #1190) |
| EvaluatorRouter (97) | `0xD7d36D66d2F1B608A0F943f722D27e3744f66F25` | Job evaluator + hook |
| OptimisticPolicy (97) | `0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA` | Dispute window |
| $U payment token (97) | `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` | Escrow budget |
| $U faucet (97) | `0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3` | 10 $U / 30 min |
| Altana Keystore (97) | `0x6b8361…71E94A` / controller `0xb530D1…F7e12` | Key registration + fee |
| Altana relay | `testnet-relay.altana.network` (97) | Sponsored-submit intents |
| Venus Comptroller (56) | `0xf2721703…88209` | Health Factor source |

3 s blocks · BNB/tBNB gas · `bscscan.com` / `testnet.bscscan.com`.

---

## 7. Database Schema

`agents` is the only Drizzle table (`db/schema.ts`, PK `chain_id+agent_id`): ERC-8004 fields, `labels[]`, `active/reachable/hireable`, `raw_json` (`hourlyCostU`, `p99LatencyMs`, `reputationScore`, tags), Thompson `bandit_alpha/beta` + `success/failure_count`.

`hires` DDL lives in `lib/bootstrap.ts` (raw SQL, incl. `payment_token/payment_amount`), but **no store implements hire persistence** — `GET /api/hires` returns `{hires: []}` on both servers. Hires live in the browser (`localStorage` + `onchain-hires.ts` session cache, re-verified via `getJob` multicall). Hire lifecycle:

```
pending → funded → running → submitted → paid (↘ rejected / expired)
```

---

## 8. Workers & Automation

| Worker | Trigger | What It Does |
|---|---|---|
| Semantic sync | empty DB or `POST /api/workers/sync?mode=semantic` | 4 categories × ≤200 queries, `2100 ms` pacing |
| Incremental sync | `?mode=incremental` | Paginates `8004scan` agents list |
| Auto-sync | `AUTO_SYNC≠false`, 2 s after boot, every `SYNC_INTERVAL_MS` | Runs **semantic** sync (both branches) + SSE broadcast |
| Classification / Probe | post-sync or own endpoints | Keyword taxonomy; `HEAD→GET` 5 s liveness → `hireable` |

Code default interval is 60 min (`server.ts`); the shipped `.env.example` sets 24 h — set explicitly in your `.env`.

---

## 9. REST API Reference

`http://localhost:3000` (dev). ⚠️ `server.ts` (Express) and `api/index.ts` (Hono) have **diverged**: `POST /api/hires`, `/api/hires/:id/sync|dispute|claim-refund|manifest|auto-run` exist only on Hono; `GET /api/hires/:id/manifest`, `POST /api/hires/:id/auto-run`, `POST /api/hires/log` exist only on Express. `GET /api/hires` is a `{hires: []}` stub on both.

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/api/health`, `/api/context?wallet=` | HF, debt, heuristic weights |
| `GET` | `/api/agents` | Ranked agents (`category/activeOnly/verifiedOnly/live/wallet/q`) |
| `GET` | `/api/agents/stream`, `/api/agents/:id` | SSE push · single-agent telemetry |
| `POST` | `/api/hires/prepare` | Quote: `{agentId, budgetU, rail, taskSummary}` → budget/deadline/terms (default 24 h) |
| `POST` | `/api/workers/sync\|classify\|probe` | Worker triggers |
| `POST` | `/api/auth/verify` | EIP-191 `personal_sign`, 0 gas |

```bash
curl "http://localhost:3000/api/agents?category=all&activeOnly=true"
curl -X POST http://localhost:3000/api/hires/prepare -H 'Content-Type: application/json' \
  -d '{"agentId":"forge-shield-03","budgetU":"15.00","rail":"erc8183","taskSummary":"Venus HF guard"}'
```

---

## 10. Frontend Application

| View | Path | Component |
|---|---|---|
| Home | `/` `/plaza` `/town` | `TownMap` |
| Marketplace | `/market` `/marketplace` | `MarketplaceView` (+ 🥞 PancakeSwap strip) |
| My Agents | `/agents` `/sanctuary` | `AgentHouse` |
| History | `/history` `/logbook` | `HistoryBookView` |
| Performance | `/treasury` `/profits` | `ProfitsDashboard` |
| Report TermiX | `/report` | `AdvantageReport` (proof links) |
| About / Demo | `/story` · `/demo` | `StoryBeatController` · `AutoDemoRunner` |

Data flow: `GET /api/agents` → pools; `EventSource(/api/agents/stream)` + focus fallback → refetch; `HireModal` hires **directly on-chain** (passkey wallet → fund $U + relay-quoted gas → `hireErc8183Agent`), then `handleHireAgent()` stores to session cache + navigates to My Agents; wallet via EIP-6963 → `personal_sign` → `/api/auth/verify`.

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
npm test   # local-only suites in gitignored test/ (ux, quote-parse, 8004scan-live, marketplace, activity, treasury)
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

Additional scripts: `npm run preview` (vite preview) · `npm run lint` (`tsc --noEmit`) · `npm test` (local suites) · `npm run test:testnet` (live testnet flow).

### Vercel (Recommended)

`vercel.json` handles SPA rewrites, routes `/api/*` to the Hono function, and schedules an hourly sync cron:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "crons": [
    { "path": "/api/workers/sync?mode=incremental&maxPages=20", "schedule": "0 * * * *" }
  ]
}
```

Set in Vercel dashboard: `DATABASE_URL` (Supabase transaction pooler, port `6543`), `SCAN_8004_API_URL`, `BSC_MAINNET_RPC_URLS`, `BSC_TESTNET_RPC_URLS`, `GEMINI_API_KEY` (if used).

### Railway / Any Node Host

`npm run build && npm start` with `PORT` env. `vite.config.ts:14` already allows `lans.work`, `*.railway.app`, `localhost`.

Non-production serves Vite middleware; production serves static `dist/` with SPA fallback (`server.ts`).

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
| `AUTO_SYNC` | `true` | `false` disables background sync |
| `SYNC_INTERVAL_MS` | code default `3600000` (60 min); shipped example sets `86400000` (24 h) | Interval between auto syncs |
| `MAX_PER_CATEGORY` | `200` | Cap per category for semantic sync |
| `MAX_TOTAL_LATEST` | `1000` (`20×50`) | Max agents per incremental sync |

Connection priority for `DATABASE_URL` (`lib/supabase.ts:7`): `env.HYPERDRIVE.connectionString` → `env.DATABASE_URL` → `globalThis.process.env.DATABASE_URL` → `process.env.DATABASE_URL`.

---

## 14. Security Guarantees

1. **No private-key delegation** — the EOA only funds a fresh passkey smart wallet per hire (platform authenticator only); keys never leave custody.
2. **Escrow guarantee** — funds sit in `ERC-8183` Commerce; past `deadline` (default 24 h, configurable per hire) the buyer reclaims via `claimRefund`.
3. **Verifiable proofs** — every fund/hire tx links to BscScan; deliverables verify against on-chain `Keccak256`; failures show copyable relay diagnostics.
4. **Signature verification** — `POST /api/auth/verify` (`viem.verifyMessage`, EIP-191) — **0 gas**.
5. **Indexer trust boundary** — `8004scan` is untrusted input; `mapRawToAgent` validates activity/endpoint signals, rate-limits, and the probe re-verifies reachability before `hireable`.
6. **Secrets hygiene** — `.env*` gitignored (except `.env.example`); `GEMINI_API_KEY` never ships to the browser.

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
| Cyber Cyan | `#38BDF8` | Rebalancing / info |
| Obsidian | `#121212` | Borders, text, 2–2.5 px frames |

**Principles:** architectural 8-point star **L\*** wordmark with emerald pulse, hard `2px` borders + offset `neo-shadow`, monospace tech typography (`font-mono-tech`), no blurred glassmorphism, responsive touch targets for desktop & mobile.

---

## 16. Performance Benchmarks

Source: `docs/ADVANTAGE.md` (Methodology + Task 4 live hire). Labels: **Measured** = explorer/probe-backed, **Target** = not yet proven.

| Metric | Manual | LANS | Status |
|---|---|---|---|
| Response latency | 12–45 min | **320–450 ms** | Measured (probe) |
| Liquidation avoidance | 68.2% | **99.8%** | Measured (testnet sample) |
| Stablecoin APY | 4.8% idle | **12.6%** auto-compounded | Model + observed sweep |
| PancakeSwap V3 in-range | 41% | **94.5%** | Target — live proof pending |

Snapshots: Venus defense (`forge-shield-03`, $0 penalty) · Grid repositioning (`grid-master-02`) · Yield sweep (`harvest-greenhouse-04`) — see `docs/ADVANTAGE.md`.

---

## 17. Proof of Execution

Live hire, BSC Testnet 97, 2026-09-09 — Job **#1190** (`FUNDED`, 1.00 $U, provider `0xD92f…BdaA2A`):

| Step | Transaction |
|---|---|
| Fund 1.00 $U (block 130017011) | [0x57a62a80…](https://testnet.bscscan.com/tx/0x57a62a808540658fccd81f4ed1a187c414abd427fdbe0a4f164a7cbdc5df2800) |
| Fund gas 0.000667 tBNB (130017028) | [0x6552bc03…](https://testnet.bscscan.com/tx/0x6552bc03a319454553a7124f024b5cf4e656668e0294e2bb4c6a0d956a26b590) |
| Top-up deficit 0.000177 tBNB (130017062) | [0x9f83b664…](https://testnet.bscscan.com/tx/0x9f83b664d4effa42a756a195c63843d2b8ae4897806cc9f4e2bb1477cbb93792) |
| Hire bundle → Job #1190 (130017080) | [0x5685d13a…](https://testnet.bscscan.com/tx/0x5685d13a00cf78c99786b7809dd39a8499db75ec803c9a4dd2bcd4199ada6d7a) |

Verify anytime: `getJob(1190)` on Commerce `0xa206c0…B0DE`, or open **Report TermiX** (`/report`) in the app.

---

## 18. Project Structure

Key invariants:

- `server.ts` (Express) and `api/index.ts` (Hono) share ranking/context logic but have **diverged** — check §9 before adding endpoints; keep them in sync going forward.
- `workers/sync.ts` never sweeps the 300k+ registry — caps via `MAX_PER_CATEGORY` / `MAX_TOTAL_LATEST`.
- Routing is `VIEW_TO_PATH`/`PATH_TO_VIEW` + `history.pushState` in `App.tsx` — no router dependency.
- `lib/supabase.ts` unifies `SqlStore` (Postgres) and in-memory fallback for **agent reads**; hires live in the browser session cache, re-verified on-chain.

### Verified Agent Pipeline

Only real on-chain-registered agents are served — no mock listings:

1. **Source** — ERC-8004 registry via `8004scan` (`mapRawToAgent`), capped + rate-limited sync.
2. **Classification** — `TAG_CATEGORY_MAP` + keyword fallback; `uncategorized` stays in a directory-only tab.
3. **Probe** — endpoint verification + 5 s `HEAD→GET` liveness → `reachable`.
4. **Hireable gate** — active + reachable + payment rail; `verifiedOnly` additionally enforced.
5. **Ranking** — hard filter, then hybrid Bayesian `FinalScore` (§4.6); compare side-by-side before escrow.

---

## 19. Hackathon Compliance — Build the Era & Altana

> Self-assessment against **Binance Hackathon: Build the Era** judging and **Altana** requirements. Every claim links code or a live transaction.

### 19.1 Judging Criteria

| Criterion | LANS Implementation | Status | Evidence |
|---|---|---|---|
| **Functionality** | Land → find by category → hire → track: `TownMap` overview, `MarketplaceView` (4 categories + `Uncategorized` + live registry search), `HireModal` (USD presets + deadline options), `AgentHouse` + `HistoryBookView` + `ProfitsDashboard` post-hire. Routes `/plaza /market /agents /history /treasury /report` | ✅ | `src/App.tsx`, `src/components/market/HireModal.tsx` |
| **Data Quality** | Venus `getAccountLiquidity` → HF + weights, `8004scan` indexer with backoff, `p99LatencyMs` / `reputationScore` / Thompson `α/β`, SSE push. Compare matrix: latency, cost, trust, rail, settle rate | ✅ | `lib/context.ts`, `lib/8004scan.ts`, `src/components/market/CompareModal.tsx` |
| **Agent Diversity** | 4 first-class categories, equal UI/ranking/probe depth (§19.2) + dedicated **🥞 PancakeSwap Agents** strip + **Report TermiX** view (`/report`) with clickable proofs | ✅ | `src/components/market/MarketplaceView.tsx`, `src/components/report/AdvantageReport.tsx` |

### 19.2 Four Categories

| Category | Agent | Depth |
|---|---|---|
| 🔄 Rebalancing | `Aegis` — PancakeSwap V3 LP ranges | HF-style heuristic, probe, compare matrix |
| 📈 Grid Trading | `Chronos` — DCA / limit ladder | Same depth as the other three |
| 💰 Yield | `Demeter` — vault routing, auto-compound | `idleStablecoinU > 500` sweep, APY compounding |
| 🛡️ Health Factor | `Vulcan` — Venus HF guard | `HF < 1.15` emergency override, on-chain Comptroller reads |

`Uncategorized` is search-only, never competes with the four.

### 19.3 Altana Checklist — Now Live, Not Just Aligned

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Agents on their own Altana wallets | ✅ **Shipped** — buyer hires from a passkey smart wallet (platform authenticator only), EOA only funds it | `HireModal.tsx` (`createPasskeyWallet` + `platformOnlyCreateFn`), `@altananetwork/sdk@0.9.0` |
| 2 | Hire through ERC-8183 SDK | ✅ **Shipped** — atomic `createJob → registerJob → setBudget → approve → fund` via `hireErc8183Agent` on testnet Commerce `0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE` | `lib/chain.ts:63-70`, `HireModal.tsx` |
| 3 | Sessions registered in Keystore | ✅ **Shipped** — first-action `initialRegisterKey` auto-prepended; fee read live, funded exactly (relay-quote dry-run + one deficit retry) | `src/lib/relay-quote.ts`, KeyStore `0x6b8361…71E94A` |
| 4 | Real onchain txs through the wallet | ✅ **Testnet-verified** — Job #1190 FUNDED, proofs below | Links below |
| 5 | Scoped sessions (allowlist/spend/expiry) + in-product revoke | ⚠️ Partial — budget/deadline caps enforced per hire; full session grants + revoke UI are roadmap | `server.ts`, `db/schema.ts` |

### 19.4 Live Proof — Job #1190 (BSC Testnet 97, 2026-09-09)

Buyer `0xccd76C…BfD2` → passkey wallet `0xDc50…7d1b76` → provider `0xD92f…BdaA2A`, budget **1.00 $U**, state **FUNDED**:

| Step | Transaction |
|---|---|
| Fund 1.00 $U (block 130017011) | [0x57a62a80…](https://testnet.bscscan.com/tx/0x57a62a808540658fccd81f4ed1a187c414abd427fdbe0a4f164a7cbdc5df2800) |
| Fund gas 0.000667 tBNB (block 130017028) | [0x6552bc03…](https://testnet.bscscan.com/tx/0x6552bc03a319454553a7124f024b5cf4e656668e0294e2bb4c6a0d956a26b590) |
| Top-up deficit 0.000177 tBNB (block 130017062) | [0x9f83b664…](https://testnet.bscscan.com/tx/0x9f83b664d4effa42a756a195c63843d2b8ae4897806cc9f4e2bb1477cbb93792) |
| Hire bundle → Job #1190 (block 130017080) | [0x5685d13a…](https://testnet.bscscan.com/tx/0x5685d13a00cf78c99786b7809dd39a8499db75ec803c9a4dd2bcd4199ada6d7a) |

> **Bottom line:** end-to-end hire works on real testnet rails today; remaining work is scoped (session allowlist UI, mainnet promotion).

## 20. Roadmap

- [ ] Seller submit/settle loop closed on Job #1190 (`submitted → paid`) + Task 4 completion in `docs/ADVANTAGE.md`
- [ ] Scoped session grants (allowlist/spend-cap/expiry) + in-product revoke; mainnet (56) promotion
- [ ] PancakeSwap V3 position ingestion for true `hasOutOfRangeLiquidity` detection
- [ ] Reunite `server.ts` ↔ `api/index.ts` hire endpoints (`POST /api/hires`, `:id/sync|dispute|claim-refund`)
- [ ] Persisted hire ledger (today: browser session cache + on-chain `getJob`)
- [ ] LLM semantic classification fallback + WebSocket telemetry alternative

Contributions are welcome — see below.

---

## 21. Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Keep `server.ts` and `api/index.ts` in sync for any API change.
4. Add or update tests — `npm test` (`test/ux-writing.test.ts`) plus `GET /api/tests/classification` is the existing harness.
5. Run `npm run lint`, `npm test`, and `npm run build` locally.
6. Open a pull request — include before/after screenshots for UI changes and BscScan links for on-chain changes.

Please avoid committing `.env`, `dist/`, `node_modules/`, or AI-generated placeholder assets.

---

## 22. License

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

