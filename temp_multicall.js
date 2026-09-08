
const { createPublicClient, http } = require('viem');
const { bscTestnet } = require('viem/chains');
const client = createPublicClient({ chain: bscTestnet, transport: http('https://bsc-testnet.publicnode.com') });
console.log(typeof client.multicall);

