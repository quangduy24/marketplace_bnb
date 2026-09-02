import React from 'react';
import { HireData, CareerCategory } from '../../types.ts';
import {
  TrendingUp,
  ShieldCheck,
  Lock,
  ArrowRight,
  DollarSign,
  AlertTriangle,
  Zap,
  BarChart3,
} from 'lucide-react';

interface ProfitsDashboardProps {
  hires: HireData[];
  onNavigateMarket: (category?: CareerCategory) => void;
  buyerAddress?: string;
}

interface DisciplineMetric {
  id: CareerCategory;
  name: string;
  metricLabel: string;
  metricValue: string;
  valueProtectedEarned: number;
  accent: string;
  description: string;
  code: string;
}

const DISCIPLINE_METRICS: DisciplineMetric[] = [
  {
    id: 'monitoring',
    name: 'MEMPOOL OBSERVATORY',
    metricLabel: 'Gas & Sandwich Exploits Deflected',
    metricValue: 'Awaiting on-chain proof',
    valueProtectedEarned: 0,
    accent: '#38BDF8',
    description: 'Realized savings from frontrunning deflection and sandwich attack mitigation on BSC — credited only after verified proof artifacts.',
    code: 'ALPHA.01',
  },
  {
    id: 'grid',
    name: 'DYNAMIC RANGE ENGINE',
    metricLabel: 'PancakeSwap V3 Fee Yield',
    metricValue: 'Awaiting on-chain proof',
    valueProtectedEarned: 0,
    accent: '#FF7828',
    description: 'Realized swap fee earnings from rebalanced tick positions — credited only after verified proof artifacts.',
    code: 'ALPHA.02',
  },
  {
    id: 'health_factor',
    name: 'VENUS LIQUIDATION SHIELD',
    metricLabel: 'Liquidation Penalty Averted',
    metricValue: 'Awaiting on-chain proof',
    valueProtectedEarned: 0,
    accent: '#FF4365',
    description: 'Loss prevented by auto-rebalancing collateral prior to liquidation trigger — credited only after verified proof artifacts.',
    code: 'ALPHA.03',
  },
  {
    id: 'yield',
    name: 'AUTONOMOUS COMPOUNDER',
    metricLabel: 'Idle Stablecoin Compounding',
    metricValue: 'Awaiting on-chain proof',
    valueProtectedEarned: 0,
    accent: '#00F59B',
    description: 'Accrued returns from automated yield vault sweeping — credited only after verified proof artifacts.',
    code: 'ALPHA.04',
  },
];

export const ProfitsDashboard: React.FC<ProfitsDashboardProps> = ({
  hires,
  onNavigateMarket,
  buyerAddress,
}) => {
  const totalSpent = hires.reduce((sum, h) => sum + Number(h.budgetU || 0), 0);

  let totalEarnedProtected = 0;
  DISCIPLINE_METRICS.forEach((dm) => {
    const hasHire = hires.some((h) => h.catalog === dm.id);
    if (hasHire) {
      totalEarnedProtected += dm.valueProtectedEarned;
    }
  });

  const netProfit = totalEarnedProtected - totalSpent;

  return (
    <div className="w-full h-[calc(100vh-120px)] min-h-[550px] bg-[#F4F0EA] p-3 sm:p-5 flex flex-col justify-between select-none overflow-hidden editorial-grid">
      {/* Aggregate Header Panel */}
      <div className="neo-card bg-[#FFFFFF] p-4 sm:p-5 neo-shadow-sm mb-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#121212] pb-2.5 mb-3 gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 bg-[#00F59B] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4 text-[#121212]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-1.5 py-0.2">
                  TREASURY.04
                </span>
                <h2 className="font-display font-black text-xs sm:text-sm text-[#121212] uppercase tracking-tight">
                  WALLET TREASURY & NET FINANCIAL ALPHA
                </h2>
              </div>
              <span className="font-mono-tech text-[10px] text-[#6A6A6A]">
                Strictly calculated from current active wallet hires: {buyerAddress ? `${buyerAddress.slice(0, 10)}...` : 'Connected Wallet'}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Main Stat Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#FAF7F0] border-2 border-[#121212] p-3 neo-shadow-sm">
            <span className="font-mono-tech text-[9px] text-[#6A6A6A] uppercase font-bold tracking-wider">
              TOTAL AGENT EXPENSE
            </span>
            <div className="font-display font-black text-lg sm:text-xl text-[#121212] mt-0.5">
              ${totalSpent.toFixed(2)} <span className="font-mono-tech text-xs text-[#6A6A6A]">$U</span>
            </div>
            <span className="font-mono-tech text-[10px] text-[#8A8A8A] block mt-0.5">
              Escrow commitments & execution gas
            </span>
          </div>

          <div className="bg-[#FAF7F0] border-2 border-[#121212] p-3 neo-shadow-sm">
            <span className="font-mono-tech text-[9px] text-[#00F59B] uppercase font-bold tracking-wider">
              VALUE DEFENDED & HARVESTED
            </span>
            <div className="font-display font-black text-lg sm:text-xl text-[#00F59B] mt-0.5">
              +${totalEarnedProtected.toFixed(2)} <span className="font-mono-tech text-xs text-[#6A6A6A]">$U</span>
            </div>
            <span className="font-mono-tech text-[10px] text-[#8A8A8A] block mt-0.5">
              Penalties prevented & vault returns
            </span>
          </div>

          <div className="bg-[#FAF7F0] border-2 border-[#121212] p-3 neo-shadow-sm">
            <span className="font-mono-tech text-[9px] text-[#121212] uppercase font-bold tracking-wider">
              NET PORTFOLIO ALPHA
            </span>
            <div
              className={`font-display font-black text-lg sm:text-xl mt-0.5 ${
                netProfit >= 0 ? 'text-[#00F59B]' : 'text-[#FF4365]'
              }`}
            >
              {netProfit >= 0 ? `+$${netProfit.toFixed(2)}` : `-$${Math.abs(netProfit).toFixed(2)}`}{' '}
              <span className="font-mono-tech text-xs text-[#6A6A6A]">$U</span>
            </div>
            <span className="font-mono-tech text-[10px] text-[#8A8A8A] block mt-0.5">
              Net value added to user wallet
            </span>
          </div>
        </div>
      </div>

      {/* 4 Discipline Metric Cards */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1">
        {DISCIPLINE_METRICS.map((dm) => {
          const hasHire = hires.some((h) => h.catalog === dm.id);

          if (!hasHire) {
            return (
              <div
                key={dm.id}
                className="neo-card bg-[#FAF7F0] p-4 flex flex-col justify-between border-dashed relative overflow-hidden"
              >
                <div className="flex items-center justify-between border-b-2 border-[#121212]/20 pb-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-[#8A8A8A]" />
                    <h3 className="font-display font-extrabold text-xs sm:text-sm text-[#8A8A8A] uppercase">
                      {dm.name} [STANDBY]
                    </h3>
                  </div>
                  <span className="neo-badge bg-[#EAE5D8] text-[#6A6A6A] text-[8px] px-1.5 py-0.2">
                    VACANT
                  </span>
                </div>

                <div className="py-4 text-center space-y-2">
                  <div className="w-10 h-10 mx-auto bg-[#FFFFFF] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center">
                    <Lock className="w-5 h-5 text-[#121212]" />
                  </div>
                  <p className="font-mono-tech text-xs text-[#6A6A6A] max-w-xs mx-auto">
                    No active agent dispatched for{' '}
                    <strong className="text-[#121212]">{dm.id}</strong> discipline.
                  </p>
                </div>

                <div className="border-t-2 border-[#121212]/20 pt-2 flex justify-end">
                  <button
                    onClick={() => onNavigateMarket(dm.id)}
                    className="neo-btn bg-[#FFE500] text-[#121212] font-display font-black text-xs px-3 py-1.5 flex items-center space-x-1.5"
                  >
                    <span>VISIT BAZAAR STALL</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          const relevantHires = hires.filter((h) => h.catalog === dm.id);
          const spentOnThis = relevantHires.reduce((s, h) => s + Number(h.budgetU || 0), 0);

          return (
            <div
              key={dm.id}
              className="neo-card bg-[#FFFFFF] p-4 flex flex-col justify-between relative"
              style={{ borderTop: `6px solid ${dm.accent}` }}
            >
              <div className="flex items-center justify-between border-b-2 border-[#121212] pb-2 mb-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-[#00F59B]" />
                  <h3 className="font-display font-extrabold text-xs sm:text-sm text-[#121212] uppercase">
                    {dm.name}
                  </h3>
                </div>
                <span className="neo-badge bg-[#00F59B] text-[#121212] text-[8px] px-1.5 py-0.2">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-2 py-2 font-mono-tech text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#6A6A6A]">{dm.metricLabel}:</span>
                  <span className="font-bold text-[#121212]">{dm.metricValue}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#6A6A6A]">Value Protected / Yield:</span>
                  <span className="font-black text-[#00F59B]">
                    +${dm.valueProtectedEarned.toFixed(2)} $U
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#6A6A6A]">Escrow Capital Allocated:</span>
                  <span className="font-bold text-[#121212]">
                    ${spentOnThis.toFixed(2)} $U
                  </span>
                </div>

                <p className="font-sans text-xs text-[#6A6A6A] pt-1">
                  {dm.description}
                </p>
              </div>

              <div className="border-t-2 border-[#121212] pt-2 flex items-center justify-between font-mono-tech text-xs">
                <span className="text-[#2563EB] font-bold">{relevantHires.length} contract(s) active</span>
                <button
                  onClick={() => onNavigateMarket(dm.id)}
                  className="text-[#121212] font-black underline hover:text-[#FF7828]"
                >
                  HIRE ANOTHER &gt;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
