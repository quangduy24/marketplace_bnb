import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';

const client = createPublicClient({
  chain: bscTestnet,
  transport: http('https://data-seed-prebsc-1-s1.binance.org:8545')
});

async function check() {
  try {
    const code = await client.getBytecode({ address: '0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE' });
    if (!code) {
      console.log('No code');
      return;
    }
    // simple check if the function selector for multicall(bytes[]) is in the bytecode
    // multicall(bytes[]) -> 0xac9650d8
    if (code.includes('ac9650d8')) {
      console.log('HAS_MULTICALL');
    } else {
      console.log('NO_MULTICALL');
    }
  } catch (e) {
    console.error(e);
  }
}
check();
