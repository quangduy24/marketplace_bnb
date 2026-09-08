
import { createPublicClient, http, encodeFunctionData } from 'viem';
import { bscTestnet } from 'viem/chains';

const COMMERCE_ABI = [
  { name: 'createJob', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'provider', type: 'address' }, { name: 'evaluator', type: 'address' }, { name: 'expiredAt', type: 'uint256' }, { name: 'description', type: 'string' }, { name: 'hook', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

async function check() {
  const buyer = '0xccd76CEff03781b17FE9278C70E402baAF48BfD2'; 
  const commerce = '0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE';
  const provider = '0x9876543210987654321098765432109876543210';
  const evaluator = '0xD7d36D66d2F1B608A0F943f722D27e3744f66F25';
  const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const desc = 'test task';
  const hook = '0x0000000000000000000000000000000000000000';

  try {
    const data = encodeFunctionData({
      abi: COMMERCE_ABI,
      functionName: 'createJob',
      args: [provider, evaluator, expiredAt, desc, hook]
    });
    const res = await fetch('https://bsc-testnet.publicnode.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'debug_traceCall',
        params: [{ from: buyer, to: commerce, data: data }, 'latest', { tracer: 'callTracer' }]
      })
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
  }
}
check();

