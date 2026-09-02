/**
 * 8004scan REST API Client
 * Interacts with the ERC-8004 identity registry indexer on BSC (Chain ID 56).
 * Maps real indexer responses into the app's Agent model.
 */
import * as schema from '../db/schema.ts';
import { classifyAgent, CareerCategory } from './classify.ts';

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
  health_status?: string | null;
  health_score?: number | null;
  star_count?: number;
  watch_count?: number;
  total_score?: number;
  total_feedbacks?: number;
  average_score?: number;
  tags?: string[] | null;
  categories?: string[] | null;
  created_block_number?: number;
  created_tx_hash?: string | null;
  created_at?: string;
  updated_at?: string;
  similarity_score?: number;
  raw_json?: any;
}

const BASE_URL = process.env.SCAN_8004_API_URL ?? 'https://api.8004scan.io/api/v1';

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Indexer tag -> system career category mapping.
 * The marketplace exposes 4 stalls: monitoring | grid | health_factor | yield.
 */
const TAG_CATEGORY_MAP: Record<string, CareerCategory> = {
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
  // grid
  'grid': 'grid',
  'dca': 'grid',
  'range-trading': 'grid',
  'market-making': 'grid',
  'trading-bot': 'grid',
  'lp': 'grid',
  'liquidity': 'grid',
  // monitoring
  'monitor': 'monitoring',
  'monitoring': 'monitoring',
  'watch': 'monitoring',
  'watcher': 'monitoring',
  'alert': 'monitoring',
  'tracker': 'monitoring',
  'tracking': 'monitoring',
  'whale': 'monitoring',
  'sentinel': 'monitoring',
  'security': 'monitoring',
  'risk': 'monitoring',
};

const CATEGORY_ORDER: CareerCategory[] = ['monitoring', 'grid', 'health_factor', 'yield'];

function parseHourlyCostU(raw: Raw8004Agent): string | undefined {
  const text = `${raw.description || ''} ${JSON.stringify(raw.raw_json?.offchain_content?.attributes || [])}`;
  const m = text.match(/(\d+(?:\.\d+)?)\s*\$U/);
  return m ? m[1] : undefined;
}

/**
 * Map a real 8004scan indexer record into the app Agent model.
 * Pure function — unit-testable.
 */
export function mapRawToAgent(raw: Raw8004Agent): Partial<schema.Agent> & { chainId: number; agentId: string } {
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

  const isActive = raw.is_active === true;
  const verified = raw.is_endpoint_verified === true || raw.health_status === 'healthy' || raw.health_status === 'ok';
  const hasPaymentRail = Boolean(raw.x402_supported) || Boolean(a2aEndpoint);

  return {
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
    status: isActive ? 'active' : 'inactive',
    active: isActive,
    reachable: verified,
    hireable: isActive && verified && hasPaymentRail,
    rawJson: {
      hourlyCostU: parseHourlyCostU(raw),
      starCount: raw.star_count ?? 0,
      watchCount: raw.watch_count ?? 0,
      totalScore: raw.total_score ?? 0,
      totalFeedbacks: raw.total_feedbacks ?? 0,
      isVerified: raw.is_verified ?? false,
      endpointVerified: raw.is_endpoint_verified ?? false,
      endpointVerifiedDomain: raw.endpoint_verified_domain ?? null,
      healthStatus: raw.health_status ?? null,
      tags: raw.tags ?? [],
      categories: raw.categories ?? [],
      similarityScore: raw.similarity_score ?? null,
      createdTxHash: raw.created_tx_hash ?? null,
      createdAt: raw.created_at ?? null,
    },
  };
}

/**
 * Fetch semantic search results with rate-limit protection and exponential backoff
 */
export async function searchAgentsSemantic(
  query: string,
  chainId = 56,
  limit = 50,
  offset = 0
): Promise<Raw8004Agent[]> {
  const url = `${BASE_URL}/agents/search/semantic?q=${encodeURIComponent(query)}&chain_id=${chainId}&limit=${limit}&offset=${offset}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (res.status === 429) {
      console.warn('[8004scan] 429 Rate Limit hit. Backing off 3.5s...');
      await sleep(3500);
      return [];
    }

    if (!res.ok) {
      console.warn(`[8004scan] Non-200 response: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : data.items || data.agents || [];
  } catch (err) {
    console.warn('[8004scan] Semantic search fetch error (falling back):', err);
    return [];
  }
}

/**
 * Incremental sync fetching top 3-5 pages only (NEVER blind scan)
 */
export async function fetchRecentAgents(chainId = 56, limit = 50, offset = 0): Promise<Raw8004Agent[]> {
  const url = `${BASE_URL}/agents?chain_id=${chainId}&limit=${limit}&offset=${offset}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (res.status === 429) {
      await sleep(3000);
      return [];
    }

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.items || data.agents || [];
  } catch (err) {
    console.warn('[8004scan] Recent agents fetch error:', err);
    return [];
  }
}
