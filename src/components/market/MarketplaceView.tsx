import React, { useState } from 'react';
import { AgentData, CareerCategory, WalletContextState } from '../../types.ts';
import { getPixelSprite } from '../game/pixelAssets.ts';
import { CompareModal } from './CompareModal.tsx';
import { HireModal } from './HireModal.tsx';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  Scale,
  Sparkles,
  Zap,
  SlidersHorizontal,
  HelpCircle,
  ShieldCheck,
  Flame,
  Check,
  BookOpen,
  Compass,
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
  whenToUse: string;
  costExplanation: string;
  keyFeatures: string[];
  startingRate: string;
  avgOutcome: string;
  badgeLabel?: string;
  iconType: 'shield' | 'coins' | 'chart' | 'eye';
}

const STALLS_CONFIG: StallMetadata[] = [
  {
    id: 'health_factor',
    name: 'HEALTH FACTOR CITADEL',
    subtitle: 'Venus Liquidation Guardian',
    purpose: 'Autonomously defends loan collateral to prevent devastating 8% - 15% liquidation seizure penalties',
    accent: '#FF4365',
    accentBg: '#FFE4E8',
    issueCode: 'RISK.03',
    whenToUse: 'When borrowing on Venus Protocol and your Health Factor approaches or dips below 1.25',
    costExplanation: '~0.30 $U/hr (Low insurance premium to safeguard thousands of dollars in collateral)',
    keyFeatures: [
      'Probes wallet loan safety ratio on-chain every 3 seconds',
      'Auto-injects flash collateral or repays debt during flash crashes',
      'Saves between 8% to 15% in liquidation penalty costs',
    ],
    startingRate: '0.30 $U/hr',
    avgOutcome: 'Saved $1,840+ in protected collateral',
    badgeLabel: 'CRITICAL DEFENSE',
    iconType: 'shield',
  },
  {
    id: 'yield',
    name: 'YIELD GREENHOUSE',
    subtitle: 'Optimal Compounder & Vault Allocator',
    purpose: 'Autonomously identifies top-yielding vaults across BSC and auto-compounds interest',
    accent: '#00F59B',
    accentBg: '#D1FAE5',
    issueCode: 'APY.04',
    whenToUse: 'When holding idle USDT, BUSD, or BNB and seeking safe 12% - 18% APY compounding',
    costExplanation: '~0.20 $U/hr (Fraction of a coffee cup per day for non-stop yield compounding)',
    keyFeatures: [
      'Auto-sweeps idle capital across Venus, Thena, and Beefy',
      'Triggers auto-compounding harvest cycles with optimized gas',
      'Zero lockup: withdraw your principal and yield at any moment',
    ],
    startingRate: '0.20 $U/hr',
    avgOutcome: '~14.8% Real Net APY compounded',
    badgeLabel: 'MOST POPULAR',
    iconType: 'coins',
  },
  {
    id: 'grid',
    name: 'GRID DRAFT WORKSHOP',
    subtitle: 'Dynamic Range Trading Engine',
    purpose: 'Autonomously repositions PancakeSwap V3 concentrated liquidity to maximize swap fee capture',
    accent: '#FF7828',
    accentBg: '#FFEDD5',
    issueCode: 'DEX.02',
    whenToUse: 'When your LP positions drift out of range and stop earning swap fees during volatility',
    costExplanation: '~0.45 $U/hr (Increases fee capture yield up to 3x compared to static ranges)',
    keyFeatures: [
      'Dynamic tick re-centering during market momentum shifts',
      'Eliminates dormant LP positions by keeping capital active in range',
      'Yields 2.5x to 3.2x higher swap fee share over static LPing',
    ],
    startingRate: '0.45 $U/hr',
    avgOutcome: '+3.2x LP Fee APR efficiency',
    badgeLabel: 'HIGH YIELD LP',
    iconType: 'chart',
  },
  {
    id: 'monitoring',
    name: 'WATCHTOWER OBSERVATORY',
    subtitle: 'Mempool & Whale Sentinel',
    purpose: 'Scans the BSC mempool 24/7 and delivers instant alerts upon detecting sandwich attacks or whale dumps',
    accent: '#38BDF8',
    accentBg: '#E0F2FE',
    issueCode: 'SEC.01',
    whenToUse: 'When holding major token balances and seeking protection against MEV frontrunning and sudden drains',
    costExplanation: '~0.15 $U/hr (Lowest cost autonomous 24/7 radar for complete wallet awareness)',
    keyFeatures: [
      'Pre-execution mempool radar scanning pending transactions',
      'Detects sudden whale dumping and liquidity withdrawal vectors',
      'Instant dispatch to Telegram and webhook endpoints',
    ],
    startingRate: '0.15 $U/hr',
    avgOutcome: 'P99 detection latency < 350ms',
    badgeLabel: 'LOWEST COST',
    iconType: 'eye',
  },
];

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  agents,
  walletContext,
  buyerAddress,
  onHireAgent,
  network,
}) => {
  // Modes & State
  const [viewMode, setViewMode] = useState<'beginner' | 'pro'>('beginner');
  const [selectedCategories, setSelectedCategories] = useState<CareerCategory[]>([]);
  const [activeOnly, setActiveOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<AgentData[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [agentToHire, setAgentToHire] = useState<AgentData | null>(null);
  const [inspectedAgent, setInspectedAgent] = useState<AgentData | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);

  // Filter handlers
  const handleStallClick = (cat: CareerCategory) => {
    if (selectedCategories.length === 1 && selectedCategories[0] === cat) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([cat]);
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

  // Filter agents
  const filteredAgents = agents.filter((agent) => {
    if (activeOnly && (!agent.active || !agent.reachable || !agent.hireable)) {
      return false;
    }
    const agentCategory = (agent.labels?.[0] || 'monitoring') as CareerCategory;
    if (selectedCategories.length > 0 && !selectedCategories.includes(agentCategory)) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = agent.name?.toLowerCase().includes(q);
      const matchDesc = agent.description?.toLowerCase().includes(q);
      const matchLabel = agent.labels?.some((l) => l.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchLabel) return false;
    }
    return true;
  });

  // Recommended agent for emergency shortfall (Vulcan)
  const emergencyAgent =
    agents.find((a) => a.labels?.includes('health_factor') || a.agentId === 'vulcan') || agents[0];

  return (
    <div className="w-full h-[calc(100vh-120px)] min-h-[560px] flex flex-col bg-[#F4F0EA] select-none overflow-hidden">
      {/* Top Banner: Mode Switcher + Safety Guarantee Bar */}
      <div className="bg-[#FFFFFF] border-b-2 border-[#121212] px-3 sm:px-4 py-2 z-20 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
        {/* Left: View Mode Toggle & Welcome */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center space-x-1.5">
            <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-2 py-0.5 font-black font-mono-tech">
              BAZAAR MKT.01
            </span>
            <span className="font-display font-extrabold text-xs sm:text-sm text-[#121212] uppercase tracking-tight">
              AUTONOMOUS AGENT BAZAAR
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#FAF7F0] border-2 border-[#121212] p-0.5 ml-2">
            <button
              onClick={() => setViewMode('beginner')}
              className={`px-2.5 py-0.5 text-[10px] font-mono-tech font-black transition-colors ${
                viewMode === 'beginner'
                  ? 'bg-[#00F59B] text-[#121212] shadow-xs'
                  : 'text-[#6A6A6A] hover:text-[#121212]'
              }`}
            >
              🌱 BEGINNER MODE
            </button>
            <button
              onClick={() => setViewMode('pro')}
              className={`px-2.5 py-0.5 text-[10px] font-mono-tech font-bold transition-colors ${
                viewMode === 'pro'
                  ? 'bg-[#121212] text-white shadow-xs'
                  : 'text-[#6A6A6A] hover:text-[#121212]'
              }`}
            >
              ⚡ PRO SPECS
            </button>
          </div>
        </div>

        {/* Right: Quick Safety Reassurance & Glossary button */}
        <div className="flex items-center space-x-2 text-[10px] font-mono-tech">
          <div className="hidden md:flex items-center space-x-2 text-[#059669] bg-[#FAF7F0] px-2 py-1 border border-[#121212]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-bold">SMART ESCROW: FUNDS RELEASE ONLY UPON VERIFIED PROOF</span>
          </div>

          <button
            onClick={() => setShowGlossary(!showGlossary)}
            className="neo-btn bg-[#FAF7F0] hover:bg-[#FFE500] text-[#121212] px-2 py-1 text-[10px] font-black flex items-center space-x-1 border border-[#121212]"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{showGlossary ? 'HIDE GLOSSARY' : 'NEWCOMER GLOSSARY'}</span>
          </button>
        </div>
      </div>

      {/* Mini Glossary Accordion for Beginners */}
      {showGlossary && (
        <div className="bg-[#FFFFFF] border-b-2 border-[#121212] p-3 shrink-0 z-10 transition-all">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-black text-xs text-[#121212] uppercase tracking-tight flex items-center space-x-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#00F59B]" />
                <span>NEWCOMER PRIMER: KEY CONCEPTS MADE SIMPLE</span>
              </span>
              <button
                onClick={() => setShowGlossary(false)}
                className="text-xs font-mono-tech font-bold text-[#6A6A6A] hover:text-[#121212]"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 font-mono-tech text-[10px]">
              <div className="bg-[#FAF7F0] p-2 border border-[#121212]">
                <strong className="text-[#121212] block mb-0.5">💰 WHAT IS $U?</strong>
                <p className="text-[#555] font-sans text-[11px] leading-snug">
                  The ecosystem stablecoin pegged to $1.00 USD. Used for transparent hourly agent compensation without price volatility.
                </p>
              </div>

              <div className="bg-[#FAF7F0] p-2 border border-[#121212]">
                <strong className="text-[#121212] block mb-0.5">🔒 WHAT IS ESCROW?</strong>
                <p className="text-[#555] font-sans text-[11px] leading-snug">
                  An on-chain smart contract vault holding your deposit safely. Agents only receive payment after submitting valid proof of work.
                </p>
              </div>

              <div className="bg-[#FAF7F0] p-2 border border-[#121212]">
                <strong className="text-[#121212] block mb-0.5">🛡️ WHAT IS HEALTH FACTOR (HF)?</strong>
                <p className="text-[#555] font-sans text-[11px] leading-snug">
                  Safety score of your loan on Venus. When HF drops below 1.15, your collateral faces immediate liquidation and hefty fines.
                </p>
              </div>

              <div className="bg-[#FAF7F0] p-2 border border-[#121212]">
                <strong className="text-[#121212] block mb-0.5">🔑 DO I SHARE PRIVATE KEYS?</strong>
                <p className="text-[#555] font-sans text-[11px] leading-snug">
                  Never! Zero key delegation. Agents run autonomously and interact strictly via verified permissioned smart contracts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT 54%: 4 Stalls or Matchmaker for Beginners */}
        <div className="w-full lg:w-[54%] h-full border-r-[2.5px] border-[#121212] relative flex flex-col p-3 sm:p-4 overflow-y-auto bg-[#F4F0EA]">
          {/* Interactive Matchmaker: "What would you like to achieve today?" */}
          <div className="bg-[#FFFFFF] border-2 border-[#121212] neo-shadow-sm p-3 mb-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[#FFE500] fill-[#121212]" />
                <h3 className="font-display font-black text-xs sm:text-sm text-[#121212] uppercase tracking-tight">
                  {viewMode === 'beginner'
                    ? 'WHAT WOULD YOU LIKE TO ACCOMPLISH TODAY?'
                    : 'TASK CLASSIFIER & STALL SELECTOR'}
                </h3>
              </div>
              <span className="font-mono-tech text-[9px] text-[#6A6A6A] font-bold">
                SELECT A GOAL TO AUTO-FILTER
              </span>
            </div>

            {/* 4 Clickable Purpose Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono-tech text-[10px]">
              <button
                onClick={() => handleStallClick('health_factor')}
                className={`p-2 border-2 text-left transition-all ${
                  selectedCategories.includes('health_factor')
                    ? 'bg-[#FF4365] text-white border-[#121212] neo-shadow ring-1 ring-[#121212]'
                    : 'bg-[#FAF7F0] text-[#121212] border-[#121212]/40 hover:border-[#121212]'
                }`}
              >
                <div className="font-black flex items-center space-x-1">
                  <span>🛡️</span>
                  <span className="truncate">PROTECT LOANS</span>
                </div>
                <p
                  className={`font-sans text-[10px] mt-0.5 line-clamp-2 ${
                    selectedCategories.includes('health_factor') ? 'text-white/90' : 'text-[#6A6A6A]'
                  }`}
                >
                  Prevent Venus liquidations
                </p>
              </button>

              <button
                onClick={() => handleStallClick('yield')}
                className={`p-2 border-2 text-left transition-all ${
                  selectedCategories.includes('yield')
                    ? 'bg-[#00F59B] text-[#121212] border-[#121212] neo-shadow ring-1 ring-[#121212]'
                    : 'bg-[#FAF7F0] text-[#121212] border-[#121212]/40 hover:border-[#121212]'
                }`}
              >
                <div className="font-black flex items-center space-x-1">
                  <span>💰</span>
                  <span className="truncate">HARVEST YIELD</span>
                </div>
                <p
                  className={`font-sans text-[10px] mt-0.5 line-clamp-2 ${
                    selectedCategories.includes('yield') ? 'text-[#121212]/90' : 'text-[#6A6A6A]'
                  }`}
                >
                  Auto-compound ~14.8% APY
                </p>
              </button>

              <button
                onClick={() => handleStallClick('grid')}
                className={`p-2 border-2 text-left transition-all ${
                  selectedCategories.includes('grid')
                    ? 'bg-[#FF7828] text-white border-[#121212] neo-shadow ring-1 ring-[#121212]'
                    : 'bg-[#FAF7F0] text-[#121212] border-[#121212]/40 hover:border-[#121212]'
                }`}
              >
                <div className="font-black flex items-center space-x-1">
                  <span>📈</span>
                  <span className="truncate">OPTIMIZE LP FEES</span>
                </div>
                <p
                  className={`font-sans text-[10px] mt-0.5 line-clamp-2 ${
                    selectedCategories.includes('grid') ? 'text-white/90' : 'text-[#6A6A6A]'
                  }`}
                >
                  Auto-rebalance Pancake V3
                </p>
              </button>

              <button
                onClick={() => handleStallClick('monitoring')}
                className={`p-2 border-2 text-left transition-all ${
                  selectedCategories.includes('monitoring')
                    ? 'bg-[#38BDF8] text-[#121212] border-[#121212] neo-shadow ring-1 ring-[#121212]'
                    : 'bg-[#FAF7F0] text-[#121212] border-[#121212]/40 hover:border-[#121212]'
                }`}
              >
                <div className="font-black flex items-center space-x-1">
                  <span>👁️</span>
                  <span className="truncate">24/7 WALLET RADAR</span>
                </div>
                <p
                  className={`font-sans text-[10px] mt-0.5 line-clamp-2 ${
                    selectedCategories.includes('monitoring') ? 'text-[#121212]/90' : 'text-[#6A6A6A]'
                  }`}
                >
                  Mempool & whale alert sentinel
                </p>
              </button>
            </div>
          </div>

          {/* Urgent Emergency Alert Banner for Low Health Factor */}
          {walletContext.hasEmergencyShortfall && (
            <div className="bg-[#FFF1F2] border-2 border-[#FF4365] neo-shadow-sm p-3 mb-3 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-start space-x-2.5">
                <div className="w-8 h-8 rounded-none bg-[#FF4365] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center shrink-0">
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
                    Your Venus loan collateral is dangerously close to liquidation penalty seizure (<strong>8% - 15% loss</strong>). We strongly advise hiring <strong>Vulcan Guardian</strong> immediately to inject flash collateral and safeguard your position.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => setAgentToHire(emergencyAgent)}
                  className="neo-btn bg-[#FF4365] text-white font-display font-black text-xs px-3.5 py-1.5 flex items-center space-x-1.5 hover:bg-[#121212]"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>DEPLOY SHIELD NOW</span>
                </button>
              </div>
            </div>
          )}

          {/* 4 Stalls Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
            {STALLS_CONFIG.map((stall) => {
              const isSelected = selectedCategories.includes(stall.id);
              const isEmergencyRecommended =
                walletContext.hasEmergencyShortfall && stall.id === 'health_factor';
              const stallAgents = agents.filter((a) => a.labels?.includes(stall.id));
              const topAgent = stallAgents[0];

              return (
                <div
                  key={stall.id}
                  onClick={() => handleStallClick(stall.id)}
                  className={`neo-card p-3 sm:p-3.5 cursor-pointer flex flex-col justify-between relative transition-all duration-150 ${
                    isSelected
                      ? 'translate-x-[-2px] translate-y-[-2px] neo-shadow-lg ring-2 ring-[#121212]'
                      : 'hover:translate-x-[-1px] hover:translate-y-[-1px] hover:neo-shadow'
                  } ${isEmergencyRecommended ? 'border-[#FF4365] ring-2 ring-[#FF4365] bg-[#FFFBFB]' : ''}`}
                  style={{
                    borderTop: `6px solid ${stall.accent}`,
                    backgroundColor: isSelected ? '#FFFFFF' : '#FAF7F0',
                  }}
                >
                  {/* Top Stall Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className="neo-badge text-[9px] px-1.5 py-0.2 font-mono-tech font-black"
                          style={{ backgroundColor: stall.accent, color: '#121212' }}
                        >
                          {stall.issueCode}
                        </span>
                        {stall.badgeLabel && (
                          <span className="neo-badge bg-[#FFFFFF] border border-[#121212] text-[8px] px-1.5 py-0.2 font-mono-tech font-bold text-[#121212]">
                            {stall.badgeLabel}
                          </span>
                        )}
                      </div>

                      <span className="font-mono-tech text-[10px] text-[#6A6A6A] font-bold">
                        {stallAgents.length} VERIFIED AGENT
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display font-extrabold text-sm sm:text-base text-[#121212] leading-tight">
                          {stall.name}
                        </h3>
                        <p
                          className="font-mono-tech text-[11px] font-bold mt-0.5"
                          style={{ color: stall.accent }}
                        >
                          {stall.subtitle}
                        </p>
                      </div>

                      {/* Pixel Mascot */}
                      <div className="w-11 h-11 bg-[#FFFFFF] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center shrink-0 ml-2">
                        <img
                          src={getPixelSprite(stall.id)}
                          alt={stall.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getPixelSprite(stall.id, 'idle');
                          }}
                          className="w-9 h-9 object-contain"
                        />
                      </div>
                    </div>

                    {/* Clear Problem Statement */}
                    <p className="font-sans text-xs text-[#3A3A3A] mt-2 font-medium leading-snug">
                      {stall.purpose}
                    </p>

                    {/* When to use */}
                    <div className="mt-2 bg-[#FFFFFF] border border-[#121212] p-2">
                      <span className="font-mono-tech text-[9px] font-black text-[#121212] uppercase block">
                        WHEN TO USE:
                      </span>
                      <p className="font-sans text-[11px] text-[#555] leading-snug">
                        {stall.whenToUse}
                      </p>
                    </div>

                    {/* Key Capabilities Checklist */}
                    <div className="mt-2 space-y-1">
                      {stall.keyFeatures.map((feat, idx) => (
                        <div key={idx} className="flex items-center space-x-1.5 text-[10px] font-mono-tech text-[#3A3A3A]">
                          <Check className="w-3 h-3 text-[#00F59B] shrink-0 stroke-[3]" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Metric Strip & Action Buttons */}
                  <div className="mt-3 pt-2 border-t-2 border-[#121212]">
                    <div className="flex items-center justify-between mb-2 font-mono-tech text-[10px]">
                      <span className="text-[#6A6A6A]">
                        RATE: <strong className="text-[#121212] font-black">{stall.startingRate}</strong>
                      </span>
                      <span className="text-[#059669] font-bold text-right truncate max-w-[140px]">
                        {stall.avgOutcome}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStallClick(stall.id);
                        }}
                        className={`flex-1 neo-btn font-mono-tech text-[10px] font-black py-1.5 transition-colors ${
                          isSelected
                            ? 'bg-[#121212] text-white'
                            : 'bg-[#FFE500] text-[#121212] hover:bg-[#121212] hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ACTIVE FILTER' : 'FILTER STALL'}
                      </button>

                      {topAgent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAgentToHire(topAgent);
                          }}
                          className="neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-[10px] px-2.5 py-1.5 flex items-center space-x-1 hover:bg-[#FFE500]"
                          title={`Quick hire ${topAgent.name}`}
                        >
                          <Zap className="w-3 h-3 fill-[#121212]" />
                          <span>QUICK HIRE</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compare Floating Banner */}
          {selectedForCompare.length > 0 && (
            <div className="bg-[#FFE500] border-2 border-[#121212] neo-shadow p-2.5 flex items-center justify-between z-20 shrink-0 mt-auto">
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
                  className={`neo-btn font-mono-tech text-[10px] font-bold px-3 py-1 ${
                    selectedForCompare.length === 2
                      ? 'bg-[#121212] text-white'
                      : 'bg-[#FAF7F0] text-[#8A8A8A] opacity-60 cursor-not-allowed'
                  }`}
                >
                  VIEW COMPARISON
                </button>
                <button
                  onClick={() => setSelectedForCompare([])}
                  className="font-mono-tech text-[10px] text-[#121212] underline hover:text-[#FF4365] px-1 font-bold"
                >
                  CLEAR
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 46%: Beginner-Optimized Agent Directory & Spec Inspector */}
        <div className="w-full lg:w-[46%] h-full bg-[#FFFFFF] flex flex-col p-3 sm:p-4 overflow-hidden">
          {/* Directory Header & Probing Badge */}
          <div className="border-b-2 border-[#121212] pb-3 mb-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-[#121212]" />
                <div>
                  <span className="font-display font-extrabold text-xs sm:text-sm text-[#121212] uppercase tracking-tight block">
                    VERIFIED AGENT DIRECTORY
                  </span>
                  <span className="font-mono-tech text-[9px] text-[#6A6A6A]">
                    Showing {filteredAgents.length} of {agents.length} on-chain verified agents
                  </span>
                </div>
              </div>

              {/* Active Probed Checkbox with Explanation */}
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

            {/* Quick Filter Buttons */}
            <div className="mb-2 bg-[#FAF7F0] p-1.5 border border-[#121212] flex items-center space-x-1 overflow-x-auto text-[10px] font-mono-tech">
              <span className="text-[#8A8A8A] font-bold px-1 shrink-0">GOAL:</span>
              <button
                onClick={() => setSelectedCategories([])}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${
                  selectedCategories.length === 0
                    ? 'bg-[#121212] text-white border-[#121212]'
                    : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#FFE500]'
                }`}
              >
                ALL ({agents.length})
              </button>
              <button
                onClick={() => handleStallClick('health_factor')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${
                  selectedCategories.includes('health_factor')
                    ? 'bg-[#FF4365] text-white border-[#121212]'
                    : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#FF4365]/20'
                }`}
              >
                🛡️ LOAN DEFENSE
              </button>
              <button
                onClick={() => handleStallClick('yield')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${
                  selectedCategories.includes('yield')
                    ? 'bg-[#00F59B] text-[#121212] border-[#121212]'
                    : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#00F59B]/20'
                }`}
              >
                💰 HARVEST APY
              </button>
              <button
                onClick={() => handleStallClick('grid')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${
                  selectedCategories.includes('grid')
                    ? 'bg-[#FF7828] text-white border-[#121212]'
                    : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#FF7828]/20'
                }`}
              >
                📊 LP RANGE
              </button>
              <button
                onClick={() => handleStallClick('monitoring')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${
                  selectedCategories.includes('monitoring')
                    ? 'bg-[#38BDF8] text-[#121212] border-[#121212]'
                    : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#38BDF8]/20'
                }`}
              >
                👁️ WHALE ALERT
              </button>
            </div>

            {/* Search Input Box */}
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

          {/* Scrollable Agent Card List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredAgents.length === 0 ? (
              <div className="text-center py-12 neo-card bg-[#FAF7F0] p-6">
                <Compass className="w-8 h-8 mx-auto text-[#8A8A8A] mb-2 animate-bounce" />
                <div className="font-display font-black text-xs text-[#121212] uppercase">
                  NO AGENTS MATCHING YOUR FILTER
                </div>
                <p className="font-mono-tech text-[10px] text-[#6A6A6A] mt-1">
                  Try clearing the category filter or uncheck active probed requirement.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setSearchQuery('');
                    setActiveOnly(false);
                  }}
                  className="mt-3 neo-btn bg-[#FFE500] text-[#121212] font-mono-tech text-[10px] font-bold px-3 py-1"
                >
                  RESET ALL FILTERS
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
                    {/* Recommended Badge for Newcomer */}
                    {isRecommended && (
                      <div className="bg-[#FF4365] text-white px-2 py-0.5 text-[8px] font-mono-tech font-black flex items-center justify-between mb-2">
                        <span className="flex items-center space-x-1">
                          <Flame className="w-3 h-3 fill-white" />
                          <span>RECOMMENDED SHIELD FOR YOUR WALLET (HF: {walletContext.healthFactor.toFixed(2)})</span>
                        </span>
                        <span>TOP SHIELD</span>
                      </div>
                    )}

                    {/* Top Card Info */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
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
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className="neo-badge bg-[#121212] text-[#FFE500] text-[8px] px-1.5 py-0.2 font-mono-tech">
                                {career.toUpperCase()}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full border border-[#121212] ${
                                  agent.hireable ? 'bg-[#00F59B]' : 'bg-[#A0A0A0]'
                                }`}
                                title={agent.hireable ? 'Online & Available' : 'Standby'}
                              />
                              <span className="font-mono-tech text-[9px] text-[#059669] font-bold">
                                ONLINE
                              </span>
                            </div>

                            <h4 className="font-display font-extrabold text-xs sm:text-sm text-[#121212] leading-snug mt-0.5">
                              {agent.name}
                            </h4>
                          </div>
                        </div>

                        {/* Pricing Breakdown */}
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

                      {/* Agent Description */}
                      <p className="font-sans text-xs text-[#4A4A4A] mt-2 leading-relaxed bg-[#FAF7F0] p-2 border border-[#121212]/30">
                        "{agent.description}"
                      </p>

                      {/* Guarantees */}
                      <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono-tech text-[9px] text-[#555]">
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

                    {/* Card Controls */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t-2 border-[#121212]">
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
                          <Zap className="w-3 h-3 fill-[#121212]" />
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
                <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-2 py-0.5">
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

              {/* Beginner Security Guarantee Notice */}
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
