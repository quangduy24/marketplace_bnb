/**
 * Shared Type Definitions for LANS
 * Autonomous Agent Sanctuary on BNB Chain
 */

export type CareerCategory = 'rebalancing' | 'grid' | 'health_factor' | 'yield';

export type JobState = 'funded' | 'running' | 'submitted' | 'paid' | 'rejected' | 'expired';

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
