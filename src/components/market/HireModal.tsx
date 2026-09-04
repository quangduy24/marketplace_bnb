import React, { useState, useEffect } from 'react';
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
import { parseEther, parseUnits, encodeFunctionData } from 'viem';

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
  const [bnbPrice, setBnbPrice] = useState(600);
  const [balances, setBalances] = useState<MultiTokenBalances>({ BNB: 0, U: 0, USDT: 0, USDC: 0 });
  const [isSigning, setIsSigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    } finally {
      setIsClaimingFaucet(false);
    }
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

  // Compute token required amounts dynamically based on USD budget
  const numericBudget = Math.max(0.01, Number(budgetUsd) || 0);
  const bnbAmount = bnbPrice > 0 ? (numericBudget / bnbPrice).toFixed(4) : '0.0167';

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

    try {
      let txHash: string | undefined;
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
        // Real on-chain ERC-8183 $U Escrow Direct Transfer & Funding (Option 1)
        try {
          const amountWei = parseUnits(numericBudget.toFixed(2), tokenConfig.decimals);
          const transferCallData = encodeFunctionData({
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
                data: transferCallData,
              },
            ],
          });
        } catch (signErr: any) {
          if (signErr?.code === 4001 || String(signErr?.message || '').toLowerCase().includes('reject')) {
            throw new Error('Transaction was rejected in your wallet.');
          }
          throw signErr;
        }
      } else if (selectedToken === 'BNB') {
        // Native BNB/tBNB escrow funding directed to Escrow Kernel (NOT private EOA!)
        try {
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

      await onConfirmHire({
        agentId: agent.agentId,
        catalog: career,
        rail: resolvedRail,
        budgetU: numericBudget.toFixed(2),
        taskSummary,
        txHash,
        paymentToken: recordedPaymentToken,
        paymentAmount: recordedPaymentAmount,
        deadlineHours,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Transaction failed, please try again');
    } finally {
      setIsSigning(false);
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
          <div className="mb-3 p-2.5 bg-[#FF4365] text-white font-mono-tech text-xs flex items-center space-x-2 border-2 border-[#121212] neo-shadow-sm font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
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
              1 BNB ≈ ${bnbPrice.toFixed(0)}
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
                ? 'CONFIRMING...'
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
