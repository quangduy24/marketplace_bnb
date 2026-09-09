import React, { useState, useEffect, useRef } from 'react';
import { AgentData, CareerCategory } from '../../types.ts';
import { getPixelSprite } from '../game/pixelAssets.ts';
import {
  AlertCircle,
  Sparkles,
  Zap,
  Check,
  Clock,
  Coins,
} from 'lucide-react';
import {
  getInjectedProvider,
  utf8ToHex,
  getPaymentTokensForNetwork,
  fetchBnbPrice,
  fetchAllTokenBalances,
  claimTestnetUFaucet,
  MultiTokenBalances,
} from '../../lib/wallet.ts';
import { CONTRACT_ADDRESSES } from '../../../lib/chain.ts';
import { parseEther, parseUnits, encodeFunctionData, decodeEventLog, createWalletClient, custom, isAddress } from 'viem';
import { bscTestnetClient, bscMainnetClient, COMMERCE_ABI, ROUTER_ABI, bscTestnet, bscMainnet } from '../../../lib/chain.ts';
import { createClient, BNB, BNB_TESTNET, hireErc8183Agent, buildHireCalls, erc8183Addresses } from '@altananetwork/sdk';
import { NATIVE_ZERO_ADDRESS, sumQuoteRequiredWei, parseRelayRequiredWeiFromMessage } from '../../lib/relay-quote.ts';

const erc20TransferAbi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const erc20ApproveAbi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const erc20BalanceOfAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const keystoreFeeAbi = [
  {
    name: 'getRegistrationFeeInWei',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Gas reserve funded to the fresh passkey wallet is exactly the live
// KeyStore registration fee read from RPC at hire time — no added buffer.
async function fetchKeyStoreFeeWei(network: 'bscTestnet' | 'bscMainnet'): Promise<bigint> {
  const publicClient = network === 'bscTestnet' ? bscTestnetClient : bscMainnetClient;
  const controller = (network === 'bscTestnet' ? BNB_TESTNET : BNB).keyStoreController as `0x${string}`;
  const fee = await (publicClient as any).readContract({
    address: controller,
    abi: keystoreFeeAbi,
    functionName: 'getRegistrationFeeInWei',
  });
  return BigInt(fee);
}

// Dry-run the exact hire batch against the relay to learn the true native
// funding requirement BEFORE moving funds. Returns the required wei, or null
// when the quote is unavailable (caller falls back to the KeyStore fee).
// Deep imports mirror SDK submitCalls (pinned @altananetwork/sdk 0.9.0) and
// are fully guarded — any shape/import mismatch returns null.
async function dryRunHireQuoteWei(args: {
  walletAddress: string;
  signer: any;
  calls: readonly { to: string; data?: string; value?: bigint }[];
  network: 'bscTestnet' | 'bscMainnet';
}): Promise<{ required: bigint | null; error: string | null }> {
  const fail = (stage: string, detail: unknown): { required: bigint | null; error: string | null } => {
    const msg = detail instanceof Error ? detail.message : String(detail);
    console.warn(`[HireModal] Relay quote dry-run unavailable at ${stage}:`, msg);
    return { required: null, error: `${stage}: ${msg}` };
  };
  try {
    const networkConfig = args.network === 'bscTestnet' ? BNB_TESTNET : BNB;
    const publicClient = args.network === 'bscTestnet' ? bscTestnetClient : bscMainnetClient;
    let buildRelayClient: any;
    let buildFirstActionPrepend: any;
    let passkeyMod: any;
    let portoRelay: any;
    try {
      [{ buildRelayClient }, { buildFirstActionPrepend }, passkeyMod, portoRelay] = await Promise.all([
        // @ts-ignore — SDK internal seam (pinned 0.9.0), guarded at runtime
        import('../../../node_modules/@altananetwork/sdk/dist/internal/relay.js'),
        // @ts-ignore — SDK internal seam (pinned 0.9.0), guarded at runtime
        import('../../../node_modules/@altananetwork/sdk/dist/internal/keystore.js'),
        // @ts-ignore — SDK internal seam (pinned 0.9.0), guarded at runtime
        import('../../../node_modules/@altananetwork/sdk/dist/internal/passkey.js'),
        // @ts-ignore — Porto bundled with the SDK (pinned 0.2.37), guarded at runtime
        import('../../../node_modules/@altananetwork/sdk/node_modules/porto/dist/viem/RelayActions.js'),
      ]);
    } catch (importErr) {
      return fail('import-seam', importErr);
    }
    if (!buildRelayClient || !buildFirstActionPrepend || !portoRelay?.prepareCalls) {
      return fail('guard', 'relay seam shape mismatch (buildRelayClient/buildFirstActionPrepend/prepareCalls missing)');
    }
    if (!passkeyMod?.isPasskeySigner?.(args.signer) || !passkeyMod?.passkeyToPortoKey) {
      return fail('guard', 'signer is not a passkey signer or passkeyToPortoKey missing');
    }
    const prepend = await (buildFirstActionPrepend as any)({
      publicClient: publicClient as any,
      network: networkConfig as any,
      walletAddress: args.walletAddress as any,
      adminPublicKey: args.signer.publicKey,
    });
    const effectiveCalls = [...(prepend || []), ...args.calls];
    const signingKey = passkeyMod.passkeyToPortoKey(args.signer, { role: 'admin' });
    const relayClient = (buildRelayClient as any)(networkConfig);
    const prepared = await (portoRelay as any).prepareCalls(relayClient, {
      account: args.walletAddress,
      calls: effectiveCalls,
      feeToken: NATIVE_ZERO_ADDRESS,
      key: signingKey,
    } as any);
    const quoteRoot = (prepared as any)?.context?.quote ?? (prepared as any)?.capabilities?.quote;
    const required = sumQuoteRequiredWei(quoteRoot);
    console.info('[HireModal] Relay quote dry-run:', {
      quotes: Array.isArray(quoteRoot?.quotes) ? quoteRoot.quotes.length : 0,
      requiredNativeWei: required.toString(),
    });
    if (required > 0n) return { required, error: null };
    return { required: null, error: 'parse: quote carried no native requirement' };
  } catch (quoteErr) {
    const msg = quoteErr instanceof Error ? quoteErr.message : String(quoteErr);
    console.warn('[HireModal] Relay quote dry-run unavailable, falling back to KeyStore fee:', msg);
    return { required: null, error: `prepare: ${msg}` };
  }
}

function resolveProviderAddress(agent: any): string | null {
  const candidates = [
    agent?.rawJson?.agentWallet,
    (agent as any)?.agentWallet,
    agent?.owner,
    agent?.creatorAddress,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && isAddress(c)) return c;
  }
  return null;
}

// Build the full copyable error report (English only). Short banner text stays
// minimal; every technical detail lands here for bug reports.
function buildFullErrorText(shortMsg: string, details: Record<string, unknown>): string {
  const lines = [`Blockchain RPC error: ${shortMsg}`, ''];
  for (const [key, value] of Object.entries(details)) {
    if (value === undefined || value === null || value === '') continue;
    const rendered = typeof value === 'string' ? value : JSON.stringify(value);
    lines.push(`${key}: ${rendered}`);
  }
  return lines.join('\n');
}

// Force the OS to offer only this computer's built-in authenticator
// (Windows Hello / Touch ID / platform key) instead of a phone QR scan.
// ox/Porto hands the full credential-creation options to createFn, so we only
// pin authenticatorAttachment and keep Porto's residentKey/userVerification
// requirements untouched.
async function platformOnlyCreateFn(creationOptions: any): Promise<any> {
  const publicKey = creationOptions?.publicKey ?? creationOptions;
  const merged = {
    ...(creationOptions?.publicKey ? creationOptions : { publicKey: creationOptions }),
    publicKey: {
      ...publicKey,
      authenticatorSelection: {
        ...(publicKey?.authenticatorSelection ?? {}),
        authenticatorAttachment: 'platform',
      },
    },
  };
  return navigator.credentials.create(merged as any) as any;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

interface HireModalProps {
  agent: AgentData;
  forcedCategory?: CareerCategory | null;
  buyerAddress?: string;
  onClose: () => void;
  onConfirmHire: (hirePayload: {
    agentId: string;
    catalog: CareerCategory | string;
    rail: 'x402' | 'erc8183';
    budgetU: string;
    taskSummary: string;
    txHash?: string;
    paymentToken?: string;
    paymentAmount?: string;
    deadlineHours?: string;
  }) => Promise<void>;
  network: 'bscTestnet' | 'bscMainnet';
}

const BUDGET_PRESETS = ['5.00', '10.00', '25.00', '50.00'];
const DEADLINE_OPTIONS = [
  { label: '5m', hours: '0.083' },
  { label: '30m', hours: '0.5' },
  { label: '1h', hours: '1' },
  { label: '6h', hours: '6' },
  { label: '12h', hours: '12' },
  { label: '24h', hours: '24' },
  { label: '3d', hours: '72' },
  { label: '7d', hours: '168' },
];

export const HireModal: React.FC<HireModalProps> = ({
  agent,
  forcedCategory,
  buyerAddress,
  onClose,
  onConfirmHire,
  network,
}) => {
  const rawCareer = forcedCategory || (agent.labels?.[0] || 'rebalancing') as string;
  const career = (rawCareer === 'monitoring' ? 'rebalancing' : rawCareer) as CareerCategory;
  const spriteSrc = getPixelSprite(career);

  // Active payment tokens for the current network (Strict Network Isolation)
  const activeTokens = getPaymentTokensForNetwork(network);

  // Default task summaries by career category
  const defaultFriendlySummary =
    career === 'health_factor'
      ? 'Protects lending positions from liquidation by monitoring health factor'
      : career === 'yield'
      ? 'Routes liquidity to the highest available APR and auto-compounds yield'
      : career === 'grid'
      ? 'Places and manages automated grid orders'
      : 'Manages LP ranges, resets positions automatically';

  // State
  const [budgetUsd, setBudgetUsd] = useState('10.00');
  const [selectedToken, setSelectedToken] = useState<string>('U');
  const [deadlineHours, setDeadlineHours] = useState('24');
  const [taskSummary, setTaskSummary] = useState(defaultFriendlySummary);
  const [bnbPrice, setBnbPrice] = useState<number | null>(null);
  const [balances, setBalances] = useState<MultiTokenBalances>({ BNB: 0, U: 0, USDT: 0, USDC: 0 });
  const [isSigning, setIsSigning] = useState(false);
  const [signingStep, setSigningStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fullErrorText, setFullErrorText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fullTextRef = useRef<string | null>(null);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);
  const [faucetSuccessMsg, setFaucetSuccessMsg] = useState<string | null>(null);

  const handleClaimFaucet = async () => {
    if (!buyerAddress) {
      setErrorMsg('Please connect your Web3 wallet before claiming testnet tokens.');
      return;
    }
    const provider = getInjectedProvider();
    if (!provider) {
      setErrorMsg('No Web3 wallet provider detected.');
      return;
    }
    setIsClaimingFaucet(true);
    setErrorMsg(null);
    setFaucetSuccessMsg(null);
    try {
      const { txHash } = await claimTestnetUFaucet(provider, buyerAddress);
      setFaucetSuccessMsg(`Claimed 10 $U from faucet! Tx: ${txHash.slice(0, 10)}...`);
      setTimeout(async () => {
        const b = await fetchAllTokenBalances(buyerAddress, network);
        setBalances(b);
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to claim testnet tokens.');
      setFullErrorText(buildFullErrorText(err?.message || 'Failed to claim testnet tokens.', { step: 'claim-faucet' }));
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  const handleCopyError = async () => {
    const text = fullErrorText || errorMsg || '';
    if (!text) return;
    const ok = await copyTextToClipboard(text);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  // Ensure selected token exists on active network
  useEffect(() => {
    if (!activeTokens[selectedToken]) {
      setSelectedToken('U');
    }
  }, [network, activeTokens, selectedToken]);

  // Fetch live BNB price and wallet balances
  useEffect(() => {
    let mounted = true;
    fetchBnbPrice().then((price) => {
      if (mounted && price > 0) setBnbPrice(price);
    });
    if (buyerAddress) {
      fetchAllTokenBalances(buyerAddress, network).then((b) => {
        if (mounted) setBalances(b);
      });
    }
    return () => {
      mounted = false;
    };
  }, [buyerAddress, network]);

  // Compute token required amounts dynamically based on USD budget.
  // No fallback price: until the live ticker resolves, BNB equivalents show as "…".
  const numericBudget = Math.max(0.01, Number(budgetUsd) || 0);
  const bnbAmount = bnbPrice && bnbPrice > 0 ? (numericBudget / bnbPrice).toFixed(4) : '…';

  const getTokenAmount = (tokenKey: string) => {
    if (tokenKey === 'BNB') return bnbAmount;
    return numericBudget.toFixed(2);
  };

  const handleSignAndConfirm = async () => {
    if (!buyerAddress) {
      setErrorMsg('Please connect your Web3 wallet before signing the agreement!');
      return;
    }

    setIsSigning(true);
    setErrorMsg(null);
    fullTextRef.current = null;
    setFullErrorText(null);
    setCopied(false);

    const setFull = (t: string | null) => {
      fullTextRef.current = t;
      setFullErrorText(t);
    };
    try {
      let txHash: string | undefined;
      let jobId: any = null;
      const provider = getInjectedProvider();
      if (!provider) {
        throw new Error('No Web3 wallet provider detected. Please install or unlock your wallet.');
      }

      const commerceAddress =
        network === 'bscTestnet'
          ? CONTRACT_ADDRESSES.ERC8183_COMMERCE_TESTNET
          : CONTRACT_ADDRESSES.ERC8183_COMMERCE_MAINNET;

      const tokenConfig = activeTokens[selectedToken];
      if (!tokenConfig) {
        throw new Error(`Unsupported token ${selectedToken} on ${network}`);
      }

      const resolvedRail: 'x402' | 'erc8183' =
        selectedToken === 'U' ? 'erc8183' : agent.x402Supported ? 'x402' : 'erc8183';

      if (selectedToken === 'U') {
        // Real on-chain ERC-8183 $U Escrow with Altana SDK Passkey Flow
        // Gas is paid in native tBNB/BNB (SDK default). $U is escrow budget only,
        // never a relay feeToken — passing $U as feeToken makes wallet_prepareCalls
        // reject with "Invalid parameters were provided to the RPC method".
        try {
          const amountWei = parseUnits(numericBudget.toFixed(2), tokenConfig.decimals);
          const altanaClient = network === 'bscTestnet'
            ? createClient({ chains: [BNB_TESTNET] })
            : createClient({ chains: [BNB] });

          const agentWallet = resolveProviderAddress(agent);
          if (!agentWallet) {
            throw new Error(
              'Invalid agent wallet address (agent_wallet/owner/creator are all missing or malformed). Please choose another agent or re-sync the registry.'
            );
          }

          const browserWallet = createWalletClient({
            chain: network === 'bscTestnet' ? bscTestnet : bscMainnet,
            transport: custom((window as any).ethereum)
          });
          const [funder] = await browserWallet.requestAddresses();
          if (!funder || !isAddress(funder)) throw new Error('Could not read the funding wallet address.');
          const publicClient = network === 'bscTestnet' ? bscTestnetClient : bscMainnetClient;
          const networkConfig = network === 'bscTestnet' ? BNB_TESTNET : BNB;
          const nativeSymbol = network === 'bscTestnet' ? 'tBNB' : 'BNB';
          const relayUrl = networkConfig.relayUrl || 'https://testnet-relay.altana.network';
          const deadlineSeconds = Math.max(60, Math.floor(Number(deadlineHours) * 3600) || 1800);

          const failWithFull = (shortMsg: string, details: Record<string, unknown>): never => {
            const full = buildFullErrorText(shortMsg, details);
            setFull(full);
            console.error('[HireModal] hire blocked/failed:', full);
            throw new Error(shortMsg);
          };

          // Step 1/5: live balances + live KeyStore fee + live job reads.
          // Every number below comes from an RPC response at hire time.
          setSigningStep('Step 1/5: Checking balances');
          let keystoreFeeWei = 0n;
          try {
            keystoreFeeWei = await fetchKeyStoreFeeWei(network);
          } catch (feeErr) {
            console.warn('[HireModal] KeyStore fee read failed, continuing without reserve gate:', feeErr);
          }
          const chainId = network === 'bscTestnet' ? 97 : 56;
          const addresses = erc8183Addresses(chainId);
          const [funderNativeWei, funderUWei] = await Promise.all([
            (publicClient as any).getBalance({ address: funder as `0x${string}` }).catch(() => 0n),
            (publicClient as any).readContract({
              address: tokenConfig.address as `0x${string}`,
              abi: erc20BalanceOfAbi,
              functionName: 'balanceOf',
              args: [funder as `0x${string}`],
            }).catch(() => 0n),
          ]);
          if (BigInt(funderUWei) < amountWei) {
            failWithFull('Insufficient $U for escrow', {
              source: 'blockchain RPC',
              network: `${network} (${chainId})`,
              requiredUWei: amountWei.toString(),
              funderUWei: BigInt(funderUWei).toString(),
              funder,
              budgetU: numericBudget.toFixed(2),
            });
          }
          if (keystoreFeeWei > 0n && BigInt(funderNativeWei) < keystoreFeeWei) {
            failWithFull(`Insufficient ${nativeSymbol} for gas`, {
              source: 'blockchain RPC',
              network: `${network} (${chainId})`,
              requiredNativeWei: keystoreFeeWei.toString(),
              funderNativeWei: BigInt(funderNativeWei).toString(),
              funder,
              faucet: 'https://testnet.bnbchain.org/faucet-smart',
            });
          }

          // Step 2/5: create a fresh passkey wallet for this hire (no reuse).
          // Platform-only: this computer's Windows Hello / Touch ID, no phone scan.
          // The credential is saved to the local vault so stranded funds stay recoverable.
          setSigningStep('Step 2/5: Create Passkey Agent');
          let wallet: any;
          try {
            wallet = await altanaClient.createPasskeyWallet({
              name: "Marketplace BNB Agent",
              webAuthn: { createFn: platformOnlyCreateFn as any },
            });
          } catch (pkErr: any) {
            const pkMsg = pkErr?.message || String(pkErr);
            if (/notsupported|not supported|authenticator/i.test(pkMsg)) {
              failWithFull('Computer passkey unavailable', {
                source: 'webauthn',
                message: pkMsg,
                guidance:
                  'This computer has no usable platform passkey. Enable Windows Hello/PIN (Windows: Settings > Accounts > Sign-in options) or Touch ID (macOS), then try again.',
              });
            }
            throw pkErr;
          }
          try {
            const { savePasskeyRecord } = await import('../../lib/passkey-vault.ts');
            savePasskeyRecord({
              address: wallet.address,
              credential: (wallet.signer as any)?.credential,
              network,
              agentId: agent.agentId,
              createdAt: new Date().toISOString(),
            });
          } catch (vaultErr) {
            console.warn('[HireModal] Passkey vault save failed (non-blocking):', vaultErr);
          }

          // Step 3/5: dry-run the exact hire batch against the relay to learn
          // the true native funding requirement (quote assetDeficits) BEFORE
          // moving any funds. Falls back to the KeyStore fee when unavailable.
          setSigningStep('Step 3/5: Quoting relay fee');
          let requiredReserveWei = keystoreFeeWei > 0n ? keystoreFeeWei : 0n;
          let quoteSource = 'keystore-fee';
          let quoteError: string | null = null;
          try {
            const [jobCounter, disputeWindow] = await Promise.all([
              (publicClient as any).readContract({
                address: addresses.commerce,
                abi: [{ name: 'jobCounter', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }],
                functionName: 'jobCounter',
              }),
              (publicClient as any).readContract({
                address: addresses.policy,
                abi: [{ name: 'disputeWindow', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] }],
                functionName: 'disputeWindow',
              }),
            ]);
            const predictedJobId = BigInt(jobCounter) + 1n;
            const expiredAt = BigInt(Math.floor(Date.now() / 1000)) + BigInt(disputeWindow) + BigInt(deadlineSeconds);
            const dryCalls = buildHireCalls({
              addresses,
              jobId: predictedJobId,
              provider: agentWallet as `0x${string}`,
              description: taskSummary,
              budget: amountWei,
              expiredAt,
            });
            const quoted = await dryRunHireQuoteWei({
              walletAddress: wallet.address,
              signer: wallet.signer,
              calls: dryCalls as any,
              network,
            });
            if (quoted.required && quoted.required > 0n) {
              requiredReserveWei = quoted.required;
              quoteSource = 'relay-quote';
            } else {
              quoteError = quoted.error;
            }
          } catch (quoteErr) {
            quoteError = quoteErr instanceof Error ? quoteErr.message : String(quoteErr);
            console.warn('[HireModal] Quote dry-run failed, using KeyStore fee:', quoteError);
          }
          if (requiredReserveWei > 0n && BigInt(funderNativeWei) < requiredReserveWei) {
            failWithFull(`Insufficient ${nativeSymbol} for gas`, {
              source: 'blockchain RPC',
              relay: relayUrl,
              quote: quoteSource,
              quoteError,
              network: `${network} (${chainId})`,
              requiredNativeWei: requiredReserveWei.toString(),
              funderNativeWei: BigInt(funderNativeWei).toString(),
              funder,
              passkeyWallet: wallet.address,
              faucet: 'https://testnet.bnbchain.org/faucet-smart',
            });
          }

          // Step 4/5: fund the fresh wallet with the quoted amounts.
          setSigningStep('Step 4/5: Fund Agent ($U + gas)');
          const transferCallData = encodeFunctionData({
            abi: erc20TransferAbi,
            functionName: 'transfer',
            args: [wallet.address as `0x${string}`, amountWei],
          });
          const txU = await browserWallet.sendTransaction({
            account: funder,
            to: tokenConfig.address,
            data: transferCallData,
          } as any);
          await publicClient.waitForTransactionReceipt({ hash: txU as `0x${string}` });

          let txGas: string | undefined;
          if (requiredReserveWei > 0n) {
            txGas = await browserWallet.sendTransaction({
              account: funder,
              to: wallet.address as `0x${string}`,
              value: requiredReserveWei,
            } as any);
            await publicClient.waitForTransactionReceipt({ hash: txGas as `0x${string}` });
          }

          // Confirm the funding actually landed before asking the relay to send.
          const [walletNativeWei, walletUWei] = await Promise.all([
            (publicClient as any).getBalance({ address: wallet.address as `0x${string}` }).catch(() => 0n),
            (publicClient as any).readContract({
              address: tokenConfig.address as `0x${string}`,
              abi: erc20BalanceOfAbi,
              functionName: 'balanceOf',
              args: [wallet.address as `0x${string}`],
            }).catch(() => 0n),
          ]);
          if (BigInt(walletUWei) < amountWei || (requiredReserveWei > 0n && BigInt(walletNativeWei) < requiredReserveWei)) {
            failWithFull(`Insufficient ${nativeSymbol} for gas`, {
              source: 'blockchain RPC',
              relay: relayUrl,
              stage: 'post-fund verification',
              requiredNativeWei: requiredReserveWei.toString(),
              walletNativeWei: BigInt(walletNativeWei).toString(),
              walletUWei: BigInt(walletUWei).toString(),
              passkeyWallet: wallet.address,
              fundTxU: String(txU),
              fundTxGas: txGas ? String(txGas) : 'none',
            });
          }

          // Step 5/5: hire — native gas default, no custom $U paymaster.
          setSigningStep('Step 5/5: Hire Escrow Agent');
          const hireArgs = {
            provider: agentWallet as `0x${string}`,
            task: taskSummary,
            budget: amountWei,
            deadlineSeconds,
          };
          const attemptHire = () => hireErc8183Agent(wallet, wallet.signer, hireArgs, { network: networkConfig });
          let hireResult: any = null;
          let sendFailure: { message: string; status?: string; statusCode?: number; callsId?: string } | null = null;
          try {
            hireResult = await attemptHire();
            if (hireResult?.status && hireResult.status !== 'CONFIRMED') {
              sendFailure = {
                message: `Relay returned status ${hireResult.status}`,
                status: hireResult.status,
                statusCode: hireResult.statusCode,
                callsId: hireResult.callsId,
              };
            }
          } catch (sendErr: any) {
            sendFailure = {
              message: sendErr?.message || String(sendErr),
              statusCode: sendErr?.statusCode,
              callsId: sendErr?.callsId,
            };
            if (sendErr?.code === 4001 || sendFailure.message.toLowerCase().includes('reject')) {
              throw new Error('Transaction was rejected in your wallet.');
            }
          }

          // One-time shortfall retry: the relay error body carries the exact
          // required total as RPC data. Fund the difference and retry once.
          if (sendFailure && /asset deficit|invalid parameters/i.test(sendFailure.message)) {
            const relayRequired = parseRelayRequiredWeiFromMessage(sendFailure.message);
            if (relayRequired > 0n) {
              const liveWalletNative = await (publicClient as any)
                .getBalance({ address: wallet.address as `0x${string}` })
                .catch(() => 0n)
                .then((v: unknown) => BigInt(v as any));
              const shortfall = relayRequired - liveWalletNative;
              if (shortfall > 0n) {
                const liveFunderNative = await (publicClient as any)
                  .getBalance({ address: funder as `0x${string}` })
                  .catch(() => 0n)
                  .then((v: unknown) => BigInt(v as any));
                if (liveFunderNative < shortfall) {
                  failWithFull(`Insufficient ${nativeSymbol} for gas`, {
                    source: 'blockchain RPC',
                    relay: relayUrl,
                    stage: 'shortfall retry',
                    requiredNativeWei: relayRequired.toString(),
                    walletNativeWei: liveWalletNative.toString(),
                    shortfallWei: shortfall.toString(),
                    funderNativeWei: liveFunderNative.toString(),
                    funder,
                    passkeyWallet: wallet.address,
                    faucet: 'https://testnet.bnbchain.org/faucet-smart',
                  });
                }
                setSigningStep('Step 5/5: Funding shortfall & retrying');
                const txTop = await browserWallet.sendTransaction({
                  account: funder,
                  to: wallet.address as `0x${string}`,
                  value: shortfall,
                } as any);
                await publicClient.waitForTransactionReceipt({ hash: txTop as `0x${string}` });
                txGas = txGas ? `${txGas},${txTop}` : (txTop as string);
                requiredReserveWei = relayRequired;
                quoteSource = 'relay-retry';
                try {
                  hireResult = await attemptHire();
                  if (hireResult?.status && hireResult.status !== 'CONFIRMED') {
                    sendFailure = {
                      message: `Relay returned status ${hireResult.status} on retry`,
                      status: hireResult.status,
                      statusCode: hireResult.statusCode,
                      callsId: hireResult.callsId,
                    };
                  } else {
                    sendFailure = null;
                  }
                } catch (retryErr: any) {
                  sendFailure = {
                    message: retryErr?.message || String(retryErr),
                    statusCode: retryErr?.statusCode,
                    callsId: retryErr?.callsId,
                  };
                }
              }
            }
          }

          if (sendFailure) {
            const full = buildFullErrorText('Hire failed at blockchain RPC (step 5/5)', {
              source: 'blockchain RPC',
              relay: relayUrl,
              network: `${network} (${chainId})`,
              quote: quoteSource,
              quoteError,
              requiredNativeWei: requiredReserveWei.toString(),
              passkeyWallet: wallet.address,
              funder,
              fundTxU: String(txU),
              fundTxGas: txGas ? String(txGas) : 'none',
              relayMessage: sendFailure.message,
              callsId: sendFailure.callsId,
              statusCode: sendFailure.statusCode,
            });
            setFull(full);
            console.error('[HireModal] $U hire send failed:', full);
            throw new Error('Hire failed at blockchain RPC (step 5/5). Use Copy error to report.');
          }

          jobId = hireResult.jobId;
          txHash = hireResult?.transactionHash || hireResult?.receipt?.transactionHash || txU;

        } catch (signErr: any) {
          if (!fullTextRef.current) {
            const raw = signErr?.message || String(signErr);
            const looksRelay = /relay|prepare|calls|rpc|chain|inclusion/i.test(raw);
            setFull(buildFullErrorText(signErr?.message || 'Hire failed', {
              source: looksRelay ? 'blockchain RPC' : 'wallet',
              relay: looksRelay ? (network === 'bscTestnet' ? BNB_TESTNET : BNB).relayUrl : undefined,
              network,
              message: raw,
              code: signErr?.code,
              statusCode: signErr?.statusCode,
              callsId: signErr?.callsId,
            }));
          }
          console.error('[HireModal] $U hire failed:', fullTextRef.current || signErr?.message);
          if (signErr?.code === 4001 || String(signErr?.message || '').toLowerCase().includes('reject')) {
            throw new Error('Transaction was rejected in your wallet.');
          }
          throw signErr;
        }
      } else if (selectedToken === 'BNB') {
        // Native BNB/tBNB escrow funding directed to Escrow Kernel (NOT private EOA!)
        try {
          if (!bnbPrice || bnbPrice <= 0) {
            throw new Error('Live BNB price unavailable, please try again in a moment.');
          }
          const bnbVal = (numericBudget / bnbPrice).toFixed(6);
          const valueWei = parseEther(bnbVal);
          const escrowCallData = utf8ToHex(`LANS:ESCROW:${agent.agentId}:${Date.now()}`);
          txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: buyerAddress,
                to: commerceAddress,
                value: `0x${valueWei.toString(16)}`,
                data: escrowCallData,
              },
            ],
          });
        } catch (txErr: any) {
          if (txErr?.code === 4001 || String(txErr?.message || '').toLowerCase().includes('reject')) {
            throw new Error('Transaction was rejected in your wallet.');
          }
          throw txErr;
        }
      } else {
        // BEP-20 stablecoin payment (USDT or USDC on Mainnet) to Escrow Kernel
        try {
          const amountWei = parseUnits(numericBudget.toFixed(2), tokenConfig.decimals);
          const callData = encodeFunctionData({
            abi: erc20TransferAbi,
            functionName: 'transfer',
            args: [commerceAddress, amountWei],
          });

          txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: buyerAddress,
                to: tokenConfig.address,
                data: callData,
              },
            ],
          });
        } catch (txErr: any) {
          if (txErr?.code === 4001 || String(txErr?.message || '').toLowerCase().includes('reject')) {
            throw new Error('Transaction was rejected in your wallet.');
          }
          throw txErr;
        }
      }

      // Persist hire record with correct network token symbol
      const recordedPaymentToken =
        selectedToken === 'BNB' && network === 'bscTestnet' ? 'tBNB' : selectedToken;
      const recordedPaymentAmount = getTokenAmount(selectedToken);
      const agentWallet = resolveProviderAddress(agent);

      await onConfirmHire({
        agentId: agent.agentId,
        agentWallet,
        catalog: career,
        rail: resolvedRail,
        budgetU: numericBudget.toFixed(2),
        taskSummary,
        txHash,
        onchainJobId: jobId?.toString(),
        paymentToken: recordedPaymentToken,
        paymentAmount: recordedPaymentAmount,
        deadlineHours,
      });

      onClose();
    } catch (err: any) {
      console.error('[HireModal] hire failed:', fullTextRef.current || err);
      setErrorMsg(err?.message || 'Transaction failed, please try again. Use Copy error to report.');
    } finally {
      setIsSigning(false);
      setSigningStep(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 select-none overflow-y-auto">
      <div className="neo-card bg-[#FFFFFF] w-full max-w-lg p-4 sm:p-5 neo-shadow-xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#121212] pb-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center shrink-0">
              <img
                src={spriteSrc}
                alt={agent.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getPixelSprite(career, 'idle');
                }}
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="neo-badge bg-[#00F59B] text-[#121212] text-[9px] px-1.5 py-0.2 font-mono-tech font-black">
                  ESCROW HIRE
                </span>
                <span
                  className={`neo-badge text-[9px] px-1.5 py-0.2 font-mono-tech font-bold ${
                    network === 'bscTestnet'
                      ? 'bg-[#FFE500] text-[#121212]'
                      : 'bg-[#00F59B] text-[#121212]'
                  }`}
                >
                  {network === 'bscTestnet' ? 'BSC TESTNET (97)' : 'BNB MAINNET (56)'}
                </span>
              </div>
              <h2 className="font-display font-black text-sm sm:text-base text-[#121212] uppercase tracking-tight mt-0.5">
                HIRE {agent.name.toUpperCase()}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="neo-btn w-7 h-7 bg-[#121212] text-white flex items-center justify-center font-bold text-xs hover:bg-[#FF4365]"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-2.5 bg-[#FF4365] text-white border-2 border-[#121212] neo-shadow-sm max-h-48 overflow-y-auto select-text">
            <div className="flex items-start space-x-2 font-mono-tech text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-all whitespace-pre-wrap leading-snug flex-1">{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyError}
              className="mt-2 px-2 py-1 bg-white text-[#121212] font-mono-tech text-[10px] font-black border-2 border-[#121212] hover:bg-[#FFE500] cursor-pointer"
            >
              {copied ? 'COPIED ✓' : 'COPY ERROR'}
            </button>
          </div>
        )}

        {/* Escrow Guarantee Header */}
        <div className="bg-[#FAF7F0] border-2 border-[#121212] p-2.5 mb-3 neo-shadow-sm flex items-start space-x-2">
          <Sparkles className="w-4 h-4 text-[#00F59B] fill-[#121212] shrink-0 mt-0.5" />
          <p className="font-sans text-xs text-[#4A4A4A] leading-relaxed">
            Funds are locked in an <strong>ERC-8183 escrow contract</strong> on {network === 'bscTestnet' ? 'BSC Testnet' : 'BNB Chain'} and released only after cryptographic task verification.
          </p>
        </div>

        {/* 1. Task Budget (USD) & Deadline */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-mono-tech font-black uppercase tracking-wider text-[#121212] flex items-center space-x-1">
              <Coins className="w-3 h-3 text-[#121212]" />
              <span>1. ESCROW BUDGET (USD):</span>
            </label>
            <span className="text-[10px] font-mono-tech text-[#6A6A6A]">
              {bnbPrice && bnbPrice > 0 ? `1 BNB ≈ $${bnbPrice.toFixed(0)}` : '1 BNB ≈ … (live price loading)'}
            </span>
          </div>

          {/* Quick USD Presets + Custom Input */}
          <div className="grid grid-cols-5 gap-1.5">
            {BUDGET_PRESETS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setBudgetUsd(val)}
                className={`py-1.5 px-2 border-2 text-center font-mono-tech text-xs font-black transition-all ${
                  budgetUsd === val
                    ? 'bg-[#00F59B] border-[#121212] neo-shadow ring-1 ring-[#121212]'
                    : 'bg-[#FAF7F0] border-[#121212]/30 hover:border-[#121212]'
                }`}
              >
                ${val}
              </button>
            ))}
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.01"
                value={budgetUsd}
                onChange={(e) => setBudgetUsd(e.target.value)}
                placeholder="Custom"
                className="w-full h-full bg-white border-2 border-[#121212] text-center font-mono-tech text-xs font-black focus:outline-none focus:bg-[#FFE500]"
              />
            </div>
          </div>

          {/* Deadline Presets */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#121212]/15 flex-wrap gap-1.5">
            <span className="text-[9px] font-mono-tech font-bold text-[#6A6A6A] flex items-center space-x-1 shrink-0">
              <Clock className="w-3 h-3 text-[#121212]" />
              <span>
                DEADLINE{' '}
                <strong className="text-[#121212]">
                  ({DEADLINE_OPTIONS.find((o) => o.hours === deadlineHours)?.label || `${deadlineHours}h`})
                </strong>
                :
              </span>
            </span>
            <div className="flex flex-wrap gap-1 justify-end">
              {DEADLINE_OPTIONS.map((opt) => (
                <button
                  key={opt.hours}
                  type="button"
                  onClick={() => setDeadlineHours(opt.hours)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono-tech font-bold border transition-colors cursor-pointer ${
                    deadlineHours === opt.hours
                      ? 'bg-[#121212] text-[#00F59B] border-[#121212] shadow-xs'
                      : 'bg-[#FAF7F0] text-[#121212] border-[#121212]/30 hover:border-[#121212] hover:bg-[#FFE500]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Network-Specific Token Selector */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-mono-tech font-black uppercase tracking-wider text-[#121212]">
              2. SELECT PAYMENT TOKEN ({network === 'bscTestnet' ? 'TESTNET' : 'MAINNET'}):
            </label>
            <span className="text-[9px] font-mono-tech text-[#6A6A6A]">
              {network === 'bscTestnet' ? 'Testnet Rails' : 'Mainnet BEP-20'}
            </span>
          </div>

          <div
            className={`grid gap-2 ${
              network === 'bscTestnet' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
            }`}
          >
            {Object.keys(activeTokens).map((tokenKey) => {
              const token = activeTokens[tokenKey];
              const isSelected = selectedToken === tokenKey;
              const amount = getTokenAmount(tokenKey);
              const balance =
                tokenKey === 'BNB'
                  ? balances.BNB || 0
                  : tokenKey === 'U'
                  ? balances.U || 0
                  : (balances as any)[tokenKey] || 0;

              return (
                <button
                  key={tokenKey}
                  type="button"
                  onClick={() => setSelectedToken(tokenKey)}
                  className={`p-2 border-2 text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#FFE500] border-[#121212] neo-shadow ring-1 ring-[#121212]'
                      : 'bg-[#FAF7F0] border-[#121212]/30 hover:border-[#121212]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-xs text-[#121212]">
                      {token.symbol}
                    </span>
                    <span
                      className={`text-[8px] font-mono-tech font-black px-1 py-0.2 ${
                        token.isGasless
                          ? 'bg-[#00F59B] text-[#121212]'
                          : 'bg-[#121212]/10 text-[#121212]'
                      }`}
                    >
                      {token.badge}
                    </span>
                  </div>

                  <div className="mt-1.5">
                    <div className="font-mono-tech text-xs font-black text-[#121212]">
                      {amount}
                    </div>
                    <div className="text-[9px] font-mono-tech text-[#6A6A6A]">
                      {token.isGasless ? 'Bal: ∞ (Gasless)' : `Bal: ${balance.toFixed(tokenKey === 'BNB' ? 4 : 2)}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Testnet $U Faucet Banner */}
          {network === 'bscTestnet' && (
            <div className="mt-2.5 p-2 bg-[#FAF7F0] border-2 border-[#121212] flex items-center justify-between neo-shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="text-base">🚰</span>
                <div>
                  <div className="text-[10px] font-mono-tech font-black text-[#121212]">
                    BSC TESTNET $U FAUCET
                  </div>
                  <div className="text-[9px] font-mono-tech text-[#6A6A6A]">
                    Claim 10 $U once every 30 minutes to test escrow hires.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClaimFaucet}
                disabled={isClaimingFaucet}
                className="neo-btn bg-[#FFE500] hover:bg-[#FFE500]/80 text-[#121212] px-2.5 py-1 font-mono-tech font-black text-[10px] shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {isClaimingFaucet ? 'CLAIMING...' : 'CLAIM 10 $U'}
              </button>
            </div>
          )}

          {faucetSuccessMsg && (
            <div className="mt-1.5 p-1.5 bg-[#00F59B]/20 border border-[#00F59B] text-[#121212] text-[9px] font-mono-tech font-bold flex items-center space-x-1">
              <span>✓</span>
              <span>{faucetSuccessMsg}</span>
            </div>
          )}

          {/* Testnet Helper Notice for MetaMask Blockaid Alert */}
          {network === 'bscTestnet' && selectedToken === 'BNB' && (
            <div className="mt-2 p-1.5 bg-[#FFFBEB] border border-[#121212]/30 text-[9px] font-mono-tech text-[#4A4A4A] leading-snug">
              💡 <strong>MetaMask Notice:</strong> If MetaMask displays <em>Review alert</em>, click <em>Review alert → Continue</em> to confirm testnet transfer, or switch to <strong>$U (Escrow)</strong> to test standard ERC-8183 escrow.
            </div>
          )}
        </div>

        {/* 3. Task Description */}
        <div className="mb-3">
          <label className="block text-[10px] font-mono-tech font-black uppercase tracking-wider text-[#121212] mb-1">
            3. TASK SUMMARY:
          </label>
          <input
            type="text"
            value={taskSummary}
            onChange={(e) => setTaskSummary(e.target.value)}
            placeholder="Describe what the agent should execute..."
            className="w-full bg-[#FAF7F0] border-2 border-[#121212] p-2 text-xs font-sans text-[#121212] focus:outline-none focus:bg-white font-medium"
          />
        </div>

        {/* Guarantees */}
        <div className="bg-[#FAF7F0] border border-[#121212]/30 p-2 mb-3 space-y-1 text-[10px] font-mono-tech">
          <div className="flex items-center space-x-1.5 text-[#059669] font-bold">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Zero private key delegation: keys never leave your custody</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[#059669] font-bold">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>100% refund guarantee if agent fails verification proof</span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t-2 border-[#121212] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="neo-btn bg-[#FAF7F0] text-[#121212] font-mono-tech text-xs font-bold px-3 py-2"
          >
            CANCEL
          </button>

          <button
            type="button"
            disabled={isSigning}
            onClick={handleSignAndConfirm}
            className="neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-xs px-4 py-2 flex items-center justify-center space-x-1.5 hover:bg-[#FFE500] disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 fill-[#121212]" />
            <span>
              {isSigning
                ? (signingStep || 'CONFIRMING...')
                : selectedToken === 'U'
                ? `⚡ SIGN & HIRE (${getTokenAmount('U')} $U)`
                : `PAY & HIRE (${getTokenAmount(selectedToken)} ${activeTokens[selectedToken]?.symbol || selectedToken})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
