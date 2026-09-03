/**
 * 8004scan REST API Client
 * Interacts with the ERC-8004 identity registry indexer on BSC (Chain ID 56 / 97).
 * Maps real indexer responses into the app's Agent model.
 * Real-time feed for the 2-Stage Bayesian recommendation engine:
 *   - /agents                  -> lean list shape (no tags/categories/is_active/is_endpoint_verified)
 *   - /agents/search/semantic  -> full shape (all verification + scores fields)
 */
import * as schema from '../db/schema.ts';
import { classifyAgent, CareerCategory } from './classify.ts';

export interface Raw8004Scores {
  rank?: number | null;
  wallet?: number | null;
  quality?: number | null;
  activity?: number | null;
  freshness?: number | null;
  chain_rank?: number | null;
  is_testnet?: boolean | null;
  popularity?: number | null;
  health_score?: number | null;
  health_status?: string | null;
  last_scored_at?: string | null;
  skipped_reason?: string | null;
  completeness_tier?: string | null;
  metadata_completeness?: number | null;
  completeness_multiplier?: number | null;
}

export interface Raw8004Agent {
  id?: string;
  agent_id: string; // "56:0x8004a169...:331140"
  token_id?: string | null;
  chain_id?: number;
  chain_type?: string;
  contract_address?: string;
  is_testnet?: boolean;
  owner_id?: string;
  owner_address?: string | null;
  owner_username?: string | null;
  owner_ens?: string | null;
  owner_avatar_url?: string | null;
  owner_publisher_tier?: string | null;
  owner_certified_name?: string | null;
  creator_address?: string | null;
  agent_wallet?: string | null;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  agent_url?: string | null;
  a2a_endpoint?: string | null;
  a2a_version?: string | null;
  mcp_server?: string | null;
  supported_protocols?: string[] | null;
  x402_supported?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  is_endpoint_verified?: boolean;
  endpoint_verified_domain?: string | null;
  endpoint_verification_error?: string | null;
  endpoint_verified_at?: string | null;
  endpoint_last_checked_at?: string | null;
  health_status?: string | null;
  health_score?: number | null;
  star_count?: number;
  watch_count?: number;
  total_score?: number;
  total_feedbacks?: number;
  total_validations?: number;
  successful_validations?: number;
  average_score?: number;
  rank?: number | null;
  network_rank?: number | null;
  tags?: string[] | null;
  categories?: string[] | null;
  supported_trust_models?: string[] | null;
  cross_chain_links?: unknown[] | null;
  cross_chain_versions?: unknown | null;
  scores?: Raw8004Scores | null;
  parse_status?: { status?: string; info?: unknown[]; warnings?: unknown[]; errors?: unknown[] } | null;
  raw_metadata?: {
    onchain?: { key: string; value: string; decoded?: string }[] | null;
    offchain_uri?: string | null;
    offchain_content?: Record<string, unknown> | null;
  } | null;
  created_block_number?: number;
  created_tx_hash?: string | null;
  created_at?: string;
  updated_at?: string;
  similarity_score?: number;
  raw_json?: any;
}

export type Mapped8004Agent = Partial<schema.Agent> & { chainId: number; agentId: string };

const BASE_URL = process.env.SCAN_8004_API_URL ?? 'https://api.8004scan.io/api/v1';

/** Quota floor: when the minute-bucket is nearly exhausted, pause before the next request. */
const RATE_LIMIT_FLOOR = 10;

/**
 * Auth + Accept headers for 8004scan. Sends X-API-Key when configured
 * (server-side only — lib/8004scan.ts is never imported by the browser bundle).
 */
export function apiHeaders(): Record<string, string> {
  const key = (typeof process !== 'undefined' && process.env?.API_8004scan_key) || undefined;
  return {
    Accept: 'application/json',
    ...(key ? { 'X-API-Key': key } : {}),
  };
}

/**
 * Backoff (ms) derived from 8004scan rate-limit response headers.
 * Returns null when plenty of quota remains.
 */
export function backoffFromRateLimit(headers: Headers): number | null {
  const raw = headers.get('X-Ratelimit-Remaining-Minute');
  if (raw == null) return null;
  const remaining = Number(raw);
  if (Number.isFinite(remaining) && remaining <= RATE_LIMIT_FLOOR) return 3000;
  return null;
}

export function isSemanticMatchRelevant(similarityScore: unknown, minimum = 0.5): boolean {
  if (similarityScore == null) return true;
  const score = Number(similarityScore);
  return Number.isFinite(score) && score >= minimum;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Seed the Thompson Sampling prior (banditAlpha/Beta) from registry reputation:
 * total_feedbacks + average_score (0..5) become Beta pseudo-observations.
 * Agents with real on-chain feedback outrank cold-start agents (1/1) immediately.
 * Pure function — unit-testable.
 */
export function computeBanditPrior(
  totalFeedbacks: number | null | undefined,
  averageScore: number | null | undefined
): { banditAlpha: number; banditBeta: number } {
  if (totalFeedbacks == null || averageScore == null) return { banditAlpha: 1.0, banditBeta: 1.0 };
  const n = Number(totalFeedbacks);
  const avg = Number(averageScore);
  if (!Number.isFinite(n) || n <= 0 || !Number.isFinite(avg)) {
    return { banditAlpha: 1.0, banditBeta: 1.0 };
  }
  const p = Math.min(1, Math.max(0, avg / 5));
  const successes = Math.round(n * p);
  return { banditAlpha: 1 + successes, banditBeta: 1 + (n - successes) };
}

/**
 * Indexer tag -> system career category mapping.
 * The marketplace exposes 4 stalls: rebalancing | grid | health_factor | yield.
 */
export const TAG_CATEGORY_MAP: Record<string, CareerCategory> = {
  // health_factor
  'health-factor': 'health_factor',
  'health factor': 'health_factor',
  'liquidation': 'health_factor',
  'lending-risk': 'health_factor',
  'lending': 'health_factor',
  'loan': 'health_factor',
  'venus': 'health_factor',
  'aave': 'health_factor',
  'ltv': 'health_factor',
  'collateral': 'health_factor',
  'borrow': 'health_factor',
  // yield
  'yield': 'yield',
  'apy': 'yield',
  'vault': 'yield',
  'farm': 'yield',
  'farming': 'yield',
  'harvest': 'yield',
  'staking': 'yield',
  'earn': 'yield',
  // rebalancing — manages LP ranges, resets positions automatically
  'rebalance': 'rebalancing',
  'rebalancing': 'rebalancing',
  'lp': 'rebalancing',
  'liquidity': 'rebalancing',
  'pancake': 'rebalancing',
  'pancakeswap': 'rebalancing',
  'v3': 'rebalancing',
  'concentrated': 'rebalancing',
  'position': 'rebalancing',
  'reset': 'rebalancing',
  // grid — places and manages automated grid orders
  'grid': 'grid',
  'grid-trading': 'grid',
  'grid trading': 'grid',
  'dca': 'grid',
  'range-trading': 'grid',
  'market-making': 'grid',
  'trading-bot': 'grid',
  'limit-ladder': 'grid',
  // legacy monitoring tags -> map to rebalancing for backward compat
  'monitor': 'rebalancing',
  'monitoring': 'rebalancing',
  'watch': 'rebalancing',
  'watcher': 'rebalancing',
  'alert': 'rebalancing',
  'tracker': 'rebalancing',
  'tracking': 'rebalancing',
  'whale': 'rebalancing',
  'sentinel': 'rebalancing',
  'security': 'rebalancing',
  'risk': 'rebalancing',
};

const CATEGORY_ORDER: CareerCategory[] = ['rebalancing', 'grid', 'health_factor', 'yield'];

function parseHourlyCostU(raw: Raw8004Agent): string | undefined {
  const text = `${raw.description || ''} ${JSON.stringify(raw.raw_json?.offchain_content?.attributes || [])}`;
  const m = text.match(/(\d+(?:\.\d+)?)\s*\$U/);
  return m ? m[1] : undefined;
}

function parseAgentHealthStatus(raw: Raw8004Agent): string | null {
  return raw.health_status ?? raw.scores?.health_status ?? null;
}

/**
 * Map a real 8004scan indexer record into the app Agent model.
 * Shape-safe: fields whose inputs are missing from the lean /agents list shape
 * are OMITTED (not written as false), so upsert never flips existing DB values.
 * Pure function — unit-testable.
 */
export function mapRawToAgent(raw: Raw8004Agent): Mapped8004Agent {
  const chainId = raw.chain_id || 56;
  const agentId = raw.agent_id;
  const a2aEndpoint = raw.a2a_endpoint || raw.agent_url || null;

  // Labels: indexer tags first, keyword classifier fallback
  const tagLabels = new Set<CareerCategory>();
  for (const tag of raw.tags || []) {
    const cat = TAG_CATEGORY_MAP[tag.toLowerCase()];
    if (cat) tagLabels.add(cat);
  }
  let labels: string[];
  let labelConfidence: number;
  if (tagLabels.size > 0) {
    labels = CATEGORY_ORDER.filter((c) => tagLabels.has(c));
    labelConfidence = 0.75;
  } else {
    const cls = classifyAgent(raw.name, raw.description);
    labels = cls.labels;
    labelConfidence = cls.confidence;
  }

  const hasActiveSignal = raw.is_active !== undefined && raw.is_active !== null;
  const isActive = raw.is_active === true;

  const healthStatus = parseAgentHealthStatus(raw);
  const hasVerificationSignal =
    raw.is_endpoint_verified !== undefined ||
    healthStatus != null ||
    raw.endpoint_verified_domain != null ||
    raw.endpoint_last_checked_at != null;

  const verified =
    raw.is_endpoint_verified === true || healthStatus === 'healthy' || healthStatus === 'ok';
  const hasPaymentRail = Boolean(raw.x402_supported) || Boolean(a2aEndpoint);

  const result: Mapped8004Agent = {
    chainId,
    agentId,
    tokenId: raw.token_id ?? null,
    owner: raw.owner_address ?? null,
    name: raw.name ?? null,
    description: raw.description ?? null,
    imageUrl: raw.image_url ?? null,
    agentUri: a2aEndpoint,
    supportedProtocols: raw.supported_protocols ?? [],
    x402Supported: raw.x402_supported ?? false,
    labels,
    labelConfidence,
    labelEvidence: null,
    labelSource: 'rule',
  };

  // Registry reputation -> Thompson prior (feeds the existing Bayesian filter)
  if (raw.total_feedbacks !== undefined || raw.average_score !== undefined) {
    const prior = computeBanditPrior(raw.total_feedbacks, raw.average_score);
    result.banditAlpha = prior.banditAlpha;
    result.banditBeta = prior.banditBeta;
  }

  // Only write lifecycle fields when their source signals actually exist (shape-safe)
  if (hasActiveSignal) {
    result.active = isActive;
    result.status = isActive ? 'active' : 'inactive';
    if (hasVerificationSignal) {
      result.reachable = verified;
      result.hireable = isActive && verified && hasPaymentRail;
    }
  } else if (hasVerificationSignal) {
    result.reachable = verified;
  }

  result.rawJson = {
    hourlyCostU: parseHourlyCostU(raw),
    starCount: raw.star_count ?? 0,
    watchCount: raw.watch_count ?? 0,
    totalScore: raw.total_score ?? 0,
    totalFeedbacks: raw.total_feedbacks ?? 0,
    isVerified: raw.is_verified ?? false,
    endpointVerified: raw.is_endpoint_verified ?? false,
    endpointVerifiedDomain: raw.endpoint_verified_domain ?? null,
    healthStatus: healthStatus,
    healthScore: raw.health_score ?? raw.scores?.health_score ?? null,
    tags: raw.tags ?? [],
    categories: raw.categories ?? [],
    similarityScore: raw.similarity_score ?? null,
    createdTxHash: raw.created_tx_hash ?? null,
    createdAt: raw.created_at ?? null,
    // New real-time registry signals (8004scan API)
    agentWallet: raw.agent_wallet ?? null,
    creatorAddress: raw.creator_address ?? null,
    scores: raw.scores ?? null,
    registryRank: raw.rank ?? raw.scores?.rank ?? null,
    networkRank: raw.network_rank ?? raw.scores?.chain_rank ?? null,
    parseStatus: raw.parse_status?.status ?? null,
    endpointLastCheckedAt: raw.endpoint_last_checked_at ?? null,
    supportedTrustModels: raw.supported_trust_models ?? null,
    totalValidations: raw.total_validations ?? 0,
    successfulValidations: raw.successful_validations ?? 0,
    chainType: raw.chain_type ?? null,
  };

  return result;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/**
 * Merge a real-time registry record over its local DB counterpart.
 * Registry identity/liveness data stays fresh while marketplace outcomes remain additive.
 */
export function mergeLiveAgent(existing: Partial<schema.Agent> | undefined, live: Mapped8004Agent): Mapped8004Agent {
  const merged = {
    ...existing,
    ...live,
    rawJson: {
      ...asRecord(existing?.rawJson),
      ...asRecord(live.rawJson),
    },
  } as Mapped8004Agent;

  if (existing) {
    // A sparse upstream record must not erase known identity and endpoint metadata.
    for (const key of ['tokenId', 'owner', 'name', 'description', 'imageUrl', 'agentUri'] as const) {
      if (live[key] == null && existing[key] != null) merged[key] = existing[key] as never;
    }
  }

  const successCount = Number(existing?.successCount ?? 0);
  const failureCount = Number(existing?.failureCount ?? 0);
  merged.successCount = Number.isFinite(successCount) ? Math.max(0, successCount) : 0;
  merged.failureCount = Number.isFinite(failureCount) ? Math.max(0, failureCount) : 0;

  if (live.banditAlpha != null && live.banditBeta != null) {
    merged.banditAlpha = Number(live.banditAlpha) + merged.successCount;
    merged.banditBeta = Number(live.banditBeta) + merged.failureCount;
  } else if (!existing) {
    merged.banditAlpha = 1;
    merged.banditBeta = 1;
  }

  return merged;
}

async function handleRateLimit(res: Response, backoffMs: number): Promise<void> {
  const retryAfter = Number(res.headers.get('Retry-After'));
  const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs;
  console.warn(`[8004scan] Rate limited (${res.status}). Backing off ${Math.round(waitMs / 1000)}s...`);
  await sleep(waitMs);
}

/**
 * Fetch semantic search results with API-key auth, rate-limit protection and backoff.
 * Returns FULL-shape records (verification + scores fields).
 */
export async function searchAgentsSemantic(
  query: string,
  chainId = 56,
  limit = 50,
  offset = 0
): Promise<Raw8004Agent[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const url = `${BASE_URL}/agents/search/semantic?q=${encodeURIComponent(query)}&chain_id=${chainId}&limit=${safeLimit}&offset=${offset}`;

  try {
    const res = await fetch(url, { headers: apiHeaders() });

    if (res.status === 429) {
      await handleRateLimit(res, 3500);
      return [];
    }

    if (!res.ok) {
      console.warn(`[8004scan] Non-200 response: ${res.status}`);
      return [];
    }

    const backoff = backoffFromRateLimit(res.headers);
    if (backoff) await sleep(backoff);

    const data = await res.json();
    return Array.isArray(data) ? data : data.items || data.agents || [];
  } catch (err) {
    console.warn('[8004scan] Semantic search fetch error (falling back):', err);
    return [];
  }
}

/**
 * Incremental sync fetching latest agents (lean list shape).
 * Top 3-5 pages only (NEVER blind scan).
 */
export async function fetchRecentAgents(chainId = 56, limit = 50, offset = 0): Promise<Raw8004Agent[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const url = `${BASE_URL}/agents?chain_id=${chainId}&limit=${safeLimit}&offset=${offset}`;

  try {
    const res = await fetch(url, { headers: apiHeaders() });

    if (res.status === 429) {
      await handleRateLimit(res, 3000);
      return [];
    }

    if (!res.ok) return [];

    const backoff = backoffFromRateLimit(res.headers);
    if (backoff) await sleep(backoff);

    const data = await res.json();
    return Array.isArray(data) ? data : data.items || data.agents || [];
  } catch (err) {
    console.warn('[8004scan] Recent agents fetch error:', err);
    return [];
  }
}
