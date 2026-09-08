/**
 * Generalized On-Chain Agent Activity Tracker (Stateless, Zero-Hardcoding)
 * Decodes real blockchain transactions, contract interactions, and BEP-20 events
 * directly from BSC Testnet (Chain ID 97) and BSC Mainnet (Chain ID 56).
 */
import { formatUnits, parseAbiItem } from 'viem';
import { bscMainnetClient, bscTestnetClient } from '../../lib/chain.ts';
import { OnchainActivity, HireData } from '../types.ts';

// Standard EVM Method Signatures for DeFi, Dex, Escrow, and Lending protocols on BSC
const METHOD_SIGNATURES: Record<string, string> = {
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0x38ed1739': 'swapExactTokensForTokens(...)',
  '0x7ff36ab5': 'swapExactETHForTokens(...)',
  '0x18cbafe5': 'swapExactTokensForETH(...)',
  '0x4a25e94a': 'swapTokensForExactTokens(...)',
  '0xa0712d68': 'mint(uint256) [Venus Supply]',
  '0x1249c58b': 'mint() [Venus BNB Supply]',
  '0xdb006a75': 'redeem(uint256) [Venus Withdraw]',
  '0x852a12e3': 'redeemUnderlying(uint256)',
  '0xc5ebeaec': 'borrow(uint256) [Venus Borrow]',
  '0x0e752702': 'repayBorrow(uint256)',
  '0xf5e3c462': 'liquidateBorrow(address,uint256,address)',
  '0xb6b55f25': 'deposit(uint256) [Vault Deposit]',
  '0x2e1a7d4d': 'withdraw(uint256) [Vault Withdraw]',
  '0x4641257d': 'claim() [Yield Harvest]',
  '0xd0e30db0': 'deposit() [WBNB Wrap]',
  '0x00f714ce': 'createJob(...) [ERC-8183]',
  '0x9483320f': 'submit(...) [ERC-8183 Deliverable]',
  '0x8797f1f9': 'claimRefund(...) [ERC-8183 Refund]',
  '0xac9650d8': 'multicall(bytes[])',
};

// Known protocol registry names on BSC
const KNOWN_CONTRACTS: Record<string, string> = {
  // Venus Protocol
  '0xf2721703d5429bec86bd0ed86519e0859dd88209': 'Venus Comptroller (Mainnet)',
  '0x94d1820b2d1c7c7452a163983dc888cec546b77d': 'Venus Comptroller (Testnet)',
  // PancakeSwap
  '0x10ed43c718714eb63d5aa57b78b54704e256024e': 'PancakeSwap v2 Router (Mainnet)',
  '0x13f4ea83d0bd40e75c8222255bc855a974568dd4': 'PancakeSwap v3 Router (Mainnet)',
  '0xd99d1c33f9fc3444f8101754abc46c52416550d1': 'PancakeSwap Router (Testnet)',
  // ERC-8183 Escrow Kernels
  '0xea4daa3100a767e86fded867729ae7446476eba6': 'ERC-8183 Commerce Escrow (Mainnet)',
  '0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de': 'ERC-8183 Commerce Escrow (Testnet)',
  // $U Payment Tokens
  '0xce24439f2d9c6a2289f741120fe202248b666666': '$U Payment Token (Mainnet)',
  '0xc70b8741b8b07a6d61e54fd4b20f22fa648e5565': '$U Payment Token (Testnet)',
};

export function decodeTxMethod(inputData?: string | null): string {
  if (!inputData || inputData === '0x' || inputData.length < 10) {
    return 'Native Transfer / Ping';
  }
  const selector = inputData.slice(0, 10).toLowerCase();
  return METHOD_SIGNATURES[selector] || `Method [${selector}]`;
}

export function resolveContractName(address?: string | null): string {
  if (!address) return 'Unknown Contract';
  const lower = address.toLowerCase();
  return KNOWN_CONTRACTS[lower] || `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Fetch verifiable on-chain activities for an Agent during the active hire period.
 * Queries raw blocks, transactions, and event logs directly from BSC RPC nodes.
 */
export async function fetchAgentOnchainActivities(
  hire: HireData,
  network: 'bscTestnet' | 'bscMainnet'
): Promise<OnchainActivity[]> {
  const chainId = hire.chainId || (network === 'bscTestnet' ? 97 : 56);
  const client = chainId === 97 ? bscTestnetClient : bscMainnetClient;

  const activities: OnchainActivity[] = [];
  const seenTxHashes = new Set<string>();

  // 1. Inspect registered job transactions (e.g. escrow funding, auto-run deliverables)
  if (hire.txs && hire.txs.length > 0) {
    for (const hash of hire.txs) {
      if (!hash || seenTxHashes.has(hash)) continue;
      seenTxHashes.add(hash);
      try {
        const tx = await client.getTransaction({ hash: hash as `0x${string}` });
        const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
        const block = await client.getBlock({ blockNumber: receipt.blockNumber });

        const methodName = decodeTxMethod(tx.input);
        const contractName = resolveContractName(tx.to);
        const status = receipt.status === 'success' ? 'success' : 'reverted';
        const valueFormatted = tx.value > 0n ? `${formatUnits(tx.value, 18)} BNB` : undefined;

        activities.push({
          txHash: hash,
          blockNumber: Number(receipt.blockNumber),
          timestamp: Number(block.timestamp) * 1000,
          from: tx.from,
          to: tx.to || '',
          methodName,
          contractName,
          status,
          value: valueFormatted,
          gasUsed: receipt.gasUsed.toString(),
        });
      } catch (e) {
        console.warn(`[Onchain Activity] Could not resolve tx ${hash}:`, e);
      }
    }
  }

  // 2. If an agent wallet is associated, query its on-chain transaction footprint
  const agentWallet = hire.agentWallet;
  if (agentWallet && agentWallet.startsWith('0x')) {
    try {
      const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
      const latestBlock = await client.getBlockNumber();
      // Scan window starting from hire creation
      const createdMs = hire.createdAt ? new Date(hire.createdAt).getTime() : Date.now();
      const elapsedSec = Math.max(1, Math.floor((Date.now() - createdMs) / 1000));
      const blocksElapsed = BigInt(Math.ceil(elapsedSec / 3)); // ~3s per BSC block
      const searchBlocks = blocksElapsed > 20000n ? 20000n : blocksElapsed < 100n ? 100n : blocksElapsed;
      const fromBlock = latestBlock > searchBlocks ? latestBlock - searchBlocks : 0n;

      // Query transfers involving agent wallet
      const logsFrom = await client.getLogs({
        event: transferEvent,
        args: { from: agentWallet as `0x${string}` },
        fromBlock,
        toBlock: latestBlock,
      });

      for (const log of logsFrom) {
        const txHash = log.transactionHash;
        if (!txHash || seenTxHashes.has(txHash)) continue;
        seenTxHashes.add(txHash);

        try {
          const tx = await client.getTransaction({ hash: txHash });
          const receipt = await client.getTransactionReceipt({ hash: txHash });
          const block = await client.getBlock({ blockNumber: receipt.blockNumber });

          activities.push({
            txHash,
            blockNumber: Number(receipt.blockNumber),
            timestamp: Number(block.timestamp) * 1000,
            from: tx.from,
            to: tx.to || '',
            methodName: decodeTxMethod(tx.input),
            contractName: resolveContractName(tx.to),
            status: receipt.status === 'success' ? 'success' : 'reverted',
            gasUsed: receipt.gasUsed.toString(),
          });
        } catch {}
      }
    } catch (e) {
      console.warn('[Onchain Activity] Viem agent wallet scan error:', e);
    }
  }

  // Sort activities newest first
  return activities.sort((a, b) => b.timestamp - a.timestamp);
}
