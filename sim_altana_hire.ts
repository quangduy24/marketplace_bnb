
import { createClient, BNB_TESTNET, createHeadlessPasskey, hireErc8183Agent } from '@altananetwork/sdk';
import { parseUnits } from 'viem';

async function check() {
  try {
    const client = createClient({ chains: [BNB_TESTNET] });
    const wallet = await client.createWallet({ signer: createHeadlessPasskey() });
    console.log('Wallet address:', wallet.address);
    // Note: this wallet has no funds, so hireErc8183Agent will revert on simulation, but we just want to see if it throws validation errors.
    
    console.log('Simulating hireErc8183Agent...');
    await hireErc8183Agent(wallet, wallet.signer, {
      provider: '0x9876543210987654321098765432109876543210',
      task: 'test task',
      budget: parseUnits('1', 18)
    }, { network: BNB_TESTNET, simulate: true });
    
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}
check();

