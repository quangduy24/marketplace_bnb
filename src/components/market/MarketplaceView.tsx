import React, { useState, useEffect } from 'react';
import { AgentData, CareerCategory, WalletContextState } from '../../types.ts';
import { getPixelSprite } from '../game/pixelAssets.ts';
import { CompareModal } from './CompareModal.tsx';
import { HireModal } from './HireModal.tsx';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Zap,
  HelpCircle,
  Flame,
  Check,
  BookOpen,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';

interface MarketplaceViewProps {
  agents: AgentData[]; // Complete agent pool for directory & search
  agentsActive?: AgentData[]; // Active labeled agents for the 4 stalls
  walletContext: WalletContextState;
  buyerAddress?: string;
  onHireAgent: (payload: any) => Promise<void>;
  network: 'bscTestnet' | 'bscMainnet';
  onRefreshAgents?: () => Promise<void>;
}

interface StallMetadata {
  id: CareerCategory;
  name: string;
  subtitle: string;
  purpose: string;
  accent: string;
  accentBg: string;
  issueCode: string;
  icon: string;
}

const STALLS_CONFIG: StallMetadata[] = [
  {
    id: 'health_factor',
    name: 'Health Factor Monitoring',
    subtitle: 'Protects lending positions from liquidation',
    purpose: 'Protects lending positions from liquidation.',
    accent: '#FF4365',
    accentBg: '#FFF1F2',
    issueCode: 'HEALTH',
    icon: '🛡️',
  },
  {
    id: 'yield',
    name: 'Yield Optimisation',
    subtitle: 'Routes liquidity to the highest available APR',
    purpose: 'Routes liquidity to the highest available APR.',
    accent: '#00F59B',
    accentBg: '#ECFDF5',
    issueCode: 'YIELD',
    icon: '💰',
  },
  {
    id: 'grid',
    name: 'Grid Trading',
    subtitle: 'Places and manages automated grid orders',
    purpose: 'Places and manages automated grid orders.',
    accent: '#FF7828',
    accentBg: '#FFF7ED',
    issueCode: 'GRID',
    icon: '📈',
  },
  {
    id: 'rebalancing',
    name: 'Rebalancing',
    subtitle: 'Manages LP ranges, resets positions automatically',
    purpose: 'Manages LP ranges, resets positions automatically.',
    accent: '#38BDF8',
    accentBg: '#F0F9FF',
    issueCode: 'REBAL',
    icon: '🔄',
  },
];

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  agents,
  agentsActive,
  walletContext,
  buyerAddress,
  onHireAgent,
  network,
  onRefreshAgents,
}) => {
  // Pool for 4 stalls: prefer agentsActive, fallback to agents
  const stallPool = agentsActive && agentsActive.length > 0 ? agentsActive : agents;
  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<CareerCategory | 'all' | 'uncategorized'>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<AgentData[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [agentToHire, setAgentToHire] = useState<AgentData | null>(null);
  const [hireCategory, setHireCategory] = useState<CareerCategory | null>(null);
  const [inspectedAgent, setInspectedAgent] = useState<AgentData | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);
  const [liveSearchResults, setLiveSearchResults] = useState<AgentData[] | null>(null);
  const [liveSearching, setLiveSearching] = useState(false);
  const [isSyncingRegistry, setIsSyncingRegistry] = useState(false);

  // Manual trigger for background targeted semantic sync from 8004scan
  const handleManualSync = async () => {
    if (isSyncingRegistry) return;
    setIsSyncingRegistry(true);
    try {
      const res = await fetch('/api/workers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'semantic' }),
      });
      if (res.ok && onRefreshAgents) {
        await onRefreshAgents();
      }
    } catch (err) {
      console.warn('Manual sync failed:', err);
    } finally {
      setIsSyncingRegistry(false);
    }
  };

  // Instant local search filter: 0ms latency for smooth 60 FPS typing
  const localMatchedAgents = React.useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const q = searchQuery.toLowerCase().trim();
    return agents.filter((a) => {
      const matchName = a.name?.toLowerCase().includes(q);
      const matchDesc = a.description?.toLowerCase().includes(q);
      const matchLabel = a.labels?.some((l) => l.toLowerCase().includes(q));
      return matchName || matchDesc || matchLabel;
    });
  }, [agents, searchQuery]);

  // Background 8004scan registry discovery & auto-persistence (non-blocking)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setLiveSearchResults(null);
      setLiveSearching(false);
      return;
    }
    const controller = new AbortController();
    setLiveSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/agents?q=${encodeURIComponent(searchQuery.trim())}&live=true&activeOnly=false&includeUncategorized=true&chainId=${network === 'bscMainnet' ? 56 : 97}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.agents && data.agents.length > 0) {
            setLiveSearchResults(data.agents);
            // Refresh local store if new agents were saved into DB
            if (onRefreshAgents) onRefreshAgents();
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.warn('Live search failed:', err);
      } finally {
        if (!controller.signal.aborted) setLiveSearching(false);
      }
    }, 600);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [searchQuery, network, onRefreshAgents]);

  // Filter handlers
  const handleStallClick = (cat: CareerCategory | 'uncategorized') => {
    if (selectedCategory === cat) {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(cat);
    }
  };

  // Count uncategorized (Other) for category tab
  const uncategorizedCount = agents.filter(
    (a) => (a.labels || []).includes('uncategorized') || !a.labels || a.labels.length === 0
  ).length;

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

  // Combined pool: instant local results first, seamlessly enriched with live results
  const directoryPool = (() => {
    if (!searchQuery.trim()) return agents;
    if (liveSearchResults && liveSearchResults.length > 0) {
      const byId = new Map<string, AgentData>();
      for (const a of localMatchedAgents) byId.set(a.agentId, a);
      for (const a of liveSearchResults) byId.set(a.agentId, a);
      return Array.from(byId.values());
    }
    return localMatchedAgents;
  })();

  const isLiveMode = Boolean(searchQuery.trim());

  // Filter agents for the right panel — đa tag: agent có thể thuộc nhiều category
  const filteredAgents = directoryPool.filter((agent) => {
    if (verifiedOnly && (!agent.active || !agent.reachable || !agent.hireable)) {
      return false;
    }
    // Category filter: 'all' hiển thị toàn bộ (gồm uncategorized/Other); chọn category cụ thể thì lọc theo labels
    if (selectedCategory === 'uncategorized') {
      const labels = agent.labels || [];
      if (!labels.includes('uncategorized') && labels.length > 0) return false;
      return true;
    }
    if (selectedCategory !== 'all') {
      const normalizedLabels = (agent.labels || []).map((l) => (l === 'monitoring' ? 'rebalancing' : l));
      if (normalizedLabels.length === 0) return false;
      if (!normalizedLabels.includes(selectedCategory)) return false;
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

  // Emergency agent for loan shortfall — dùng stallPool (active labeled)
  const emergencyAgent =
    stallPool.find((a) => a.labels?.includes('health_factor') || a.agentId === 'vulcan') || stallPool[0];

  return (
    <div className="w-full h-[calc(100vh-120px)] min-h-[560px] flex flex-col bg-[#F4F0EA] select-none overflow-hidden">
      {/* Top Bar: Title & Guide Button */}
      <div className="bg-[#FFFFFF] border-b-2 border-[#121212] px-3 sm:px-4 py-2 shrink-0 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2">
          <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-2 py-0.5 font-black font-mono-tech">
            MKT.01
          </span>
          <span className="neo-badge bg-[#00F59B] text-[#121212] text-[9px] px-2 py-0.5 font-black font-mono-tech">
            Unlimited hires
          </span>
          <span className="font-display font-extrabold text-xs sm:text-sm text-[#121212] uppercase tracking-tight">
            Agent Marketplace
          </span>
          <span className="hidden sm:inline font-mono-tech text-[10px] text-[#6A6A6A]">
            // Verified ERC-8004 Agents with Unlimited Concurrent Escrows
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[10px] font-mono-tech">
          <div className="hidden md:flex items-center space-x-1.5 text-[#059669] bg-[#FAF7F0] px-2 py-1 border border-[#121212]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-bold">100% ESCROW PROTECTED</span>
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
                <strong className="text-[#121212] block mb-0.5">📜 VERIFIED PROOFS</strong>
                <span className="text-[#555] font-sans text-[11px]">
                  Every completed job stores an on-chain proof with an explorer link you can check.
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
                    Your Venus collateral is near liquidation — immediate seizure risk. Activate a Health Factor Monitoring agent to protect your position.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAgentToHire(emergencyAgent)}
                className="neo-btn bg-[#FF4365] text-white font-display font-black text-xs px-3.5 py-1.5 flex items-center space-x-1.5 hover:bg-[#121212] shrink-0 self-end sm:self-center"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Activate Protection</span>
              </button>
            </div>
          )}

          {/* Stalls Header */}
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-display font-black text-xs sm:text-sm text-[#121212] uppercase tracking-tight">
                Browse by category
              </span>
            </div>
            <span className="font-mono-tech text-[9px] text-[#6A6A6A]">
              Select a category to filter agents
            </span>
          </div>

          {/* 4 Clean Stalls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 flex-1">
            {STALLS_CONFIG.map((stall) => {
              const isSelected = selectedCategory === stall.id;
              const isEmergency = walletContext.hasEmergencyShortfall && stall.id === 'health_factor';
              const stallAgents = stallPool.filter((a) => {
                const labels = a.labels || [];
                if (stall.id === 'rebalancing') return labels.includes('rebalancing') || labels.includes('monitoring');
                return labels.includes(stall.id);
              });
              const topAgent = stallAgents[0];
              const rates = stallAgents
                .map((a) => Number((a.rawJson as any)?.hourlyCostU))
                .filter((n) => Number.isFinite(n) && n > 0);
              const minRate = rates.length > 0 ? Math.min(...rates) : null;
              const verifiedCount = stallAgents.filter((a) => a.hireable).length;

              return (
                <div
                  key={stall.id}
                  onClick={() => handleStallClick(stall.id)}
                  className={`neo-card p-3 sm:p-3.5 cursor-pointer flex flex-col justify-between relative transition-all duration-150 ${isSelected
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
                        {stallAgents.length} AGENTS · {verifiedCount} HIREABLE
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

                    {/* Tags */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span
                        className="neo-badge text-[8px] px-1.5 py-0.5 font-mono-tech font-black border border-[#121212]"
                        style={{ backgroundColor: stall.accent, color: '#121212' }}
                      >
                        {stall.id === 'health_factor' ? 'HEALTH FACTOR MONITORING' : stall.id === 'yield' ? 'YIELD OPTIMISATION' : stall.id === 'grid' ? 'GRID TRADING' : 'REBALANCING'}
                      </span>
                    </div>

                    {/* Top agent (real data) */}
                    <div className="mt-2 inline-flex items-center space-x-1 text-[10px] font-mono-tech font-black text-[#121212] bg-[#FFE500] px-2 py-0.5 border border-[#121212]">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>TOP: {topAgent ? topAgent.name : '— no agent yet'}</span>
                    </div>
                  </div>

                  {/* Stall Actions */}
                  <div className="mt-3 pt-2 border-t-2 border-[#121212] flex items-center justify-between gap-2">
                    <span className="font-mono-tech text-[10px] text-[#6A6A6A]">
                      FROM:{' '}
                      <strong className="text-[#121212] font-black">
                        {minRate !== null ? `${minRate.toFixed(2)} $U/hr` : '—'}
                      </strong>
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStallClick(stall.id);
                        }}
                        className={`neo-btn text-[9px] font-mono-tech font-black px-2 py-1 ${isSelected ? 'bg-[#121212] text-white' : 'bg-[#FAF7F0] text-[#121212]'
                          }`}
                      >
                        {isSelected ? '✓ FILTERED' : 'VIEW AGENTS'}
                      </button>

                      {topAgent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHireCategory(stall.id);
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
                    AGENT DIRECTORY
                  </h3>
                  <span className="font-mono-tech text-[9px] text-[#6A6A6A] mt-0.5 block">
                    Showing {filteredAgents.length} {isLiveMode ? 'live registry results' : `of ${agents.length} agents`}
                    {isLiveMode && liveSearching ? ' · searching 8004scan…' : ''}
                    {isLiveMode && liveSearchResults && liveSearchResults.length > 0 ? ' (registry 300k+)' : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Sync scan */}
                <button
                  onClick={handleManualSync}
                  disabled={isSyncingRegistry}
                  className="neo-btn bg-[#FFE500] hover:bg-[#FAF7F0] text-[#121212] px-2 py-1 text-[10px] font-mono-tech font-black flex items-center space-x-1.5 border border-[#121212] neo-shadow-sm disabled:opacity-50"
                  title="Sync and categorize new agents from 8004scan into database"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingRegistry ? 'animate-spin' : ''}`} />
                  <span>{isSyncingRegistry ? 'SYNCING...' : 'SYNC SCAN'}</span>
                </button>

                {/* Verified only checkbox */}
                <label className="flex items-center space-x-1.5 cursor-pointer font-mono-tech text-[10px] font-bold text-[#121212] bg-[#FAF7F0] px-2 py-1 border border-[#121212] neo-shadow-sm">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="accent-[#121212] w-3.5 h-3.5 border-2 border-[#121212]"
                  />
                  <span className="text-[#059669]">● VERIFIED ONLY</span>
                </label>
              </div>
            </div>

            {/* Quick Goal Tabs */}
            <div className="mb-2 bg-[#FAF7F0] p-1 border border-[#121212] flex items-center space-x-1 overflow-x-auto text-[10px] font-mono-tech scrollbar-none">
              <span className="text-[#8A8A8A] font-bold px-1 shrink-0 text-[9px]">CATEGORY:</span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${selectedCategory === 'all'
                  ? 'bg-[#121212] text-white border-[#121212]'
                  : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#FFE500]'
                  }`}
              >
                ALL ({agents.length})
              </button>
              <button
                onClick={() => handleStallClick('health_factor')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${selectedCategory === 'health_factor'
                  ? 'bg-[#FF4365] text-white border-[#121212]'
                  : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#FF4365]/20'
                  }`}
              >
                Health Factor Monitoring
              </button>
              <button
                onClick={() => handleStallClick('yield')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${selectedCategory === 'yield'
                  ? 'bg-[#00F59B] text-[#121212] border-[#121212]'
                  : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#00F59B]/20'
                  }`}
              >
                Yield Optimisation
              </button>
              <button
                onClick={() => handleStallClick('grid')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${selectedCategory === 'grid'
                  ? 'bg-[#FF7828] text-white border-[#121212]'
                  : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#FF7828]/20'
                  }`}
              >
                Grid Trading
              </button>
              <button
                onClick={() => handleStallClick('rebalancing')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${selectedCategory === 'rebalancing'
                  ? 'bg-[#38BDF8] text-[#121212] border-[#121212]'
                  : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#38BDF8]/20'
                  }`}
              >
                Rebalancing
              </button>
              <button
                onClick={() => handleStallClick('uncategorized')}
                className={`px-2 py-0.5 border text-[9px] font-bold shrink-0 transition-colors ${selectedCategory === 'uncategorized'
                  ? 'bg-[#A0A0A0] text-white border-[#121212]'
                  : 'bg-[#FFFFFF] text-[#121212] border-[#121212] hover:bg-[#A0A0A0]/30'
                  }`}
              >
                Uncategorized ({uncategorizedCount})
              </button>
            </div>

            {/* Prominent Search Input Box (Right side search) */}
            <div className="flex items-center bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm px-2.5 py-1.5">
              <Search className="w-4 h-4 text-[#8A8A8A] mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search all agents — name, skills, or tokens (live 8004scan registry 300k+)"
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
                    setVerifiedOnly(false);
                  }}
                  className="mt-3 neo-btn bg-[#FFE500] text-[#121212] font-mono-tech text-[10px] font-bold px-3 py-1"
                >
                  RESET FILTERS
                </button>
              </div>
            ) : (
              filteredAgents.map((agent) => {
                const rawLabels = (agent.labels || []);
                const normalizedLabels = rawLabels.map((l) => (l === 'monitoring' ? 'rebalancing' : l));
                // Đa tag: ưu tiên hiển thị theo category đang filter, fallback tag đầu hợp lệ
                const firstCareer = normalizedLabels.find((l) => ['health_factor', 'rebalancing', 'grid', 'yield'].includes(l)) as CareerCategory | undefined;
                const displayCareer = (selectedCategory !== 'all' && normalizedLabels.includes(selectedCategory) ? selectedCategory : (firstCareer || 'rebalancing')) as CareerCategory;
                const career = displayCareer;
                const spriteSrc = getPixelSprite(career);
                const isCompareChecked = Boolean(
                  selectedForCompare.find((a) => a.agentId === agent.agentId)
                );
                const hourlyCostRaw = Number((agent.rawJson as any)?.hourlyCostU);
                const hasRate = Number.isFinite(hourlyCostRaw) && hourlyCostRaw > 0;
                const hourlyCost = hasRate ? String((agent.rawJson as any)?.hourlyCostU) : null;
                const dailyCost = hasRate ? (hourlyCostRaw * 24).toFixed(2) : null;
                const rawStats = (agent.rawJson || {}) as any;
                const starCount = rawStats.starCount ?? 0;
                const totalScore = Number(rawStats.totalScore || 0);
                const feedbacks = rawStats.totalFeedbacks ?? 0;
                const isRecommended =
                  walletContext.hasEmergencyShortfall && normalizedLabels.includes('health_factor');

                return (
                  <div
                    key={agent.agentId}
                    className={`neo-card p-3 rounded-none flex flex-col justify-between transition-transform ${isRecommended ? 'border-2 border-[#FF4365] bg-[#FFFBFB]' : 'bg-[#FFFFFF]'
                      } hover:translate-x-[-1px] hover:translate-y-[-1px]`}
                  >
                    {/* Recommended Alert Badge */}
                    {isRecommended && (
                      <div className="bg-[#FF4365] text-white px-2 py-0.5 text-[8px] font-mono-tech font-black flex items-center justify-between mb-2">
                        <span className="flex items-center space-x-1">
                          <Flame className="w-3 h-3 fill-white" />
                          <span>Recommended for your wallet (HF: {walletContext.healthFactor.toFixed(2)})</span>
                        </span>
                        <span>Top pick</span>
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
                              {(normalizedLabels.length > 0 ? normalizedLabels : [career]).map((tag) => {
                                const label = tag === 'health_factor' ? 'HEALTH FACTOR MONITORING' : tag === 'rebalancing' ? 'REBALANCING' : tag === 'grid' ? 'GRID TRADING' : tag === 'yield' ? 'YIELD OPTIMISATION' : (tag as string).toUpperCase();
                                return (
                                  <span
                                    key={tag}
                                    className="neo-badge bg-[#121212] text-[#FFE500] text-[8px] px-1.5 py-0.2 font-mono-tech"
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                              <span
                                className={`w-2 h-2 rounded-full border border-[#121212] ${agent.hireable && agent.active ? 'bg-[#00F59B]' : agent.reachable ? 'bg-[#FFE500]' : 'bg-[#A0A0A0]'
                                  }`}
                              />
                              <span className="font-mono-tech text-[9px] font-bold text-[#059669]">
                                {agent.hireable && agent.active ? 'ONLINE' : agent.reachable ? 'REACHABLE' : !agent.active ? 'OFFLINE' : 'UNPROBED'}
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
                            {hourlyCost ? `${hourlyCost} $U/hr` : 'RATE: —'}
                          </div>
                          <div className="font-mono-tech text-[9px] text-[#6A6A6A]">
                            {dailyCost ? `~$${dailyCost} / day` : 'quote on hire'}
                          </div>
                          <div className="font-mono-tech text-[9px] text-[#059669] font-bold">
                            ★ {starCount} · {totalScore.toFixed(1)} SCORE
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="font-sans text-xs text-[#4A4A4A] mt-2 leading-relaxed bg-[#FAF7F0] p-2 border border-[#121212]/30">
                        "{agent.description}"
                      </p>

                      {/* Settlement Rails & Security (real per-agent data) */}
                      <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1 font-mono-tech text-[9px] text-[#555]">
                        {agent.x402Supported && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                            <span>X402 PAYMENTS</span>
                          </div>
                        )}
                        {agent.supportedProtocols?.includes('erc8183') && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                            <span>ERC-8183 ESCROW</span>
                          </div>
                        )}
                        {agent.agentUri && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                            <span>A2A ENDPOINT</span>
                          </div>
                        )}
                        {!agent.x402Supported && !agent.supportedProtocols?.includes('erc8183') && !agent.agentUri && (
                          <div className="flex items-center space-x-1 text-[#A0A0A0]">
                            <AlertTriangle className="w-3 h-3" />
                            <span>NO RAIL LISTED</span>
                          </div>
                        )}
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
                        className={`neo-badge text-[9px] px-2 py-0.5 ${isCompareChecked
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
                          onClick={() => {
                            // Đa tag: nếu đang filter 1 category thì hire theo category đang filter, ngược lại theo tag đầu
                            const normalized = (agent.labels || []).map((l) => (l === 'monitoring' ? 'rebalancing' : l)) as CareerCategory[];
                            const cat = selectedCategory !== 'all' && normalized.includes(selectedCategory) ? selectedCategory : (normalized[0] as CareerCategory) || 'rebalancing';
                            setHireCategory(cat);
                            setAgentToHire(agent);
                          }}
                          disabled={!agent.hireable}
                          className={`neo-btn font-display font-black text-xs px-3.5 py-1 flex items-center space-x-1 ${agent.hireable
                            ? 'bg-[#00F59B] text-[#121212] hover:bg-[#FFE500]'
                            : 'bg-[#E5E0D5] text-[#8A8A8A] cursor-not-allowed'
                            }`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-[#121212]" />
                          <span>{agent.hireable ? 'HIRE AGENT' : 'NOT HIREABLE'}</span>
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
              className={`neo-btn font-mono-tech text-xs font-bold px-3 py-1 ${selectedForCompare.length === 2
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
          onSelectToHire={(agent) => {
            const normalized = (agent.labels || []).map((l) => (l === 'monitoring' ? 'rebalancing' : l)) as CareerCategory[];
            const cat = selectedCategory !== 'all' && normalized.includes(selectedCategory) ? selectedCategory : (normalized[0] as CareerCategory) || 'rebalancing';
            setHireCategory(cat);
            setAgentToHire(agent);
          }}
        />
      )}

      {/* Hire Modal — HIRE giữ nguyên khi chưa thuê, ACTIVATE khi đã active được xử lý ở BottomBar/AgentHouse */}
      {agentToHire && (
        <HireModal
          agent={agentToHire}
          forcedCategory={hireCategory}
          buyerAddress={buyerAddress}
          onClose={() => {
            setAgentToHire(null);
            setHireCategory(null);
          }}
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
                  <span className="font-bold">
                    {(() => {
                      const raw = (inspectedAgent.rawJson || {}) as any;
                      const n = Number(raw.hourlyCostU);
                      return Number.isFinite(n) && n > 0 ? `${raw.hourlyCostU} $U/hr` : '—';
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A8A] text-[9px] block">DAILY ESTIMATE:</span>
                  <span className="font-bold">
                    {(() => {
                      const raw = (inspectedAgent.rawJson || {}) as any;
                      const n = Number(raw.hourlyCostU);
                      return Number.isFinite(n) && n > 0 ? `${(n * 24).toFixed(2)} $U/day` : 'quote on hire';
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A8A] text-[9px] block">ESCROW PROTOCOL:</span>
                  <span className="font-bold">
                    {inspectedAgent.x402Supported
                      ? 'X402'
                      : (inspectedAgent.supportedProtocols || []).includes('erc8183')
                        ? 'ERC-8183 Escrow'
                        : inspectedAgent.agentUri
                          ? 'A2A'
                          : '—'}
                  </span>
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
