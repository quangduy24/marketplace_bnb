/**
 * On-chain Hire & Escrow Management (Stateless, Zero-DB)
 * Supports both BSC Testnet (Chain ID: 97) and BSC Mainnet (Chain ID: 56)
 */
import { encodeFunctionData, formatUnits, parseAbiItem } from 'viem';
import {
  ERC8183_ADDRESSES,
  COMMERCE_ABI,
  ROUTER_ABI,
  POLICY_ABI,
  bscMainnetClient,
  bscTestnetClient,
} from '../../lib/chain.ts';
import { HireData, CareerCategory } from '../types.ts';
import { BscNetwork, Eip1193Provider } from './wallet.ts';

// In-memory cache for recent user hires during the active session (Zero DB writes)
const sessionHiresCache = new Map<string, HireData[]>();

const STORAGE_PREFIX = 'bnb_agent_hires_';

function getStorageKey(buyerAddress: string, network: BscNetwork): string {
  return `${STORAGE_PREFIX}${buyerAddress.toLowerCase()}_${network}`;
}

// Notify server so clear logs appear in terminal where `npm run dev` is running
export function notifyServerHiresEvent(
  action: string,
  wallet: string,
  network: string,
  hireDetails?: Partial<HireData>,
  hiresCount?: number
) {
  if (typeof window !== 'undefined' && window.fetch) {
    fetch('/api/hires/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        wallet,
        network,
        hireId: hireDetails?.id,
        agentId: hireDetails?.agentId,
        catalog: hireDetails?.catalog,
        state: hireDetails?.state,
        budgetU: hireDetails?.budgetU,
        paymentToken: hireDetails?.paymentToken,
        txHash: hireDetails?.txs?.[0],
        hiresCount,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }
}

export function getSessionHires(buyerAddress: string, network: BscNetwork): HireData[] {
  if (!buyerAddress) return [];
  const key = `${buyerAddress.toLowerCase()}_${network}`;

  // 1. Try memory cache first
  if (sessionHiresCache.has(key) && (sessionHiresCache.get(key)?.length || 0) > 0) {
    return sessionHiresCache.get(key) || [];
  }

  // 2. Fallback to localStorage across browser reloads (F5)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(getStorageKey(buyerAddress, network));
      if (stored) {
        const parsed = JSON.parse(stored) as HireData[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          sessionHiresCache.set(key, parsed);
          console.log(`[Hires Storage] Restored ${parsed.length} hired agent(s) from browser storage for ${buyerAddress} on ${network}`);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Hires Storage] Read error:', e);
    }
  }

  return sessionHiresCache.get(key) || [];
}

export function addSessionHire(buyerAddress: string, network: BscNetwork, hire: HireData): void {
  if (!buyerAddress) return;
  const key = `${buyerAddress.toLowerCase()}_${network}`;
  const existing = getSessionHires(buyerAddress, network);
  const updated = [hire, ...existing.filter((h) => h.id !== hire.id)];
  sessionHiresCache.set(key, updated);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(getStorageKey(buyerAddress, network), JSON.stringify(updated));
      console.log(`[Hires Storage] Persisted hire ${hire.id} (${hire.catalog}) to localStorage for ${buyerAddress}`);
    } catch (e) {
      console.warn('[Hires Storage] Save error:', e);
    }
  }

  notifyServerHiresEvent('AGENT_HIRED', buyerAddress, network, hire, updated.length);
}

export function updateSessionHire(
  buyerAddress: string,
  network: BscNetwork,
  hireId: string,
  updates: Partial<HireData>
): void {
  if (!buyerAddress) return;
  const key = `${buyerAddress.toLowerCase()}_${network}`;
  const existing = getSessionHires(buyerAddress, network);
  const updated = existing.map((h) => (h.id === hireId ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h));
  sessionHiresCache.set(key, updated);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(getStorageKey(buyerAddress, network), JSON.stringify(updated));
    } catch (e) {
      console.warn('[Hires Storage] Update error:', e);
    }
  }

  notifyServerHiresEvent('HIRE_STATUS_UPDATED', buyerAddress, network, { id: hireId, ...updates } as any, updated.length);
}

/**
 * Fetch on-chain hire history directly from BSC blockchain (BscScan API + Viem Multicall)
 * Zero DB Egress, Zero Database Queries.
 */
export async function fetchOnchainHires(buyerAddress: string, network: BscNetwork): Promise<HireData[]> {
  if (!buyerAddress) return [];

  const chainId = network === 'bscMainnet' ? 56 : 97;
  const addresses = ERC8183_ADDRESSES[chainId];

  // Immediately restore from local storage / session cache
  const sessionHires = getSessionHires(buyerAddress, network);

  console.log(`[Onchain Hires] Scanning hires for wallet ${buyerAddress} on BSC ${network === 'bscTestnet' ? 'Testnet' : 'Mainnet'} (locally loaded: ${sessionHires.length})...`);
  notifyServerHiresEvent('SCAN_WALLET_HIRES', buyerAddress, network, undefined, sessionHires.length);

  try {
    const client = network === 'bscMainnet' ? bscMainnetClient : bscTestnetClient;
    const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

    // Query on-chain token transfers to Commerce Escrow contract
    let logs: any[] = [];
    try {
      const latestBlock = await client.getBlockNumber();
      // Scan up to 50,000 blocks (~41 hours of BSC blocks)
      const searchBlocks = 50000n;
      const fromBlock = latestBlock > searchBlocks ? latestBlock - searchBlocks : 0n;

      logs = await client.getLogs({
        address: addresses.paymentToken,
        event: transferEvent,
        args: {
          from: buyerAddress as `0x${string}`,
          to: addresses.commerce as `0x${string}`,
        },
        fromBlock,
        toBlock: latestBlock,
      });
    } catch (rpcErr) {
      console.warn('[Onchain Hires] 50k block scan error, retrying with 10k window:', rpcErr);
      try {
        const latestBlock = await client.getBlockNumber();
        const searchBlocks = 10000n;
        const fromBlock = latestBlock > searchBlocks ? latestBlock - searchBlocks : 0n;
        logs = await client.getLogs({
          address: addresses.paymentToken,
          event: transferEvent,
          args: {
            from: buyerAddress as `0x${string}`,
            to: addresses.commerce as `0x${string}`,
          },
          fromBlock,
          toBlock: latestBlock,
        });
      } catch (retryErr) {
        console.warn('[Onchain Hires] Viem getLogs scan failed:', retryErr);
      }
    }

    // Map on-chain transactions to HireData format
    const onchainHires: HireData[] = logs.map((log: any, idx: number) => {
      const txHash = log.transactionHash;
      const rawValue = log.args?.value ?? 0n;
      const amountFormatted = rawValue > 0n ? Number(formatUnits(rawValue, 18)).toFixed(2) : '1.00';
      const timeMs = log.blockTimestamp ? Number(log.blockTimestamp) * 1000 : Date.now();

      // Check if session cache or local storage has richer metadata for this txHash
      const matched = sessionHires.find((sh) => sh.id === txHash || sh.txs?.includes(txHash));
      if (matched) {
        return {
          ...matched,
          budgetU: matched.budgetU || amountFormatted,
          paymentAmount: matched.paymentAmount || amountFormatted,
          state: matched.state || 'funded',
          txs: matched.txs?.length ? matched.txs : [txHash],
        };
      }

      return {
        id: txHash,
        buyer: buyerAddress,
        buyerAddress,
        chainId,
        agentId: 'aegis-rebalancing-01',
        catalog: 'rebalancing' as CareerCategory,
        rail: 'erc8183',
        jobId: `job_${txHash.slice(0, 10)}`,
        txs: [txHash],
        state: 'funded',
        budgetU: amountFormatted,
        paymentToken: 'U',
        paymentAmount: amountFormatted,
        artifactUri: null,
        lastAction: `Escrow deposit verified on BSC ${network === 'bscTestnet' ? 'Testnet' : 'Mainnet'}`,
        createdAt: new Date(timeMs).toISOString(),
        updatedAt: new Date(timeMs).toISOString(),
      };
    });

    // Merge session hires with verified on-chain hires (session hires take precedence for optimistic updates)
    const allHiresMap = new Map<string, HireData>();
    for (const h of onchainHires) {
      allHiresMap.set(h.id, h);
      if (h.txs?.[0]) allHiresMap.set(h.txs[0], h);
    }
    for (const sh of sessionHires) {
      allHiresMap.set(sh.id, sh);
      if (sh.txs?.[0]) allHiresMap.set(sh.txs[0], sh);
    }

    const merged = Array.from(new Set(allHiresMap.values())).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Save back to local storage and session cache
    const key = `${buyerAddress.toLowerCase()}_${network}`;
    sessionHiresCache.set(key, merged);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(getStorageKey(buyerAddress, network), JSON.stringify(merged));
      } catch (e) {
        console.warn('[Hires Storage] Save error:', e);
      }
    }

    console.log(`[Onchain Hires] Total active/hired agents resolved: ${merged.length}`);
    if (onchainHires.length > 0) {
      notifyServerHiresEvent(
        'ONCHAIN_HIRES_DISCOVERED',
        buyerAddress,
        network,
        {
          id: onchainHires[0]?.id,
          txs: onchainHires.map((h) => h.txs?.[0] || h.id),
        },
        merged.length
      );
    }

    return merged;
  } catch (err) {
    console.warn('[OnchainHires] Blockchain scan failed, falling back to persisted hires:', err);
    return sessionHires;
  }
}

/**
 * Settle payment on-chain via Router contract (User signs Web3 transaction directly)
 */
export async function executeOnchainSettle(
  provider: Eip1193Provider,
  buyerAddress: string,
  jobId: string,
  network: BscNetwork
): Promise<string> {
  const chainId = network === 'bscMainnet' ? 56 : 97;
  const routerAddress = ERC8183_ADDRESSES[chainId].router;

  // Extract numeric job id if formatted as job_123 or hex
  const numericJobId = BigInt(jobId.replace(/\D/g, '') || '1');

  const callData = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: 'settle',
    args: [numericJobId, '0x'],
  });

  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: buyerAddress,
        to: routerAddress,
        data: callData,
      },
    ],
  });

  return txHash;
}

/**
 * Claim escrow refund on-chain via Commerce contract (User signs Web3 transaction directly)
 */
export async function executeOnchainRefund(
  provider: Eip1193Provider,
  buyerAddress: string,
  jobId: string,
  network: BscNetwork
): Promise<string> {
  const chainId = network === 'bscMainnet' ? 56 : 97;
  const commerceAddress = ERC8183_ADDRESSES[chainId].commerce;

  const numericJobId = BigInt(jobId.replace(/\D/g, '') || '1');

  const callData = encodeFunctionData({
    abi: COMMERCE_ABI,
    functionName: 'claimRefund',
    args: [numericJobId],
  });

  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: buyerAddress,
        to: commerceAddress,
        data: callData,
      },
    ],
  });

  return txHash;
}

/**
 * Dispute deliverable on-chain via Policy contract within optimistic dispute window
 */
export async function executeOnchainDispute(
  provider: Eip1193Provider,
  buyerAddress: string,
  jobId: string,
  network: BscNetwork
): Promise<string> {
  const chainId = network === 'bscMainnet' ? 56 : 97;
  const policyAddress = ERC8183_ADDRESSES[chainId].policy;

  const numericJobId = BigInt(jobId.replace(/\D/g, '') || '1');

  const callData = encodeFunctionData({
    abi: POLICY_ABI,
    functionName: 'dispute',
    args: [numericJobId],
  });

  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: buyerAddress,
        to: policyAddress,
        data: callData,
      },
    ],
  });

  return txHash;
}

/**
 * Check on-chain job status using Viem Client Multicall
 */
export async function fetchJobOnchainStatus(jobId: string, network: BscNetwork): Promise<any | null> {
  const chainId = network === 'bscMainnet' ? 56 : 97;
  const client = network === 'bscMainnet' ? bscMainnetClient : bscTestnetClient;
  const commerceAddress = ERC8183_ADDRESSES[chainId].commerce;
  const numericJobId = BigInt(jobId.replace(/\D/g, '') || '1');

  try {
    const jobData = await (client as any).readContract({
      address: commerceAddress,
      abi: COMMERCE_ABI,
      functionName: 'getJob',
      args: [numericJobId],
    });
    return jobData;
  } catch (err) {
    // If job does not exist on-chain yet, return null
    return null;
  }
}
