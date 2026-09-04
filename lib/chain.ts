/**
 * Web3 BSC Configuration (Chain IDs 56 and 97)
 * Viem v2 Client setup and contract registries
 */
import { createPublicClient, http, defineChain } from 'viem';

const DEFAULT_MAINNET_RPCS = ['https://bsc-dataseed.binance.org', 'https://bsc.publicnode.com'];
const DEFAULT_TESTNET_RPCS = ['https://data-seed-prebsc-1-s1.binance.org:8545', 'https://bsc-testnet.publicnode.com'];

function envValue(key: string): string | undefined {
  // Safe for both Node (server/workers) and browser bundles — process may be undefined.
  if (typeof process === 'undefined' || !process.env) return undefined;
  return process.env[key];
}

function rpcList(envValue: string | undefined, fallback: string[]): string[] {
  if (!envValue) return fallback;
  const list = envValue.split(',').map((u) => u.trim()).filter(Boolean);
  return list.length > 0 ? list : fallback;
}

export const bscMainnet = defineChain({
  id: 56,
  name: 'BNB Smart Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'BNB',
  },
  rpcUrls: {
    default: { http: rpcList(envValue('BSC_MAINNET_RPC_URLS'), DEFAULT_MAINNET_RPCS) },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://bscscan.com' },
  },
});

export const bscTestnet = defineChain({
  id: 97,
  name: 'BNB Smart Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'tBNB',
    symbol: 'tBNB',
  },
  rpcUrls: {
    default: { http: rpcList(envValue('BSC_TESTNET_RPC_URLS'), DEFAULT_TESTNET_RPCS) },
  },
  blockExplorers: {
    default: { name: 'BscScan Testnet', url: 'https://testnet.bscscan.com' },
  },
  testnet: true,
});

export const ERC8183_ADDRESSES = {
  56: {
    commerce: '0xEa4DAa3100A767e86FDed867729ae7446476EBA6' as const,
    router: '0x51895229E12F9876011789B04f8698af06cCD6DA' as const,
    policy: '0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5' as const,
    registry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const,
    paymentToken: '0xcE24439F2D9C6a2289F741120FE202248B666666' as const,
  },
  97: {
    commerce: '0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE' as const,
    router: '0xD7d36D66d2F1B608A0F943f722D27e3744f66F25' as const,
    policy: '0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA' as const,
    registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const,
    paymentToken: '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565' as const,
    faucet: '0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3' as const,
  },
} as const;

export const CONTRACT_ADDRESSES = {
  // ERC-8004 Agent Identity Registry
  ERC8004_MAINNET: ERC8183_ADDRESSES[56].registry,
  ERC8004_TESTNET: ERC8183_ADDRESSES[97].registry,
  // Venus Protocol Comptroller
  VENUS_COMPTROLLER_MAINNET: '0xf2721703d5429BeC86bD0eD86519E0859Dd88209' as const,
  // ERC-8183 AgenticCommerce Escrow Kernel
  ERC8183_COMMERCE_MAINNET: ERC8183_ADDRESSES[56].commerce,
  ERC8183_COMMERCE_TESTNET: ERC8183_ADDRESSES[97].commerce,
  // ERC-8183 Evaluator Router
  ERC8183_ROUTER_MAINNET: ERC8183_ADDRESSES[56].router,
  ERC8183_ROUTER_TESTNET: ERC8183_ADDRESSES[97].router,
  // ERC-8183 Optimistic Dispute Policy
  ERC8183_POLICY_MAINNET: ERC8183_ADDRESSES[56].policy,
  ERC8183_POLICY_TESTNET: ERC8183_ADDRESSES[97].policy,
  // $U Payment Token (18 decimals)
  U_TOKEN_MAINNET: ERC8183_ADDRESSES[56].paymentToken,
  U_TOKEN_TESTNET: ERC8183_ADDRESSES[97].paymentToken,
  // BSC Testnet Public $U Faucet (10 $U / 30 mins)
  U_FAUCET_TESTNET: ERC8183_ADDRESSES[97].faucet,
  // Legacy alias for backward compatibility
  ERC8183_ESCROW_TESTNET: ERC8183_ADDRESSES[97].commerce,
};

// ABI definitions for ERC-8183 & Faucet interaction
export const U_FAUCET_ABI = [
  { name: 'requestTokens', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'allowedToWithdraw', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'bool' }] },
] as const;

export const COMMERCE_ABI = [
  { name: 'createJob', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'provider', type: 'address' }, { name: 'evaluator', type: 'address' }, { name: 'expiredAt', type: 'uint256' }, { name: 'description', type: 'string' }, { name: 'hook', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'setBudget', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'optParams', type: 'bytes' }], outputs: [] },
  { name: 'fund', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'expectedBudget', type: 'uint256' }, { name: 'optParams', type: 'bytes' }], outputs: [] },
  { name: 'submit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'deliverable', type: 'bytes32' }, { name: 'optParams', type: 'bytes' }], outputs: [] },
  { name: 'claimRefund', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'jobId', type: 'uint256' }], outputs: [] },
  { name: 'jobCounter', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'paymentToken', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'getJob', type: 'function', stateMutability: 'view', inputs: [{ name: 'jobId', type: 'uint256' }], outputs: [{ type: 'tuple', components: [
    { name: 'id', type: 'uint256' }, { name: 'client', type: 'address' }, { name: 'provider', type: 'address' },
    { name: 'evaluator', type: 'address' }, { name: 'description', type: 'string' }, { name: 'budget', type: 'uint256' },
    { name: 'expiredAt', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'hook', type: 'address' },
    { name: 'submittedAt', type: 'uint256' }, { name: 'deliverable', type: 'bytes32' },
  ] }] },
] as const;

export const ROUTER_ABI = [
  { name: 'registerJob', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'policy', type: 'address' }], outputs: [] },
  { name: 'settle', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'evidence', type: 'bytes' }], outputs: [] },
] as const;

export const POLICY_ABI = [
  { name: 'dispute', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'jobId', type: 'uint256' }], outputs: [] },
  { name: 'disputeWindow', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
] as const;

export const bscMainnetClient = createPublicClient({
  chain: bscMainnet,
  transport: http(),
});

export const bscTestnetClient = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});
