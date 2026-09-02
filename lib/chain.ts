/**
 * Web3 BSC Configuration (Chain IDs 56 and 97)
 * Viem v2 Client setup and contract registries
 */
import { createPublicClient, http, defineChain } from 'viem';

const DEFAULT_MAINNET_RPCS = ['https://binance.llamarpc.com', 'https://bsc-dataseed.binance.org'];
const DEFAULT_TESTNET_RPCS = ['https://data-seed-prebsc-1-s1.binance.org:8545', 'https://bsc-testnet.publicnode.com'];

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
    default: { http: rpcList(process.env.BSC_MAINNET_RPC_URLS, DEFAULT_MAINNET_RPCS) },
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
    default: { http: rpcList(process.env.BSC_TESTNET_RPC_URLS, DEFAULT_TESTNET_RPCS) },
  },
  blockExplorers: {
    default: { name: 'BscScan Testnet', url: 'https://testnet.bscscan.com' },
  },
  testnet: true,
});

export const CONTRACT_ADDRESSES = {
  // ERC-8004 Agent Identity Registry
  ERC8004_MAINNET: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const,
  ERC8004_TESTNET: '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const,
  // Venus Protocol Comptroller
  VENUS_COMPTROLLER_MAINNET: '0xf2721703d5429BeC86bD0eD86519E0859Dd88209' as const,
  // ERC-8183 Escrow Coordinator Mock/Testnet Address
  ERC8183_ESCROW_TESTNET: '0x8183000000000000000000000000000000008183' as const,
};

export const bscMainnetClient = createPublicClient({
  chain: bscMainnet,
  transport: http(),
});

export const bscTestnetClient = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});
