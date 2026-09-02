/**
 * BNB Chain wallet connector — viem + injected EIP-1193 providers.
 * Supports: Binance Web3 Wallet (window.binancew3w.ethereum — Binance App DApp browser),
 * MetaMask / Trust Wallet / Binance Wallet extension (window.ethereum), EIP-6963 auto-discovery.
 * No proprietary SDK required (per Binance official docs).
 */
import { formatEther, formatUnits } from 'viem';
import { bscMainnet, bscMainnetClient, bscTestnet, bscTestnetClient } from '../../lib/chain.ts';
import { buildVerificationMessage } from '../../lib/auth-message.ts';

export type BscNetwork = 'bscMainnet' | 'bscTestnet';

export const BSC_CHAIN_IDS: Record<BscNetwork, number> = {
  bscMainnet: 56,
  bscTestnet: 97,
};

// $U payment token (BSC Mainnet)
const U_TOKEN_ADDRESS = '0xcE24439F2D9C6a2289F741120FE202248B666666';

const erc20BalanceOfAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export type Eip1193Provider = {
  request(args: { method: string; params?: any[] }): Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isBinance?: boolean;
  isBinanceWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isOkxWallet?: boolean;
};

export interface WalletOption {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  logoPath?: string;
  provider: Eip1193Provider;
}

function describeProvider(p: any): { name: string; rdns?: string; logoPath?: string } {
  if (p.isBinance || p.isBinanceWallet) {
    return { name: 'Binance Wallet', rdns: 'com.binance.wallet', logoPath: '/wallet-icons/binance.svg' };
  }
  if (p.isTrust || p.isTrustWallet) {
    return { name: 'Trust Wallet', rdns: 'com.trustwallet.app', logoPath: '/wallet-icons/trustwallet.png' };
  }
  if (p.isMetaMask) {
    return { name: 'MetaMask', rdns: 'io.metamask', logoPath: '/wallet-icons/metamask.png' };
  }
  if (p.isCoinbaseWallet) {
    return { name: 'Coinbase Wallet', rdns: 'com.coinbase.wallet', logoPath: '/wallet-icons/coinbase.svg' };
  }
  if (p.isOkxWallet) {
    return { name: 'OKX Wallet', rdns: 'com.okex.wallet', logoPath: '/wallet-icons/okx.svg' };
  }
  return { name: 'Injected Web3 Wallet' };
}

/**
 * Discover all injected EIP-1193 / EIP-6963 providers for the wallet picker.
 */
export function discoverWallets(): WalletOption[] {
  const w = window as any;
  const found: WalletOption[] = [];
  const seen = new Set<any>();

  // EIP-6963 multi-provider discovery
  if (Array.isArray(w.ethereum?.providers) && w.ethereum.providers.length > 0) {
    for (const p of w.ethereum.providers) {
      if (!p || seen.has(p)) continue;
      seen.add(p);
      const meta = describeProvider(p);
      found.push({
        id: meta.rdns || `injected-${found.length}`,
        name: meta.name,
        description: meta.rdns,
        logoPath: meta.logoPath,
        provider: p,
      });
    }
  }

  // Binance App DApp browser provider
  if (w.binancew3w?.ethereum && !seen.has(w.binancew3w.ethereum)) {
    seen.add(w.binancew3w.ethereum);
    found.push({
      id: 'com.binance.wallet.inapp',
      name: 'Binance Web3 Wallet (In-App)',
      description: 'com.binance.wallet',
      logoPath: '/wallet-icons/binance.svg',
      provider: w.binancew3w.ethereum,
    });
  }

  // Single window.ethereum
  if (w.ethereum && !seen.has(w.ethereum)) {
    seen.add(w.ethereum);
    const meta = describeProvider(w.ethereum);
    found.push({
      id: meta.rdns || 'window-ethereum',
      name: meta.name,
      description: meta.rdns,
      logoPath: meta.logoPath,
      provider: w.ethereum,
    });
  }

  return found;
}

/**
 * Live EIP-6963 announce listener (wallets may register after page load).
 * Returns a cleanup function.
 */
export function onEip6963Announce(cb: (wallet: WalletOption) => void): () => void {
  const w = window as any;
  const handler = (event: any) => {
    const detail = event?.detail;
    if (!detail?.provider || !detail?.info) return;
    cb({
      id: detail.info.rdns || detail.info.uuid || 'injected',
      name: detail.info.name || 'Web3 Wallet',
      description: detail.info.rdns,
      icon: detail.info.icon,
      provider: detail.provider,
    });
  };
  w.addEventListener?.('eip6963:announceProvider', handler);
  try {
    w.dispatchEvent?.(new Event('eip6963:requestProvider'));
  } catch {
    /* ignore */
  }
  return () => w.removeEventListener?.('eip6963:announceProvider', handler);
}

export function getInjectedProvider(): Eip1193Provider | null {
  const wallets = discoverWallets();
  const binance = wallets.find((w) => w.id.startsWith('com.binance')) || wallets[0];
  return binance ? binance.provider : null;
}

async function currentChainId(provider: Eip1193Provider): Promise<number | null> {
  try {
    const id = await provider.request({ method: 'eth_chainId' });
    return Number.parseInt(String(id), 16);
  } catch {
    return null;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function switchBscChain(provider: Eip1193Provider, network: BscNetwork): Promise<void> {
  const chain = network === 'bscMainnet' ? bscMainnet : bscTestnet;
  const chainIdHex = `0x${chain.id.toString(16)}`;

  // Already on the target chain — skip the switch (some wallets throw otherwise)
  const current = await currentChainId(provider);
  if (current === chain.id) return;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (err: any) {
    // 4902 = chain not added yet
    if (err?.code === 4902 || err?.error?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainIdHex,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls.default.http,
            blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : [],
          },
        ],
      });
    } else {
      throw err;
    }
  }
  // Let the wallet UI settle before the next popup
  await wait(400);
}

export async function connectWallet(provider: Eip1193Provider, network: BscNetwork): Promise<string> {
  await switchBscChain(provider, network);
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  if (!Array.isArray(accounts) || accounts.length === 0 || typeof accounts[0] !== 'string') {
    throw new Error('Wallet did not return an account');
  }
  return accounts[0];
}

export function watchWallet(
  provider: Eip1193Provider,
  onAccountsChanged: (accounts: string[]) => void,
  onChainChanged: (chainId: string) => void
): () => void {
  const acHandler = (accounts: unknown) => onAccountsChanged(Array.isArray(accounts) ? (accounts as string[]) : []);
  const ccHandler = (chainId: unknown) => onChainChanged(String(chainId));

  provider.on?.('accountsChanged', acHandler);
  provider.on?.('chainChanged', ccHandler);

  return () => {
    provider.removeListener?.('accountsChanged', acHandler);
    provider.removeListener?.('chainChanged', ccHandler);
  };
}

export function getClient(network: BscNetwork) {
  return network === 'bscMainnet' ? bscMainnetClient : bscTestnetClient;
}

function utf8ToHex(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return '0x' + hex;
}

/**
 * Ask the user's wallet to sign a free (0-gas) identity-verification message.
 * The user must confirm the signature in their wallet popup.
 */
export async function signVerificationMessage(
  provider: Eip1193Provider,
  address: string,
  network: BscNetwork
): Promise<{ message: string; signature: string }> {
  const chainId = BSC_CHAIN_IDS[network];
  const message = buildVerificationMessage(address, chainId);

  // Wait for the wallet UI to settle after the connect popup (avoids pending-request errors)
  await wait(600);

  const request = () =>
    provider.request({
      method: 'personal_sign',
      params: [utf8ToHex(message), address],
    });

  let signature: string;
  try {
    signature = await request();
  } catch (err: any) {
    // MetaMask -32002: another request is still pending — retry once
    if (err?.code === -32002) {
      await wait(1200);
      signature = await request();
    } else {
      throw err;
    }
  }
  return { message, signature };
}

export async function fetchNativeBalance(address: string, network: BscNetwork): Promise<number> {
  try {
    const bal = await getClient(network).getBalance({ address: address as `0x${string}` });
    return Number(formatEther(bal));
  } catch {
    return 0;
  }
}

export async function fetchUBalance(address: string): Promise<number> {
  if (!address) return 0;
  try {
    const bal = await (bscMainnetClient as any).readContract({
      address: U_TOKEN_ADDRESS,
      abi: erc20BalanceOfAbi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });
    return Number(formatUnits(bal, 18));
  } catch {
    return 0;
  }
}
