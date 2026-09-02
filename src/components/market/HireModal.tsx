import React, { useState } from 'react';
import { AgentData, CareerCategory } from '../../types.ts';
import { getPixelSprite } from '../game/pixelAssets.ts';
import {
  AlertCircle,
  Sparkles,
  Zap,
  Info,
  Check,
} from 'lucide-react';

interface HireModalProps {
  agent: AgentData;
  buyerAddress?: string;
  onClose: () => void;
  onConfirmHire: (hirePayload: {
    agentId: string;
    catalog: CareerCategory | string;
    rail: 'x402' | 'erc8183';
    budgetU: string;
    taskSummary: string;
    txHash: string;
  }) => Promise<void>;
  network: 'bscTestnet' | 'bscMainnet';
}

export const HireModal: React.FC<HireModalProps> = ({
  agent,
  buyerAddress,
  onClose,
  onConfirmHire,
  network,
}) => {
  const career = (agent.labels?.[0] || 'monitoring') as CareerCategory;
  const spriteSrc = getPixelSprite(career);
  const hourlyRate = Number(agent.rawJson?.hourlyCostU || 0.25);

  // Friendly human task descriptions in English
  const defaultFriendlySummary =
    career === 'health_factor'
      ? 'Continuously monitor Venus loan health factor and defend collateral against liquidations'
      : career === 'yield'
      ? 'Auto-route idle stablecoins into top-yielding BSC vaults and auto-compound rewards'
      : career === 'grid'
      ? 'Dynamically balance PancakeSwap V3 LP ranges to capture maximum swap fee yield'
      : '24/7 mempool & whale monitor with instant anomaly alerts';

  // Preset hiring packages for beginners
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'standard' | 'weekly' | 'custom'>('standard');
  const [taskSummary, setTaskSummary] = useState(defaultFriendlySummary);
  const [budgetU, setBudgetU] = useState((hourlyRate * 24).toFixed(2));
  const [deadlineHours, setDeadlineHours] = useState('24');
  const [rail, setRail] = useState<'erc8183' | 'x402'>('erc8183');
  const [isSigning, setIsSigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle plan select
  const handleSelectPlan = (plan: 'trial' | 'standard' | 'weekly') => {
    setSelectedPlan(plan);
    if (plan === 'trial') {
      setDeadlineHours('2');
      setBudgetU((hourlyRate * 2).toFixed(2));
    } else if (plan === 'standard') {
      setDeadlineHours('24');
      setBudgetU((hourlyRate * 24).toFixed(2));
    } else if (plan === 'weekly') {
      setDeadlineHours('168');
      setBudgetU((hourlyRate * 168 * 0.85).toFixed(2)); // 15% discount
    }
  };

  const handleSignAndConfirm = async (isDemo = false) => {
    if (!buyerAddress && !isDemo) {
      setErrorMsg('Please connect your Web3 wallet before signing the agreement!');
      return;
    }

    setIsSigning(true);
    setErrorMsg(null);

    try {
      const randomHex = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const mockTxHash = `0x${randomHex}`;

      await onConfirmHire({
        agentId: agent.agentId,
        catalog: career,
        rail,
        budgetU: isDemo ? '0.00' : budgetU,
        taskSummary: isDemo ? `[DEMO TRIAL] ${taskSummary}` : taskSummary,
        txHash: mockTxHash,
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
      <div className="neo-card bg-[#FFFFFF] w-full max-w-xl p-4 sm:p-5 neo-shadow-xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#121212] pb-3 mb-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center shrink-0">
              <img
                src={spriteSrc}
                alt={agent.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getPixelSprite(career, 'idle');
                }}
                className="w-9 h-9 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="neo-badge bg-[#00F59B] text-[#121212] text-[9px] px-1.5 py-0.2 font-mono-tech font-black">
                  SAFE AGENT HIRE
                </span>
                <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-1.5 py-0.2 font-mono-tech font-bold">
                  ESCROW PROTECTED
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

        {/* Beginner Explainer Callout */}
        <div className="bg-[#FAF7F0] border-2 border-[#121212] p-3 mb-3.5 neo-shadow-sm">
          <div className="flex items-center space-x-1.5 mb-1 font-display font-black text-xs text-[#121212]">
            <Sparkles className="w-3.5 h-3.5 text-[#00F59B] fill-[#121212]" />
            <span>NEWCOMER PEACE OF MIND: 100% SMART CONTRACT ESCROW PROTECTION</span>
          </div>
          <p className="font-sans text-xs text-[#4A4A4A] leading-relaxed">
            Your funds are held securely inside an <strong>ERC-8183 escrow contract</strong> on BNB Chain. The agent is only compensated after verified cryptographic proof of work is submitted. You can cancel and withdraw any unused balance at any time!
          </p>
        </div>

        {/* 3 Ready-to-Use Packages for Newcomers */}
        <div className="mb-3.5">
          <label className="block text-[10px] font-mono-tech font-black uppercase tracking-wider text-[#121212] mb-1.5">
            1. SELECT YOUR DURATION PACKAGE:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelectPlan('trial')}
              className={`p-2.5 border-2 text-left transition-all relative ${
                selectedPlan === 'trial'
                  ? 'bg-[#FFE500] border-[#121212] neo-shadow ring-1 ring-[#121212]'
                  : 'bg-[#FAF7F0] border-[#121212]/40 hover:border-[#121212]'
              }`}
            >
              <div className="font-display font-black text-[11px] text-[#121212]">
                TRIAL (2H)
              </div>
              <div className="font-mono-tech text-xs font-black text-[#121212] mt-0.5">
                {(hourlyRate * 2).toFixed(2)} $U
              </div>
              <div className="font-sans text-[10px] text-[#6A6A6A] mt-0.5">
                Quick safe test
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPlan('standard')}
              className={`p-2.5 border-2 text-left transition-all relative ${
                selectedPlan === 'standard'
                  ? 'bg-[#00F59B] border-[#121212] neo-shadow ring-1 ring-[#121212]'
                  : 'bg-[#FAF7F0] border-[#121212]/40 hover:border-[#121212]'
              }`}
            >
              <span className="absolute -top-2 right-1 neo-badge bg-[#121212] text-[#00F59B] text-[7px] font-mono-tech font-black px-1">
                MOST POPULAR
              </span>
              <div className="font-display font-black text-[11px] text-[#121212]">
                1 DAY (24H)
              </div>
              <div className="font-mono-tech text-xs font-black text-[#121212] mt-0.5">
                {(hourlyRate * 24).toFixed(2)} $U
              </div>
              <div className="font-sans text-[10px] text-[#6A6A6A] mt-0.5">
                Full 24-hr shield
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPlan('weekly')}
              className={`p-2.5 border-2 text-left transition-all relative ${
                selectedPlan === 'weekly'
                  ? 'bg-[#38BDF8] border-[#121212] neo-shadow ring-1 ring-[#121212]'
                  : 'bg-[#FAF7F0] border-[#121212]/40 hover:border-[#121212]'
              }`}
            >
              <span className="absolute -top-2 right-1 neo-badge bg-[#FF4365] text-white text-[7px] font-mono-tech font-black px-1">
                SAVE 15%
              </span>
              <div className="font-display font-black text-[11px] text-[#121212]">
                7 DAYS (168H)
              </div>
              <div className="font-mono-tech text-xs font-black text-[#121212] mt-0.5">
                {(hourlyRate * 168 * 0.85).toFixed(2)} $U
              </div>
              <div className="font-sans text-[10px] text-[#6A6A6A] mt-0.5">
                Maximum savings
              </div>
            </button>
          </div>
        </div>

        {/* Task Summary in Natural Language */}
        <div className="mb-3">
          <label className="block text-[10px] font-mono-tech font-black uppercase tracking-wider text-[#121212] mb-1">
            2. AGENT MISSION (PRE-CONFIGURED AUTO-DIRECTIVE):
          </label>
          <input
            type="text"
            value={taskSummary}
            onChange={(e) => setTaskSummary(e.target.value)}
            className="w-full bg-[#FAF7F0] border-2 border-[#121212] p-2 text-xs font-sans text-[#121212] focus:outline-none focus:bg-white font-medium"
          />
        </div>

        {/* Advanced Options Toggle */}
        <div className="mb-3 border-t border-[#121212]/20 pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[10px] font-mono-tech font-bold text-[#6A6A6A] hover:text-[#121212] flex items-center space-x-1"
          >
            <Info className="w-3 h-3" />
            <span>{showAdvanced ? '[-] Hide advanced technical parameters' : '[+] Custom budget & settlement rail configuration (Pro)'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-2 p-2.5 bg-[#FAF7F0] border border-[#121212] space-y-2 font-mono-tech text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-[#6A6A6A] block font-bold">CUSTOM BUDGET ($U):</span>
                  <input
                    type="number"
                    step="0.5"
                    value={budgetU}
                    onChange={(e) => {
                      setBudgetU(e.target.value);
                      setSelectedPlan('custom');
                    }}
                    className="w-full bg-white border border-[#121212] px-2 py-1 font-bold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-[#6A6A6A] block font-bold">RUNTIME DURATION (HOURS):</span>
                  <input
                    type="number"
                    value={deadlineHours}
                    onChange={(e) => {
                      setDeadlineHours(e.target.value);
                      setSelectedPlan('custom');
                    }}
                    className="w-full bg-white border border-[#121212] px-2 py-1 font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <span className="text-[9px] text-[#6A6A6A] block font-bold mb-1">SETTLEMENT ESCROW RAIL:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRail('erc8183')}
                    className={`px-2 py-1 text-[10px] border text-left font-bold ${
                      rail === 'erc8183' ? 'bg-[#FFE500] border-[#121212]' : 'bg-white border-[#999]'
                    }`}
                  >
                    ERC-8183 (Recommended Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRail('x402')}
                    className={`px-2 py-1 text-[10px] border text-left font-bold ${
                      rail === 'x402' ? 'bg-[#FFE500] border-[#121212]' : 'bg-white border-[#999]'
                    }`}
                  >
                    HTTP x402 (Micro-settlement)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4 Golden Guarantees */}
        <div className="bg-[#FAF7F0] border-2 border-[#121212] p-2.5 mb-3.5 space-y-1 text-[10px] font-mono-tech">
          <div className="flex items-center space-x-1.5 text-[#059669] font-bold">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Zero private key delegation: keys never leave your custody</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[#059669] font-bold">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>100% refund guarantee if agent fails verification proof</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[#059669] font-bold">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>∞ Unlimited agent squad: hire and run as many concurrent agents as you need</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[#059669] font-bold">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Transparent on-chain settlement on BNB Chain ({network === 'bscTestnet' ? 'Testnet' : 'Mainnet'})</span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t-2 border-[#121212] flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Free Demo button for total beginners */}
          <button
            type="button"
            onClick={() => handleSignAndConfirm(true)}
            className="w-full sm:w-auto neo-btn bg-[#FAF7F0] hover:bg-[#FFE500] text-[#121212] font-mono-tech text-xs font-black px-3 py-2 flex items-center justify-center space-x-1 border border-[#121212]"
            title="Experience the workflow with zero financial risk"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>TRY DEMO MODE (ZERO RISK)</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
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
              onClick={() => handleSignAndConfirm(false)}
              className="neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-xs px-4 py-2 flex items-center justify-center space-x-1.5 hover:bg-[#FFE500]"
            >
              <Zap className="w-3.5 h-3.5 fill-[#121212]" />
              <span>{isSigning ? 'SIGNING ESCROW...' : `CONFIRM HIRE (${budgetU} $U)`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
