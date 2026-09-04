/**
 * Shared Type Definitions for LANS
 * Autonomous Agent Sanctuary on BNB Chain
 */

export type CareerCategory = 'rebalancing' | 'grid' | 'health_factor' | 'yield';

export type JobState = 'pending' | 'funded' | 'running' | 'submitted' | 'paid' | 'rejected' | 'expired' | 'cancelled';

export interface AgentData {
  chainId: number;
  agentId: string;
  tokenId?: string | null;
  owner?: string | null;
  name: string;
  description: string;
  imageUrl?: string | null;
  agentUri?: string | null;
  supportedProtocols?: string[] | null;
  x402Supported?: boolean | null;
  labels?: string[] | null;
  labelConfidence?: number | null;
  labelEvidence?: any;
  labelSource?: string | null;
  status?: string | null;
  active?: boolean | null;
  reachable?: boolean | null;
  hireable?: boolean | null;
  banditAlpha: number;
  banditBeta: number;
  successCount: number;
  failureCount: number;
  rawJson?: {
    hourlyCostU?: string;
    specialization?: string;
    p99LatencyMs?: number;
    reputationScore?: number;
    [key: string]: any;
  } | null;
  finalScore?: number;
  heuristicScore?: number;
  contentScore?: number;
  banditScore?: number;
}

export interface HireData {
  id: string;
  buyer: string;
  buyerAddress?: string;
  chainId: number;
  agentId: string;
  catalog: CareerCategory | string;
  rail: 'x402' | 'erc8183';
  jobId?: string | null;
  txs?: string[] | null;
  state: JobState;
  budgetU?: string | null;
  paymentToken?: 'BNB' | 'USDT' | 'USDC' | 'U' | string | null;
  paymentAmount?: string | null;
  artifactUri?: string | null;
  lastAction?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface WalletContextState {
  walletAddress?: string;
  hasEmergencyShortfall: boolean;
  healthFactor: number;
  idleStablecoinU?: number;
  hasOutOfRangeLiquidity?: boolean;
  activeWhaleExposure?: boolean;
  heuristicScores?: {
    rebalancing: number;
    grid: number;
    health_factor: number;
    yield: number;
  };
  weightHeuristic?: number;
  activeAlertMessage?: string;
  totalCollateralUSD?: number;
  totalBorrowUSD?: number;
  shortfallUSD?: number;
  pancakePositionsCount?: number;
  idleStableUSD?: number;
}

export type AppView = 'story' | 'town' | 'marketplace' | 'agents' | 'history' | 'profits' | 'demo';

/**
 * Format deposit amount and currency symbol accurately:
 * - Native BNB / tBNB only when explicitly chosen
 * - Standard ERC-8183 escrow defaults to $U
 */
export function formatHirePayment(hire: {
  paymentAmount?: string | null;
  budgetU?: string | null;
  paymentToken?: string | null;
  chainId?: number;
  rail?: string;
}): { amount: string; symbol: string } {
  const rawToken = (hire.paymentToken || '').toUpperCase();
  const isNative = rawToken === 'BNB' || rawToken === 'TBNB';

  if (isNative) {
    const symbol = hire.chainId === 97 ? 'tBNB' : 'BNB';
    const amount = hire.paymentAmount || '0.00';
    return { amount, symbol };
  }

  const symbol = rawToken === 'USDT' ? 'USDT' : rawToken === 'USDC' ? 'USDC' : '$U';
  const amount = hire.paymentAmount || hire.budgetU || '0.00';
  return { amount, symbol };
}
