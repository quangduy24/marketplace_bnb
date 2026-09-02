import React, { useState } from 'react';
import { AgentData, CareerCategory, WalletContextState } from '../../types.ts';
import { getPixelSprite } from '../game/pixelAssets.ts';
import { CompareModal } from './CompareModal.tsx';
import { HireModal } from './HireModal.tsx';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  Scale,
  Zap,
  HelpCircle,
  Flame,
  Check,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';

interface MarketplaceViewProps {
  agents: AgentData[];
  walletContext: WalletContextState;
  buyerAddress?: string;
  onHireAgent: (payload: any) => Promise<void>;
  network: 'bscTestnet' | 'bscMainnet';
}

interface StallMetadata {
  id: CareerCategory;
  name: string;
  subtitle: string;
  purpose: string;
  accent: string;
  accentBg: string;
  issueCode: string;
  startingRate: string;
  benefit: string;
  icon: string;
}

const STALLS_CONFIG: StallMetadata[] = [
  {
    id: 'health_factor',
    name: 'HEALTH FACTOR CITADEL',
    subtitle: 'Venus Loan Protection',
    purpose: 'Autonomously monitors Venus loan collateral to prevent 8% - 15% liquidation seizure penalties.',
    accent: '#FF4365',
    accentBg: '#FFF1F2',
    issueCode: 'RISK.03',
    startingRate: '0.30 $U/hr',
    benefit: 'Saves 8% - 15% liquidation loss',
    icon: '🛡️',
  },
  {
    id: 'yield',
    name: 'YIELD GREENHOUSE',
    subtitle: 'Optimal Yield Compounder',
    purpose: 'Routes idle stablecoins into top-yielding BSC vaults and automatically compounds interest.',
    accent: '#00F59B',
    accentBg: '#ECFDF5',
    issueCode: 'APY.04',
    startingRate: '0.20 $U/hr',
    benefit: 'Compounds ~14.8% Net APY',
    icon: '💰',
  },
  {
    id: 'grid',
    name: 'GRID DRAFT WORKSHOP',
    subtitle: 'Dynamic Range Re-balancer',
    purpose: 'Dynamically re-centers PancakeSwap V3 LP ranges to eliminate dormant capital and maximize swap fee capture.',
    accent: '#FF7828',
    accentBg: '#FFF7ED',
    issueCode: 'DEX.02',
    startingRate: '0.45 $U/hr',
    benefit: '+3.2x LP Fee APR share',
    icon: '📈',
  },
  {
    id: 'monitoring',
    name: 'WATCHTOWER OBSERVATORY',
    subtitle: 'Mempool & Whale Sentinel',
    purpose: 'Scans the BSC mempool 24/7 to deliver instant alerts upon detecting sandwich attacks or whale dumps.',
    accent: '#38BDF8',
    accentBg: '#F0F9FF',
    issueCode: 'SEC.01',
    startingRate: '0.15 $U/hr',
    benefit: 'P99 alert latency < 350ms',
    icon: '👁️',
  },
];

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  agents,
  walletContext,
  buyerAddress,
  onHireAgent,
  network,
}) => {
  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<CareerCategory | 'all'>('all');
  const [activeOnly, setActiveOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<AgentData[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [agentToHire, setAgentToHire] = useState<AgentData | null>(null);
  const [inspectedAgent, setInspectedAgent] = useState<AgentData | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);

  // Filter handlers
  const handleStallClick = (cat: CareerCategory) => {
    if (selectedCategory === cat) {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(cat);
    }
  };

  const toggleCompareSelect = (agent: AgentData) => {
    if (selectedForCompare.find((a) => a.agentId === agent.agentId)) {
      setSelectedForCompare((prev) => prev.filter((a) => a.agentId !== agent.agentId));
    } else {
      if (selectedForCompare.length >= 2) {
        setSelectedForCompare([selectedForCompare[1], agent]);
      } else {
        setSelectedForCompare((prev) => [...prev, agent]);
      }
    }
  };

  // Filter agents for the right panel
  const filteredAgents = agents.filter((agent) => {
    if (activeOnly && (!agent.active || !agent.reachable || !agent.hireable)) {
      return false;
    }
    const agentCategory = (agent.labels?.[0] || 'monitoring') as CareerCategory;
    if (selectedCategory !== 'all' && agentCategory !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = agent.name?.toLowerCase().includes(q);
      const matchDesc = agent.description?.toLowerCase().includes(q);
      const matchLabel = agent.labels?.some((l) => l.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchLabel) return false;
    }
    return true;
  });

  // Emergency agent for loan shortfall
  const emergencyAgent =
    agents.find((a) => a.labels?.includes('health_factor') || a.agentId === 'vulcan') || agents[0];

  return (
    <div className="w-full h-[calc(100vh-120px)] min-h-[560px] flex flex-col bg-[#F4F0EA] select-none overflow-hidden">
      {/* Top Bar: Title & Guide Button */}
      <div className="bg-[#FFFFFF] border-b-2 border-[#121212] px-3 sm:px-4 py-2 shrink-0 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2">
          <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-2 py-0.5 font-black font-mono-tech">
            MKT.01
          </span>
          <span className="neo-badge bg-[#00F59B] text-[#121212] text-[9px] px-2 py-0.5 font-black font-mono-tech">
            ∞ UNLIMITED HIRES
          </span>
          <span className="font-display font-extrabold text-xs sm:text-sm text-[#121212] uppercase tracking-tight">
            AUTONOMOUS AGENT BAZAAR
          </span>
          <span className="hidden sm:inline font-mono-tech text-[10px] text-[#6A6A6A]">
            // Verified ERC-8004 Agents with Unlimited Concurrent Escrows
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[10px] font-mono-tech">
          <div className="hidden md:flex items-center space-x-1.5 text-[#059669] bg-[#FAF7F0] px-2 py-1 border border-[#121212]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-bold">100% SMART ESCROW PROTECTED</span>
          </div>

          <button
            onClick={() => setShowGlossary(!showGlossary)}
            className="neo-btn bg-[#FAF7F0] hover:bg-[#FFE500] text-[#121212] px-2 py-1 text-[10px] font-black flex items-center space-x-1 border border-[#121212]"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{showGlossary ? 'HIDE GUIDE' : 'QUICK GUIDE'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Newcomer Guide */}
      {showGlossary && (
        <div className="bg-[#FFFFFF] border-b-2 border-[#121212] p-3 shrink-0 transition-all z-20">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[10px] font-mono-tech flex-1">
              <div className="bg-[#FAF7F0] p-2 border border-[#121212]">
                <strong className="text-[#121212] block mb-0.5">🔒 SAFE ESCROW</strong>
                <span className="text-[#555] font-sans text-[11px]">
                  Funds stay locked in smart contract. Released only upon verified cryptographic proof.
                </span>
              </div>
              <div className="bg-[#FAF7F0] p-2 border border-[#121212]">
                <strong className="text-[#121212] block mb-0.5">🔑 ZERO PRIVATE KEYS</strong>
                <span className="text-[#555] font-sans text-[11px]">
                  Private keys never leave your custody. Agents execute only approved on-chain directives.
                </span>
              </div>
              <div className="bg-[#FAF7F0] p-2 border border-[#121212]">
                <strong className="text-[#121212] block mb-0.5">💰 PREDICTABLE $U</strong>
                <span className="text-[#555] font-sans text-[11px]">
                  Fixed hourly pricing pegged to $1 USD. Withdraw unspent deposit anytime.
                </span>
              </div>
              <div className="bg-[#FAF7F0] p-2 border border-[#121212]">
                <strong className="text-[#121212] block mb-0.5">🧪 RISK-FREE DEMO</strong>
                <span className="text-[#555] font-sans text-[11px]">
                  Click Hire on any agent to test the entire escrow workflow without real tokens.
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowGlossary(false)}
              className="text-xs font-mono-tech font-bold text-[#6A6A6A] hover:text-[#121212] ml-2 self-end sm:self-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Split: Left Stalls / Right Search & Directory */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT 52%: Clean 4 Stalls & Emergency Shield */}
        <div className="w-full lg:w-[52%] h-full border-r-[2.5px] border-[#121212] p-3 sm:p-4 overflow-y-auto bg-[#F4F0EA] flex flex-col">
          {/* Urgent Shortfall Alert */}
          {walletContext.hasEmergencyShortfall && (
            <div className="bg-[#FFF1F2] border-2 border-[#FF4365] neo-shadow-sm p-3 mb-3 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-start space-x-2.5">
                <div className="w-8 h-8 bg-[#FF4365] border-2 border-[#121212] flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="neo-badge bg-[#FF4365] text-white text-[9px] font-black px-1.5 py-0.2">
                      CRITICAL LIQUIDATION WARNING
                    </span>
                    <span className="font-mono-tech text-[10px] text-[#FF4365] font-black">
                      HEALTH FACTOR: {walletContext.healthFactor.toFixed(2)} HF (&lt; 1.15)
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[#121212] mt-0.5 font-medium leading-snug">
                    Your Venus collateral is near liquidation penalty seizure (<strong>8% - 15% loss</strong>). Deploy <strong>Vulcan Guardian</strong> immediately to safeguard your loan.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAgentToHire(emergencyAgent)}
                className="neo-btn bg-[#FF4365] text-white font-display font-black text-xs px-3.5 py-1.5 flex items-center space-x-1.5 hover:bg-[#121212] shrink-0 self-end sm:self-center"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>DEPLOY SHIELD NOW</span>
              </button>
            </div>
          )}

          {/* Stalls Header */}
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-display font-black text-xs sm:text-sm text-[#121212] uppercase tracking-tight">
                SELECT A SPECIALIZED SERVICE STALL
              </span>
            </div>
            <span className="font-mono-tech text-[9px] text-[#6A6A6A]">
              Click a stall to filter agents
            </span>
          </div>

          {/* 4 Clean Stalls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 flex-1">
            {STALLS_CONFIG.map((stall) => {
              const isSelected = selectedCategory === stall.id;
              const isEmergency = walletContext.hasEmergencyShortfall && stall.id === 'health_factor';
              const stallAgents = agents.filter((a) => a.labels?.includes(stall.id));
              const topAgent = stallAgents[0];

              return (
                <div
                  key={stall.id}
                  onClick={() => handleStallClick(stall.id)}
                  className={`neo-card p-3 sm:p-3.5 cursor-pointer flex flex-col justify-between relative transition-all duration-150 ${
                    isSelected
                      ? 'translate-x-[-2px] translate-y-[-2px] neo-shadow ring-2 ring-[#121212]'
                      : 'hover:translate-x-[-1px] hover:translate-y-[-1px] hover:neo-shadow-sm'
                  } ${isEmergency ? 'border-[#FF4365] ring-2 ring-[#FF4365]' : ''}`}
                  style={{
                    borderTop: `5px solid ${stall.accent}`,
                    backgroundColor: isSelected ? '#FFFFFF' : '#FAF7F0',
                  }}
                >
                  <div>
                    {/* Header line */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="neo-badge text-[8.5px] px-1.5 py-0.2 font-mono-tech font-black"
                        style={{ backgroundColor: stall.accent, color: '#121212' }}
                      >
                        {stall.issueCode}
                      </span>
                      <span className="font-mono-tech text-[9px] text-[#6A6A6A] font-bold">
                        {stallAgents.length} AGENT AVAILABLE
                      </span>
                    </div>

                    {/* Title + Mascot */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-black text-sm text-[#121212] leading-tight">
                          {stall.name}
                        </h3>
                        <p
                          className="font-mono-tech text-[10px] font-bold mt-0.5"
                          style={{ color: stall.accent }}
                        >
                          {stall.subtitle}
                        </p>
                      </div>

                      <div className="w-10 h-10 bg-[#FFFFFF] border-2 border-[#121212] flex items-center justify-center shrink-0">
                        <img
                          src={getPixelSprite(stall.id)}
                          alt={stall.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getPixelSprite(stall.id, 'idle');
                          }}
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                    </div>

                    {/* Purpose */}
                    <p className="font-sans text-xs text-[#4A4A4A] mt-2 leading-relaxed">
                      {stall.purpose}
                    </p>

                    {/* Key Benefit */}
                    <div className="mt-2 inline-flex items-center space-x-1 text-[10px] font-mono-tech font-black text-[#121212] bg-[#FFE500] px-2 py-0.5 border border-[#121212]">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{stall.benefit}</span>
                    </div>
                  </div>

                  {/* Stall Actions */}
                  <div className="mt-3 pt-2 border-t-2 border-[#121212] flex items-center justify-between gap-2">
                    <span className="font-mono-tech text-[10px] text-[#6A6A6A]">
                      FROM: <strong className="text-[#121212] font-black">{stall.startingRate}</strong>
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStallClick(stall.id);
                        }}
                        className={`neo-btn text-[9px] font-mono-tech font-black px-2 py-1 ${
                          isSelected ? 'bg-[#121212] text-white' : 'bg-[#FAF7F0] text-[#121212]'
                        }`}
                      >
                        {isSelected ? '✓ FILTERED' : 'VIEW AGENTS'}
                      </button>

                      {topAgent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAgentToHire(topAgent);
                          }}
                          className="neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-[9px] px-2.5 py-1 flex items-center space-x-1 hover:bg-[#FFE500]"
                        >
                          <Zap className="w-3 h-3 fill-[#121212]" />
                          <span>HIRE</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT 48%: Dedicated Search & Agent Directory (As Originally Requested) */}
        <div className="w-full lg:w-[48%] h-full bg-[#FFFFFF] flex flex-col p-3 sm:p-4 overflow-hidden">
          {/* Directory Header + Active Probed Status */}
          <div className="border-b-2 border-[#121212] pb-2.5 mb-2.5 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-[#121212]" />
                <div>
                  <h3 className="font-display font-extrabold text-xs sm:text-sm text-[#121212] uppercase tracking-tight block leading-none">
                    VERIFIED AGENT DIRECTORY
                  </h3>
                  <span className="font-mono-tech text-[9px] text-[#6A6A6A] mt-0.5 block">
                    Showing {filteredAgents.length} of {agents.length} on-chain verified agents
                  </span>
                </div>
              </div>

              {/* 5s Probed Live Checkbox */}
              <label className="flex items-center space-x-1.5 cursor-pointer font-mono-tech text-[10px] font-bold text-[#121212] bg-[#FAF7F0] px-2 py-1 border border-[#121212] neo-shadow-sm">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="accent-[#121212] w-3.5 h-3.5 border-2 border-[#121212]"
                />
                <span className="text-[#059669]">● 5s PROBED ACTIVE</span>
              </label>
            </div>

            {/* Quick Goal Tabs */}
            <div className="mb-2 bg-[#FAF7F0] p-1 border border-[#121212] flex items-center space-x-1 overflow-x-auto text-[10px] font-mono-tech scrollbar-none">
              <span className="text-[#8A8A8A] font-bold px-1 shrink-0 text-[9px]">GOAL:</span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#121212] text-white border-[#121212]'
                    : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#FFE500]'
                }`}
              >
                ALL ({agents.length})
              </button>
              <button
                onClick={() => handleStallClick('health_factor')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${
                  selectedCategory === 'health_factor'
                    ? 'bg-[#FF4365] text-white border-[#121212]'
                    : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#FF4365]/20'
                }`}
              >
                🛡️ LOAN DEFENSE
              </button>
              <button
                onClick={() => handleStallClick('yield')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${
                  selectedCategory === 'yield'
                    ? 'bg-[#00F59B] text-[#121212] border-[#121212]'
                    : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#00F59B]/20'
                }`}
              >
                💰 HARVEST APY
              </button>
              <button
                onClick={() => handleStallClick('grid')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${
                  selectedCategory === 'grid'
                    ? 'bg-[#FF7828] text-white border-[#121212]'
                    : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#FF7828]/20'
                }`}
              >
                📊 LP RANGE
              </button>
              <button
                onClick={() => handleStallClick('monitoring')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${
                  selectedCategory === 'monitoring'
                    ? 'bg-[#38BDF8] text-[#121212] border-[#121212]'
                    : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#38BDF8]/20'
                }`}
              >
                👁️ WHALE ALERT
              </button>
            </div>

            {/* Prominent Search Input Box (Right side search) */}
            <div className="flex items-center bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm px-2.5 py-1.5">
              <Search className="w-4 h-4 text-[#8A8A8A] mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search agent title, skills, or tokens (e.g. Venus, APY, Whale)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[#121212] font-mono-tech text-xs focus:outline-none placeholder-[#8A8A8A]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="font-mono-tech text-xs text-[#121212] font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Agent Card List on Right */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredAgents.length === 0 ? (
              <div className="text-center py-10 neo-card bg-[#FAF7F0] p-5 my-auto">
                <div className="text-2xl mb-1">🔍</div>
                <div className="font-display font-black text-xs text-[#121212] uppercase">
                  NO AGENTS MATCHING "{searchQuery}"
                </div>
                <p className="font-mono-tech text-[10px] text-[#6A6A6A] mt-1">
                  Try clearing the search query or resetting filters.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                    setActiveOnly(false);
                  }}
                  className="mt-3 neo-btn bg-[#FFE500] text-[#121212] font-mono-tech text-[10px] font-bold px-3 py-1"
                >
                  RESET FILTERS
                </button>
              </div>
            ) : (
              filteredAgents.map((agent) => {
                const career = (agent.labels?.[0] || 'monitoring') as CareerCategory;
                const spriteSrc = getPixelSprite(career);
                const isCompareChecked = Boolean(
                  selectedForCompare.find((a) => a.agentId === agent.agentId)
                );
                const hourlyCost = agent.rawJson?.hourlyCostU || '0.25';
                const dailyCost = (Number(hourlyCost) * 24).toFixed(2);
                const reputation = agent.rawJson?.reputationScore || 95;
                const isRecommended =
                  walletContext.hasEmergencyShortfall && career === 'health_factor';

                return (
                  <div
                    key={agent.agentId}
                    className={`neo-card p-3 rounded-none flex flex-col justify-between transition-transform ${
                      isRecommended ? 'border-2 border-[#FF4365] bg-[#FFFBFB]' : 'bg-[#FFFFFF]'
                    } hover:translate-x-[-1px] hover:translate-y-[-1px]`}
                  >
                    {/* Recommended Alert Badge */}
                    {isRecommended && (
                      <div className="bg-[#FF4365] text-white px-2 py-0.5 text-[8px] font-mono-tech font-black flex items-center justify-between mb-2">
                        <span className="flex items-center space-x-1">
                          <Flame className="w-3 h-3 fill-white" />
                          <span>RECOMMENDED SHIELD FOR YOUR WALLET (HF: {walletContext.healthFactor.toFixed(2)})</span>
                        </span>
                        <span>TOP SHIELD</span>
                      </div>
                    )}

                    <div>
                      {/* Top Row: Mascot, Title, Rates */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-11 h-11 bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center shrink-0">
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
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className="neo-badge bg-[#121212] text-[#FFE500] text-[8px] px-1.5 py-0.2 font-mono-tech">
                                {career.toUpperCase()}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full border border-[#121212] ${
                                  agent.hireable ? 'bg-[#00F59B]' : 'bg-[#A0A0A0]'
                                }`}
                              />
                              <span className="font-mono-tech text-[9px] text-[#059669] font-bold">
                                ONLINE
                              </span>
                            </div>

                            <h4 className="font-display font-black text-xs sm:text-sm text-[#121212] leading-snug mt-0.5">
                              {agent.name}
                            </h4>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="text-right shrink-0 bg-[#FAF7F0] p-1.5 border border-[#121212]">
                          <div className="font-mono-tech text-xs text-[#121212] font-black">
                            {hourlyCost} $U/hr
                          </div>
                          <div className="font-mono-tech text-[9px] text-[#6A6A6A]">
                            ~${dailyCost} / day
                          </div>
                          <div className="font-mono-tech text-[9px] text-[#059669] font-bold">
                            ★ {reputation}/100 PROOF
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="font-sans text-xs text-[#4A4A4A] mt-2 leading-relaxed bg-[#FAF7F0] p-2 border border-[#121212]/30">
                        "{agent.description}"
                      </p>

                      {/* Escrow & Security Badges */}
                      <div className="mt-1.5 flex items-center space-x-3 font-mono-tech text-[9px] text-[#555]">
                        <div className="flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                          <span>ERC-8183 Escrow Protected</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                          <span>Zero Key Delegation</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Buttons */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t-2 border-[#121212]">
                      <button
                        onClick={() => toggleCompareSelect(agent)}
                        className={`neo-badge text-[9px] px-2 py-0.5 ${
                          isCompareChecked
                            ? 'bg-[#FFE500] text-[#121212] border-[#121212]'
                            : 'bg-[#FAF7F0] text-[#6A6A6A] hover:text-[#121212]'
                        }`}
                      >
                        {isCompareChecked ? '✓ IN COMPARISON' : '+ COMPARE SPECS'}
                      </button>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setInspectedAgent(agent)}
                          className="neo-btn bg-[#FAF7F0] text-[#121212] font-mono-tech text-[10px] font-bold px-2.5 py-1"
                        >
                          FULL SPEC
                        </button>
                        <button
                          onClick={() => setAgentToHire(agent)}
                          className="neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-xs px-3.5 py-1 flex items-center space-x-1 hover:bg-[#FFE500]"
                        >
                          <Zap className="w-3.5 h-3.5 fill-[#121212]" />
                          <span>HIRE AGENT</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Compare Floating Banner */}
      {selectedForCompare.length > 0 && (
        <div className="bg-[#FFE500] border-t-2 border-[#121212] p-2.5 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-[#121212]" />
            <span className="font-display font-black text-xs text-[#121212] uppercase tracking-tight">
              COMPARE AGENTS ({selectedForCompare.length}/2):
            </span>
            <span className="font-mono-tech text-xs text-[#121212] font-bold">
              {selectedForCompare.map((a) => a.name.split(' ')[0]).join(' VS ')}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={selectedForCompare.length < 2}
              onClick={() => setShowCompareModal(true)}
              className={`neo-btn font-mono-tech text-xs font-bold px-3 py-1 ${
                selectedForCompare.length === 2
                  ? 'bg-[#121212] text-white'
                  : 'bg-[#FAF7F0] text-[#8A8A8A] opacity-60 cursor-not-allowed'
              }`}
            >
              VIEW COMPARISON
            </button>
            <button
              onClick={() => setSelectedForCompare([])}
              className="font-mono-tech text-xs text-[#121212] underline hover:text-[#FF4365] px-1 font-bold"
            >
              CLEAR
            </button>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && selectedForCompare.length === 2 && (
        <CompareModal
          agent1={selectedForCompare[0]}
          agent2={selectedForCompare[1]}
          onClose={() => setShowCompareModal(false)}
          onSelectToHire={(agent) => setAgentToHire(agent)}
        />
      )}

      {/* Hire Modal */}
      {agentToHire && (
        <HireModal
          agent={agentToHire}
          buyerAddress={buyerAddress}
          onClose={() => setAgentToHire(null)}
          onConfirmHire={onHireAgent}
          network={network}
        />
      )}

      {/* Inspected Agent Spec Sheet */}
      {inspectedAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="neo-card bg-[#FFFFFF] w-full max-w-lg p-5 neo-shadow-lg relative">
            <div className="flex items-center justify-between border-b-2 border-[#121212] pb-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-2 py-0.5 font-bold">
                  SPEC SHEET
                </span>
                <h3 className="font-display font-black text-sm text-[#121212]">
                  {inspectedAgent.name}
                </h3>
              </div>
              <button
                onClick={() => setInspectedAgent(null)}
                className="neo-btn bg-[#121212] text-white w-6 h-6 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono-tech text-xs text-[#121212]">
              <div>
                <span className="text-[#8A8A8A] block text-[10px] uppercase font-bold">
                  AUTONOMOUS DIRECTIVE:
                </span>
                <p className="font-sans text-xs text-[#3A3A3A] mt-0.5 leading-relaxed">
                  {inspectedAgent.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-[#FAF7F0] p-2.5 border-2 border-[#121212]">
                <div>
                  <span className="text-[#8A8A8A] text-[9px] block">ON-CHAIN IDENTIFIER:</span>
                  <span className="font-bold">{inspectedAgent.tokenId || inspectedAgent.agentId}</span>
                </div>
                <div>
                  <span className="text-[#8A8A8A] text-[9px] block">HOURLY RATE:</span>
                  <span className="font-bold">{inspectedAgent.rawJson?.hourlyCostU || '0.25'} $U/hr</span>
                </div>
                <div>
                  <span className="text-[#8A8A8A] text-[9px] block">DAILY ESTIMATE:</span>
                  <span className="font-bold">
                    {(Number(inspectedAgent.rawJson?.hourlyCostU || 0.25) * 24).toFixed(2)} $U/day
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A8A] text-[9px] block">ESCROW PROTOCOL:</span>
                  <span className="font-bold">ERC-8183 Smart Contract</span>
                </div>
              </div>

              <div className="bg-[#D1FAE5] border border-[#059669] p-2.5 text-[11px] text-[#065F46] font-sans leading-relaxed">
                <strong>🔒 Safe Escrow Guarantee:</strong> All escrowed deposits are held in a decentralized smart contract on BNB Chain. The agent can only claim payment after executing the assigned task and presenting verified cryptographic proof. You may terminate and refund any remaining balance at any time!
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  onClick={() => setInspectedAgent(null)}
                  className="neo-btn bg-[#FAF7F0] px-3 py-1.5 text-xs font-bold"
                >
                  CLOSE
                </button>
                <button
                  onClick={() => {
                    setAgentToHire(inspectedAgent);
                    setInspectedAgent(null);
                  }}
                  className="neo-btn bg-[#00F59B] px-4 py-1.5 text-xs font-black flex items-center space-x-1 hover:bg-[#FFE500]"
                >
                  <Zap className="w-3.5 h-3.5 fill-[#121212]" />
                  <span>PROCEED TO HIRE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
