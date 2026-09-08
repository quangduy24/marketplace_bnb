import { createPublicClient, http, encodeFunctionData } from 'viem';
import { bscTestnet } from 'viem/chains';

const COMMERCE_ABI = [{ name: 'createJob', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'provider', type: 'address' }, { name: 'evaluator', type: 'address' }, { name: 'expiredAt', type: 'uint256' }, { name: 'description', type: 'string' }, { name: 'hook', type: 'address' }], outputs: [{ type: 'uint256' }] }] as const;

async function main() {
  const client = createPublicClient({ chain: bscTestnet, transport: http('https://data-seed-prebsc-1-s1.binance.org:8545') });
  const buyerAddress = '0xccd76CEff03781b17FE9278C70E402baAF48BfD2';
  const commerceAddress = '0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE';
  const agentWallet = '0x9876543210987654321098765432109876543210';
  const routerAddress = '0xD7d36D66d2F1B608A0F943f722D27e3744f66F25';
  const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const taskSummary = 'Places and manages automated grid orders';
  const data = encodeFunctionData({ abi: COMMERCE_ABI, functionName: 'createJob', args: [agentWallet, routerAddress, deadlineTimestamp, taskSummary, '0x0000000000000000000000000000000000000000'] });
  try {
    const gas = await client.estimateGas({ account: buyerAddress as "0x", to: commerceAddress as "0x", data });
    console.log('Gas estimate:', gas.toString());
  } catch (err: any) {
    console.error('Revert reason:', err.shortMessage || err.message);
  }
}
main().catch(console.error);
