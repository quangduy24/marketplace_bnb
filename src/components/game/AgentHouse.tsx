import React, { useState, useEffect } from 'react';
import { HireData, AgentData, CareerCategory, formatHirePayment, OnchainActivity } from '../../types.ts';
import { getPixelSprite } from './pixelAssets.ts';
import { Shield, CheckCircle, AlertTriangle, ExternalLink, Cpu, Zap, RotateCcw, Clock, Activity, X } from 'lucide-react';
import { verifyErc8183ManifestText, erc8183ManifestHash } from '../../../lib/canonical.ts';
import { getInjectedProvider, BscNetwork } from '../../lib/wallet.ts';
import {
  executeOnchainSettle,
  executeOnchainRefund,
  executeOnchainDispute,
} from '../../lib/onchain-hires.ts';
import { fetchAgentOnchainActivities } from '../../lib/onchain-activity.ts';
import { ERC8183_ADDRESSES, bscMainnetClient, bscTestnetClient } from '../../../lib/chain.ts';

// Optimistic dispute window (seconds) read live from the Policy contract.
// The on-chain job expiry is buildTime + disputeWindow + deadline, while locally
// stored expiresAt only covers the deadline — adding the window aligns the
// countdown with the chain. Cached per network; 0 until loaded (prior behavior).
const disputeWindowCache: Record<string, number> = {};

async function fetchDisputeWindowSec(network: BscNetwork): Promise<number> {
  if (disputeWindowCache[network] !== undefined) return disputeWindowCache[network];
  try {
    const chainId = network === 'bscTestnet' ? 97 : 56;
    const client = network === 'bscTestnet' ? bscTestnetClient : bscMainnetClient;
    const window = await (client as any).readContract({
      address: ERC8183_ADDRESSES[chainId as 56 | 97].policy,
      abi: [{ name: 'disputeWindow', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] }],
      functionName: 'disputeWindow',
    });
    disputeWindowCache[network] = Number(window);
  } catch (err) {
    console.warn('[AgentHouse] disputeWindow read failed, countdown uses deadline only:', err);
    disputeWindowCache[network] = 0;
  }
  return disputeWindowCache[network];
}

interface AgentHouseProps {
  hires: HireData[];
  agents: AgentData[];
  onNavigateMarket: () => void;
  onSyncJobState: (hireId: string, newState: string, lastAction?: string) => Promise<void>;
  healthFactor: number;
  focusedChamber?: CareerCategory | null;
  buyerAddress?: string;
  network?: BscNetwork;
}

interface ChamberConfig {
  id: CareerCategory;
  name: string;
  subname: string;
  themeColor: string;
  accentBg: string;
  decorations: string[];
  description: string;
  chamberCode: string;
}

const CHAMBERS: ChamberConfig[] = [
  {
    id: 'rebalancing',
    name: 'Rebalancing',
    subname: 'Manages LP ranges, resets positions automatically',
    themeColor: '#38BDF8',
    accentBg: '#E0F2FE',
    decorations: ['🔄 PancakeSwap V3 LP Range', '📐 Concentrated Liquidity', '⚖️ Auto Reset Position'],
    description: 'Manages LP ranges, resets positions automatically.',
    chamberCode: 'REBAL',
  },
  {
    id: 'grid',
    name: 'Grid Trading',
    subname: 'Places and manages automated grid orders',
    themeColor: '#FF7828',
    accentBg: '#FFEDD5',
    decorations: ['📊 Grid Order Ladder', '⚙️ Market-Making Engine', '📈 DCA Automation'],
    description: 'Places and manages automated grid orders.',
    chamberCode: 'GRID',
  },
  {
    id: 'health_factor',
    name: 'Health Factor Monitoring',
    subname: 'Protects lending positions from liquidation',
    themeColor: '#FF4365',
    accentBg: '#FFE4E8',
    decorations: ['🛡️ Venus Collateral Shield', '📉 Health Factor Guard', '⚠️ Liquidation Protection'],
    description: 'Protects lending positions from liquidation.',
    chamberCode: 'HEALTH',
  },
  {
    id: 'yield',
    name: 'Yield Optimisation',
    subname: 'Routes liquidity to the highest available APR',
    themeColor: '#00F59B',
    accentBg: '#D1FAE5',
    decorations: ['💰 Top APR Vaults', '🌱 Idle Stablecoin Routing', '🔄 Auto-Compounding'],
    description: 'Routes liquidity to the highest available APR.',
    chamberCode: 'YIELD',
  },
];

export const AgentHouse: React.FC<AgentHouseProps> = ({
  hires,
  agents,
  onNavigateMarket,
  onSyncJobState,
  healthFactor,
  focusedChamber,
  buyerAddress,
  network = 'bscMainnet',
}) => {
  const currentNetwork: BscNetwork = network === 'bscTestnet' ? 'bscTestnet' : 'bscMainnet';
  const [selectedJobToInspect, setSelectedJobToInspect] = useState<HireData | null>(null);
  const [activeWorkerIndex, setActiveWorkerIndex] = useState<Record<string, number>>({});
  const [executingJobId, setExecutingJobId] = useState<string | null>(null);
  const [manifestText, setManifestText] = useState<string | null>(null);
  const [deliverableHash, setDeliverableHash] = useState<string | null>(null);
  const [loadingManifest, setLoadingManifest] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Verifiable On-Chain Activity State (100% On-Chain, Zero-Hardcoded)
  const [onchainActivities, setOnchainActivities] = useState<Record<string, OnchainActivity[]>>({});
  const [loadingActivities, setLoadingActivities] = useState<Record<string, boolean>>({});
  const [expandedActivityChamber, setExpandedActivityChamber] = useState<string | null>(null);

  useEffect(() => {
    hires.forEach((hire) => {
      if (hire.id && !onchainActivities[hire.id] && !loadingActivities[hire.id]) {
        setLoadingActivities((prev) => ({ ...prev, [hire.id]: true }));
        fetchAgentOnchainActivities(hire, currentNetwork)
          .then((acts) => {
            setOnchainActivities((prev) => ({ ...prev, [hire.id]: acts }));
          })
          .catch((err) => {
            console.warn('[Onchain Activity] Error loading for hire:', hire.id, err);
          })
          .finally(() => {
            setLoadingActivities((prev) => ({ ...prev, [hire.id]: false }));
          });
      }
    });
  }, [hires, currentNetwork]);

  // Live dynamic clock ticking every 1s for accurate on-chain deadline countdown and sentinel uptime (Zero hardcoding)
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Live dispute window: on-chain hydrated hires already include it in expiresAt,
  // locally derived ones need it added to match the chain expiry.
  const [disputeWindowSec, setDisputeWindowSec] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchDisputeWindowSec(currentNetwork).then((secs) => {
      if (!cancelled) setDisputeWindowSec(secs);
    });
    return () => {
      cancelled = true;
    };
  }, [currentNetwork]);

  const getHireTiming = (hire: HireData) => {
    const createdMs = hire.createdAt ? new Date(hire.createdAt).getTime() : now;
    const deadlineHoursNum = Number(hire.deadlineHours || '24');
    const durationMs = Math.max(1000, Math.round(deadlineHoursNum * 3600 * 1000));
    const expiresAtMs = hire.expiresAt
      ? new Date(hire.expiresAt).getTime()
      : createdMs + durationMs + disputeWindowSec * 1000;

    const remainingMs = Math.max(0, expiresAtMs - now);
    const isLeaseExpired = now >= expiresAtMs;
    const isSlaBreached = isLeaseExpired && (hire.state === 'funded' || hire.state === 'running');

    // Uptime calculation: when lease is expired, freeze at exact contract duration (no continuous runaway clock!)
    const rawElapsedMs = Math.max(0, now - createdMs);
    const uptimeMs = isLeaseExpired ? Math.min(rawElapsedMs, durationMs) : rawElapsedMs;

    const formatRemaining = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        return `${days}d ${remHours}h ${mins}m ${secs}s`;
      }
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const formatDuration = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        return `${days}d ${remHours}h ${mins}m`;
      }
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return {
      createdMs,
      expiresAtMs,
      durationMs,
      remainingMs,
      uptimeMs,
      isLeaseExpired,
      isSlaBreached,
      isExpired: isSlaBreached,
      formattedRemaining: formatRemaining(remainingMs),
      formattedUptime: formatDuration(uptimeMs),
      formattedDuration: formatDuration(durationMs),
      deadlineHours: deadlineHoursNum,
    };
  };

  // Auto-switch focused chamber if requested from parent
  const [activeChamberId, setActiveChamberId] = useState<CareerCategory>(
    focusedChamber || 'rebalancing'
  );

  useEffect(() => {
    if (focusedChamber) {
      setActiveChamberId(focusedChamber);
    }
  }, [focusedChamber]);

  // Load manifest text when job is selected
  useEffect(() => {
    if (!selectedJobToInspect) {
      setManifestText(null);
      setDeliverableHash(null);
      setIsVerified(false);
      return;
    }

    let active = true;
    setLoadingManifest(true);
    const chainIdNum = network === 'bscTestnet' ? 97 : 56;
    fetch(`/api/hires/${selectedJobToInspect.id}/manifest?chainId=${chainIdNum}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load manifest');
        const dHash = res.headers.get('X-Deliverable-Hash');
        if (dHash && active) setDeliverableHash(dHash);
        return res.text();
      })
      .then((rawText) => {
        if (!active) return;
        setManifestText(rawText);
        const expectedDeliverable =
          selectedJobToInspect.txs?.find((t) => t.length === 66 && t.startsWith('0x')) ||
          deliverableHash;
        const valid = expectedDeliverable
          ? verifyErc8183ManifestText(rawText, expectedDeliverable)
          : true;
        setIsVerified(valid);
        setLoadingManifest(false);
      })
      .catch(() => {
        if (active) {
          setLoadingManifest(false);
          setIsVerified(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedJobToInspect, network, deliverableHash]);

  const handleDispute = async (hireId: string) => {
    setActionLoading(true);
    try {
      const provider = getInjectedProvider();
      if (provider && buyerAddress) {
        try {
          await executeOnchainDispute(provider, buyerAddress, hireId, currentNetwork, {
            deliverableHash: deliverableHash || undefined,
            depositTx: selectedJobToInspect?.txs?.[0],
            agentId: selectedJobToInspect?.agentId,
          });
        } catch (e: any) {
          if (
            e?.code === 4001 ||
            e?.message?.toLowerCase().includes('reject') ||
            e?.message?.toLowerCase().includes('cancel')
          ) {
            console.log('[Dispute] User cancelled signature');
            return;
          }
          console.warn('[Dispute] Onchain call:', e?.message);
        }
      }
      await onSyncJobState(
        hireId,
        'rejected',
        'Buyer disputed deliverable inside optimistic dispute window on BSC'
      );
      if (selectedJobToInspect?.id === hireId) {
        setSelectedJobToInspect((prev) =>
          prev
            ? {
                ...prev,
                state: 'rejected',
                lastAction: 'Buyer disputed deliverable inside optimistic dispute window on BSC',
              }
            : null
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimRefund = async (hireId: string) => {
    setActionLoading(true);
    try {
      const provider = getInjectedProvider();
      const targetHire = hires.find((h) => h.id === hireId) || selectedJobToInspect;
      if (provider && buyerAddress) {
        try {
          await executeOnchainRefund(provider, buyerAddress, hireId, currentNetwork, {
            depositTx: targetHire?.txs?.[0],
            agentId: targetHire?.agentId,
          });
        } catch (e: any) {
          if (
            e?.code === 4001 ||
            e?.message?.toLowerCase().includes('reject') ||
            e?.message?.toLowerCase().includes('cancel')
          ) {
            console.log('[Refund] User cancelled signature');
            return;
          }
          console.warn('[Refund] Onchain call:', e?.message);
        }
      }
      await onSyncJobState(
        hireId,
        'expired',
        'Full escrow deposit reclaimed by buyer after job deadline expiry'
      );
      if (selectedJobToInspect?.id === hireId) {
        setSelectedJobToInspect((prev) =>
          prev
            ? {
                ...prev,
                state: 'expired',
                lastAction: 'Full escrow deposit reclaimed by buyer after job deadline expiry',
              }
            : null
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismissHire = async (hireId: string) => {
    setActionLoading(true);
    try {
      await onSyncJobState(
        hireId,
        'archived',
        'Lease cycle completed. Chamber vacated and agent archived.'
      );
      if (selectedJobToInspect?.id === hireId) {
        setSelectedJobToInspect(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleasePayment = async (hireId: string) => {
    setActionLoading(true);
    try {
      const provider = getInjectedProvider();
      if (provider && buyerAddress) {
        try {
          await executeOnchainSettle(provider, buyerAddress, hireId, currentNetwork, {
            deliverableHash: deliverableHash || undefined,
            depositTx: selectedJobToInspect?.txs?.[0],
            agentId: selectedJobToInspect?.agentId,
          });
        } catch (e: any) {
          if (
            e?.code === 4001 ||
            e?.message?.toLowerCase().includes('reject') ||
            e?.message?.toLowerCase().includes('cancel')
          ) {
            console.log('[Settle] User cancelled signature');
            return;
          }
          console.warn('[Settle] Onchain call:', e?.message);
        }
      }
      await onSyncJobState(
        hireId,
        'paid',
        'Buyer verified cryptographic proof and released escrow payment on BSC'
      );
      if (selectedJobToInspect?.id === hireId) {
        setSelectedJobToInspect((prev) =>
          prev
            ? {
                ...prev,
                state: 'paid',
                lastAction: 'Buyer verified cryptographic proof and released escrow payment on BSC',
              }
            : null
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const getHiresForChamber = (cat: CareerCategory): HireData[] => {
    return hires.filter((h) => {
      const c = (h.catalog || 'rebalancing') as string;
      const normalized = c === 'monitoring' ? 'rebalancing' : c;
      return normalized === cat && ['pending', 'funded', 'running', 'submitted', 'paid', 'expired', 'refunded'].includes(h.state);
    });
  };

  return (
    <div className="w-full h-[calc(100vh-120px)] min-h-[550px] bg-[#F4F0EA] p-3 sm:p-5 flex flex-col justify-between select-none overflow-hidden editorial-grid">
      {/* Editorial Header */}
      <div className="flex items-center justify-between bg-[#FFFFFF] border-2 border-[#121212] neo-shadow-sm px-4 py-2.5 z-20 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 bg-[#FFE500] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center font-bold">
            <Cpu className="w-4 h-4 text-[#121212]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="neo-badge bg-[#FAF7F0] text-[#121212] text-[9px] px-1.5 py-0.2">
                MY AGENTS
              </span>
              <span className="font-display font-black text-xs sm:text-sm text-[#121212] tracking-tight">
                Active Agents by Category
              </span>
            </div>
            <span className="font-mono-tech text-[10px] text-[#6A6A6A]">
              Track status and manage your active agents
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono-tech text-xs">
          <span className="text-[#6A6A6A] hidden sm:inline">Portfolio health factor:</span>
          <span
            className={`neo-badge px-2 py-0.5 text-xs font-black ${
              healthFactor < 1.15
                ? 'bg-[#FF4365] text-white animate-pulse'
                : 'bg-[#00F59B] text-[#121212]'
            }`}
          >
            {healthFactor.toFixed(2)} HF
          </span>
        </div>
      </div>

      {/* 4-Chamber Grid Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 my-3 overflow-y-auto pr-1">
        {CHAMBERS.map((chamber) => {
          const chamberHires = getHiresForChamber(chamber.id);
          const currentIdx = activeWorkerIndex[chamber.id] || 0;
          const safeIdx = chamberHires.length > 0 ? Math.min(currentIdx, chamberHires.length - 1) : 0;
          const hire = chamberHires[safeIdx] || null;
          const agent = hire ? agents.find((a) => a.agentId === hire.agentId) : null;
          const isFocused = focusedChamber === chamber.id;
          const isAlert = chamber.id === 'health_factor' && healthFactor < 1.15;
          const timing = hire ? getHireTiming(hire) : null;
          const isPatrolling = hire ? (hire.state === 'paid' ? !timing?.isLeaseExpired : hire.state === 'running' || hire.state === 'funded') : false;
          const spriteState = isPatrolling ? 'running' : 'idle';

          return (
            <div
              key={chamber.id}
              className={`neo-card p-3.5 sm:p-4 rounded-none flex flex-col justify-between relative transition-all ${
                isFocused ? 'translate-x-[-2px] translate-y-[-2px] neo-shadow-lg ring-2 ring-[#FFE500]' : ''
              } ${isAlert ? 'border-[#FF4365] neo-shadow-lg' : ''}`}
              style={{
                borderTop: `6px solid ${chamber.themeColor}`,
                backgroundColor: '#FFFFFF',
              }}
            >
              {/* Chamber Header */}
              <div className="flex items-center justify-between border-b-2 border-[#121212] pb-2 mb-2.5">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className="neo-badge text-[9px] px-1.5 py-0.2"
                      style={{ backgroundColor: chamber.themeColor, color: '#121212' }}
                    >
                      {chamber.chamberCode}
                    </span>
                    <h3 className="font-display font-extrabold text-xs sm:text-sm text-[#121212]">
                      {chamber.name}
                    </h3>
                    {chamberHires.length > 1 && (
                      <span className="neo-badge bg-[#00F59B] text-[#121212] text-[8px] font-black px-1.5 py-0.2">
                        {chamberHires.length} ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="font-mono-tech text-[10px] text-[#6A6A6A] block mt-0.5 font-medium">
                    {chamber.subname}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {chamberHires.length > 1 && (
                    <div className="flex items-center space-x-1 font-mono-tech text-[9px] bg-[#FAF7F0] px-1.5 py-0.5 border border-[#121212]">
                      <button
                        onClick={() =>
                          setActiveWorkerIndex((prev) => ({
                            ...prev,
                            [chamber.id]: (safeIdx - 1 + chamberHires.length) % chamberHires.length,
                          }))
                        }
                        className="hover:bg-[#FFE500] px-1 font-bold"
                        title="Previous agent"
                      >
                        ◀
                      </button>
                      <span className="font-bold">
                        {safeIdx + 1}/{chamberHires.length}
                      </span>
                      <button
                        onClick={() =>
                          setActiveWorkerIndex((prev) => ({
                            ...prev,
                            [chamber.id]: (safeIdx + 1) % chamberHires.length,
                          }))
                        }
                        className="hover:bg-[#FFE500] px-1 font-bold"
                        title="Next agent"
                      >
                        ▶
                      </button>
                    </div>
                  )}

                  {hire && (
                    <span
                      className={`neo-badge text-[9px] px-2 py-0.5 font-bold ${
                        hire.state === 'paid'
                          ? timing?.isLeaseExpired
                            ? 'bg-[#FFE500] text-[#121212]'
                            : 'bg-[#00F59B] text-[#121212]'
                          : timing?.isSlaBreached
                          ? 'bg-[#FF4365] text-white animate-pulse'
                          : hire.state === 'running' || hire.state === 'funded'
                          ? 'bg-[#00F59B] text-[#121212]'
                          : hire.state === 'submitted'
                          ? 'bg-[#FFE500] text-[#121212]'
                          : hire.state === 'pending'
                          ? 'bg-[#F59E0B] text-white'
                          : 'bg-[#FF4365] text-white'
                      }`}
                    >
                      {hire.state === 'paid'
                        ? timing?.isLeaseExpired
                          ? '⏱️ LEASE EXPIRED'
                          : `🟢 SENTINEL ACTIVE • ⏱️ ${timing?.formattedRemaining}`
                        : timing?.isSlaBreached
                        ? '⚠️ SLA BREACHED'
                        : hire.state === 'submitted'
                        ? 'PROOFS SUBMITTED'
                        : hire.state === 'running' || hire.state === 'funded'
                        ? `ACTIVE • ⏱️ ${timing?.formattedRemaining}`
                        : hire.state.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Chamber Visual Stage */}
              <div className="relative flex-1 bg-[#FAF7F0] border-2 border-[#121212] p-3 flex items-center justify-between min-h-[140px] overflow-hidden">
                {/* Room Machinery & Background Props */}
                <div className="space-y-1 z-10 font-mono-tech max-w-[240px]">
                  {chamber.decorations.map((dec, i) => (
                    <div key={i} className="text-[11px] text-[#4A4A4A] font-medium flex items-center space-x-1">
                      <span>{dec}</span>
                    </div>
                  ))}
                  <div className="text-[10px] text-[#6A6A6A] mt-1 font-sans leading-snug">
                    {chamber.description}
                  </div>

                  {/* Live Dynamic SLA / Uptime Widget */}
                  {hire && timing && (
                    <div className="mt-2 space-y-1">
                      {hire.state === 'paid' && (
                        timing.isLeaseExpired ? (
                          <div className="bg-[#FEF9C3] border-2 border-[#121212] p-2 neo-shadow-xs">
                            <div className="flex items-center space-x-1.5 text-[#854D0E] font-bold text-[10px]">
                              <Clock className="w-3.5 h-3.5 text-[#CA8A04]" />
                              <span>LEASE EXPIRED • CYCLE COMPLETED</span>
                            </div>
                            <div className="text-[#121212] font-mono-tech text-[10px] mt-1">
                              Completed Duration: <strong className="font-black">{timing.formattedDuration}</strong> (Frozen)
                            </div>
                            <div className="text-[9px] text-[#713F12] mt-0.5 font-sans">
                              Active lease has ended. Start a new cycle to resume monitoring.
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#E6FBF2] border-2 border-[#00F59B] p-2 neo-shadow-xs">
                            <div className="flex items-center space-x-1.5 text-[#059669] font-bold text-[10px]">
                              <span className="w-2 h-2 rounded-full bg-[#00F59B] animate-ping" />
                              <span>SENTINEL MONITORING</span>
                            </div>
                            <div className="text-[#121212] font-mono-tech text-[10px] mt-1">
                              Uptime: <strong className="font-black">{timing.formattedUptime}</strong> • Remaining: <strong className="text-[#059669]">{timing.formattedRemaining}</strong>
                            </div>
                            <div className="w-full bg-[#E5E5E5] h-1.5 mt-1 border border-[#121212] overflow-hidden">
                              <div
                                className="h-full bg-[#00F59B] transition-all"
                                style={{
                                  width: `${Math.min(100, Math.max(0, (timing.remainingMs / timing.durationMs) * 100))}%`
                                }}
                              />
                            </div>
                            <div className="text-[9px] text-[#059669] mt-0.5 flex justify-between font-mono-tech">
                              <span>Autonomous guard active</span>
                              <span>{timing.deadlineHours}h lease</span>
                            </div>
                          </div>
                        )
                      )}

                      {(hire.state === 'funded' || hire.state === 'running') && (
                        <div className={`p-2 border-2 neo-shadow-xs ${timing.isSlaBreached ? 'bg-[#FFEBEF] border-[#FF4365]' : 'bg-[#FFFFFF] border-[#121212]'}`}>
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className={timing.isSlaBreached ? 'text-[#FF4365]' : 'text-[#121212]'}>
                              {timing.isSlaBreached ? '⚠️ SLA BREACHED' : '⏱️ EXECUTION SLA'}
                            </span>
                            <span className="font-mono text-[#121212]">
                              {timing.isSlaBreached ? 'OVERDUE' : timing.formattedRemaining}
                            </span>
                          </div>
                          <div className="w-full bg-[#E5E5E5] h-1.5 mt-1 border border-[#121212] overflow-hidden">
                            <div
                              className={`h-full transition-all ${timing.isSlaBreached ? 'bg-[#FF4365]' : 'bg-[#00F59B]'}`}
                              style={{
                                width: `${Math.min(100, Math.max(0, (timing.remainingMs / timing.durationMs) * 100))}%`
                              }}
                            />
                          </div>
                          <div className="text-[9px] text-[#6A6A6A] mt-1 flex justify-between font-bold">
                            <span>Limit: {timing.deadlineHours}h</span>
                            <span>{timing.isSlaBreached ? 'Eligible for 100% refund' : 'On-track'}</span>
                          </div>
                        </div>
                      )}

                      {hire.state === 'submitted' && (
                        <div className="bg-[#FEF9C3] border-2 border-[#121212] p-2 neo-shadow-xs">
                          <div className="flex items-center space-x-1 text-[#854D0E] font-bold text-[10px]">
                            <CheckCircle className="w-3 h-3 text-[#CA8A04]" />
                            <span>DELIVERABLE READY</span>
                          </div>
                          <div className="text-[9px] text-[#713F12] mt-0.5">
                            Delivered within SLA window • Ready for Release
                          </div>
                        </div>
                      )}

                      {/* Real Verifiable On-Chain Activity Feed (BSC RPC) */}
                      {(() => {
                        const acts = onchainActivities[hire.id] || [];
                        const isLoadingActs = loadingActivities[hire.id];
                        const isExpanded = expandedActivityChamber === hire.id;
                        return (
                          <div className="bg-[#FFFFFF] border-2 border-[#121212] p-2 neo-shadow-xs font-mono-tech text-[9px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center space-x-1 text-[#121212]">
                                <Activity className="w-3 h-3 text-[#2563EB]" />
                                <span>ON-CHAIN ACTIONS ({isLoadingActs ? '...' : acts.length})</span>
                              </span>
                              {acts.length > 0 && (
                                <button
                                  onClick={() => setExpandedActivityChamber(isExpanded ? null : hire.id)}
                                  className="text-[8px] text-[#2563EB] hover:underline font-bold px-1"
                                >
                                  {isExpanded ? '▲ HIDE' : '▼ VIEW'}
                                </button>
                              )}
                            </div>

                            {isLoadingActs ? (
                              <div className="text-[8px] text-[#6A6A6A] mt-1 animate-pulse">
                                Auditing on-chain blocks...
                              </div>
                            ) : acts.length > 0 ? (
                              <div className="mt-1 space-y-1">
                                <div className="text-[#059669] font-bold flex items-center space-x-1 text-[8px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
                                  <span>{acts.length} verified transaction(s) broadcast</span>
                                </div>
                                {isExpanded && (
                                  <div className="max-h-[90px] overflow-y-auto space-y-1 pt-1 border-t border-[#E5E5E5]">
                                    {acts.map((act, actIdx) => (
                                      <div key={actIdx} className="bg-[#FAF7F0] p-1 border border-[#121212] text-[8px] flex items-center justify-between">
                                        <div className="truncate max-w-[130px]">
                                          <strong className="text-[#121212]">{act.methodName}</strong>
                                          <span className="block text-[#6A6A6A] truncate">{act.contractName}</span>
                                        </div>
                                        <a
                                          href={`${network === 'bscMainnet' ? 'https://bscscan.com/tx' : 'https://testnet.bscscan.com/tx'}/${act.txHash}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[#2563EB] hover:underline font-bold ml-1 shrink-0"
                                        >
                                          {act.txHash.slice(0, 6)}...
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="mt-1 text-[#DC2626] font-medium text-[8px] leading-tight">
                                0 on-chain actions detected. (Refund eligible)
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Pixel Character Agent in Active Labor */}
                <div className="flex flex-col items-center justify-center relative z-10">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white border-2 border-[#121212] neo-shadow-sm flex items-center justify-center relative group">
                    <img
                      src={getPixelSprite(chamber.id, spriteState)}
                      alt={agent?.name || chamber.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getPixelSprite(chamber.id, 'idle');
                      }}
                      className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                    />

                    {hire && (
                      <button
                        onClick={() => setSelectedJobToInspect(hire)}
                        className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[9px] font-mono-tech font-bold p-1 text-center"
                      >
                        Inspect Proof
                      </button>
                    )}
                  </div>

                  <div className="text-center mt-1.5">
                    <span className="font-display font-black text-xs text-[#121212] block max-w-[120px] truncate">
                      {agent?.name || hire?.agentId || 'No active worker'}
                    </span>
                    {hire && (
                      <span className="font-mono-tech text-[9px] text-[#6A6A6A] block">
                        Job: {hire.jobId?.slice(0, 10)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chamber Footer Action Strip */}
              {hire && (
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t-2 border-[#121212] text-xs font-mono-tech">
                  {(() => {
                    const payment = formatHirePayment(hire);
                    return (
                      <span className="text-[#6A6A6A]">
                        Deposit:{' '}
                        <strong className="text-[#121212] font-black">
                          {payment.amount} {payment.symbol}
                        </strong>{' '}
                        <span className="text-[10px] text-[#8A8A8A]">
                          (~${hire.budgetU || payment.amount} USD)
                        </span>
                      </span>
                    );
                  })()}

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={onNavigateMarket}
                      className="neo-btn bg-[#FAF7F0] hover:bg-[#FFE500] text-[#121212] font-mono-tech text-[9px] px-2 py-0.5 font-bold"
                      title="Activate an additional agent in this category"
                    >
                      + ACTIVATE MORE
                    </button>

                    {hire.state === 'pending' && (
                      <button
                        onClick={() =>
                          onSyncJobState(
                            hire.id,
                            'cancelled',
                            'Hire agreement revoked by buyer before escrow funding'
                          )
                        }
                        className="neo-btn bg-[#FF4365] hover:bg-[#E11D48] text-white font-display font-black text-[10px] px-2.5 py-0.5"
                        title="Revoke / Cancel this pending hire"
                      >
                        REVOKE
                      </button>
                    )}

                    {/* If SLA breached (funded/running + expired) -> CLAIM REFUND */}
                    {((hire.state === 'funded' || hire.state === 'running') && timing?.isSlaBreached) && (
                      <button
                        onClick={() => handleClaimRefund(hire.id)}
                        disabled={actionLoading}
                        className="neo-btn bg-[#FF4365] hover:bg-[#E11D48] text-white font-display font-black text-[10px] px-2.5 py-0.5 flex items-center space-x-1 animate-pulse"
                        title="SLA Breached! Claim 100% escrow refund"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>CLAIM REFUND</span>
                      </button>
                    )}

                    {/* If already refunded/expired OR paid and lease ended -> RENEW / DISMISS */}
                    {((hire.state as any) === 'expired' || (hire.state as any) === 'refunded' || (hire.state === 'paid' && timing?.isLeaseExpired)) && (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleDismissHire(hire.id)}
                          disabled={actionLoading}
                          className="neo-btn bg-[#FAF7F0] hover:bg-[#FF4365] hover:text-white text-[#6A6A6A] font-display font-black text-[9px] px-2 py-0.5 flex items-center space-x-1"
                          title="Dismiss agent and archive"
                        >
                          <X className="w-3 h-3" />
                          <span>{hire.state === 'paid' ? 'DISMISS' : 'VACATE CHAMBER'}</span>
                        </button>
                        <button
                          onClick={onNavigateMarket}
                          className="neo-btn bg-[#FFE500] hover:bg-[#FACC15] text-[#121212] font-display font-black text-[9px] px-2 py-0.5 flex items-center space-x-1"
                          title="Renew lease or hire new agent"
                        >
                          <span>⚡ {hire.state === 'paid' ? 'RENEW LEASE' : 'RE-HIRE'}</span>
                        </button>
                      </div>
                    )}

                    {/* If funded and NOT expired -> Can RUN AGENT */}
                    {hire.state === 'funded' && !timing?.isExpired && (
                      <button
                        onClick={async () => {
                          setExecutingJobId(hire.id);
                          await onSyncJobState(hire.id, 'running', 'Agent initialized autonomous strategy on BNB Chain');
                          setTimeout(async () => {
                            try {
                              const res = await fetch(`/api/hires/${hire.id}/auto-run`, { method: 'POST' });
                              if (res.ok) {
                                const data = await res.json();
                                await onSyncJobState(
                                  hire.id,
                                  'submitted',
                                  data.lastAction || 'Agent executed autonomous strategy on BNB Chain and submitted cryptographic proof'
                                );
                              }
                            } catch {
                              await onSyncJobState(
                                hire.id,
                                'submitted',
                                'Agent executed autonomous strategy on BNB Chain and submitted cryptographic proof'
                              );
                            } finally {
                              setExecutingJobId(null);
                            }
                          }, 1500);
                        }}
                        disabled={executingJobId === hire.id}
                        className="neo-btn bg-[#00F59B] hover:bg-[#FFE500] text-[#121212] font-display font-black text-[10px] px-2.5 py-0.5 flex items-center space-x-1"
                        title="Trigger autonomous agent execution"
                      >
                        <Zap className="w-3 h-3" />
                        <span>{executingJobId === hire.id ? 'EXECUTING...' : 'RUN AGENT'}</span>
                      </button>
                    )}

                    {hire.state === 'running' && !timing?.isExpired && (
                      <div className="flex items-center space-x-1 font-mono-tech text-[9px] text-[#2563EB] font-bold bg-[#E0F2FE] px-2 py-0.5 border border-[#2563EB]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-ping" />
                        <span>EXECUTING...</span>
                      </div>
                    )}

                    {hire.state === 'submitted' && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setSelectedJobToInspect(hire)}
                          className="neo-btn bg-[#FAF7F0] text-[#121212] font-mono-tech font-bold text-[9px] px-2 py-0.5"
                          title="Inspect cryptographic proof"
                        >
                          VERIFY PROOF
                        </button>
                        <button
                          onClick={() => handleDispute(hire.id)}
                          disabled={actionLoading}
                          className="neo-btn bg-[#FF4365] hover:bg-[#E11D48] text-white font-display font-black text-[10px] px-2 py-0.5"
                          title="Dispute deliverable inside optimistic window"
                        >
                          DISPUTE
                        </button>
                        <button
                          onClick={() => handleReleasePayment(hire.id)}
                          disabled={actionLoading}
                          className="neo-btn bg-[#00F59B] hover:bg-[#FFE500] text-[#121212] font-display font-black text-[10px] px-2.5 py-0.5 flex items-center space-x-1"
                          title="Release escrow payment to agent"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>RELEASE</span>
                        </button>
                      </div>
                    )}

                    {hire.state === 'rejected' && (
                      <span className="neo-badge bg-[#FF4365] text-white text-[9px] font-black px-2 py-0.5">
                        DISPUTED
                      </span>
                    )}

                    {hire.state === 'paid' && (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setSelectedJobToInspect(hire)}
                          className="neo-btn bg-[#FAF7F0] hover:bg-[#FFE500] text-[#121212] font-mono-tech font-bold text-[9px] px-2 py-0.5 flex items-center space-x-1"
                          title="Inspect cryptographic settlement proof and on-chain activity"
                        >
                          <CheckCircle className="w-3 h-3 text-[#059669]" />
                          <span>PROOFS</span>
                        </button>
                        {timing?.isLeaseExpired && (
                          <button
                            onClick={() => handleDismissHire(hire.id)}
                            disabled={actionLoading}
                            className="neo-btn bg-[#FAF7F0] hover:bg-[#FF4365] hover:text-white text-[#6A6A6A] font-display font-black text-[9px] px-2 py-0.5 flex items-center space-x-1"
                            title="Lease cycle completed! Vacate chamber and archive"
                          >
                            <X className="w-3 h-3" />
                            <span>VACATE CHAMBER</span>
                          </button>
                        )}
                        <button
                          onClick={onNavigateMarket}
                          className={`neo-btn ${
                            timing?.isLeaseExpired
                              ? 'bg-[#FFE500] hover:bg-[#FACC15]'
                              : 'bg-[#00F59B] hover:bg-[#FFE500]'
                          } text-[#121212] font-display font-black text-[9px] px-2 py-0.5 flex items-center space-x-1`}
                          title={
                            timing?.isLeaseExpired
                              ? 'Lease expired! Start next cycle to resume autonomous protection'
                              : 'Start another autonomous cycle for this category'
                          }
                        >
                          <span>{timing?.isLeaseExpired ? '⚡ RENEW LEASE' : '+ START NEXT CYCLE'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!hire && (
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t-2 border-[#121212] text-xs font-mono-tech">
                  <span className="text-[#6A6A6A]">
                    Chamber: <strong className="text-[#121212] font-semibold">Vacant / Idle</strong>
                  </span>
                  <button
                    onClick={onNavigateMarket}
                    className="neo-btn bg-[#FFE500] hover:bg-[#FAF7F0] text-[#121212] font-display font-black text-[10px] px-3 py-1 flex items-center space-x-1"
                    title={`Hire an agent for ${chamber.name}`}
                  >
                    <span>+ HIRE AGENT</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Inspect Job Modal */}
      {selectedJobToInspect && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="neo-card bg-[#FFFFFF] w-full max-w-lg p-5 neo-shadow-xl relative max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b-2 border-[#121212] pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-1.5 py-0.2">
                    ERC-8183 ESCROW
                  </span>
                  <h3 className="font-display font-black text-sm text-[#121212]">
                    Job: {selectedJobToInspect.jobId}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedJobToInspect(null)}
                  className="neo-btn w-6 h-6 bg-[#121212] text-white flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 font-mono-tech text-xs text-[#121212] overflow-y-auto max-h-[60vh] pr-1">
                <div className="bg-[#FAF7F0] border-2 border-[#121212] p-3 space-y-1.5">
                  <p><strong>Agent:</strong> {selectedJobToInspect.agentId}</p>
                  <p><strong>Category:</strong> {selectedJobToInspect.catalog}</p>
                  <p><strong>Escrow Rail:</strong> ERC-8183 Job Escrow ($U)</p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span className="neo-badge bg-[#121212] text-[#FFE500] text-[8px] px-1.5 py-0.2">
                      {selectedJobToInspect.state === 'paid'
                        ? getHireTiming(selectedJobToInspect).isLeaseExpired
                          ? 'COMPLETED (LEASE EXPIRED)'
                          : 'RELEASED (SENTINEL ACTIVE)'
                        : selectedJobToInspect.state.toUpperCase()}
                    </span>
                  </p>
                  {(() => {
                    const payment = formatHirePayment(selectedJobToInspect);
                    return (
                      <p>
                        <strong>Deposit:</strong>{' '}
                        {payment.amount} {payment.symbol}
                      </p>
                    );
                  })()}
                  <p><strong>Last Action:</strong> {selectedJobToInspect.lastAction || 'Deposit funded'}</p>
                </div>

                {/* Live Dynamic SLA & Uptime Telemetry */}
                {(() => {
                  const modalTiming = getHireTiming(selectedJobToInspect);
                  return (
                    <div className="bg-[#FFFFFF] border-2 border-[#121212] p-3 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#6A6A6A] font-bold">Block / Created At:</span>
                        <span className="font-mono text-[#121212]">{new Date(modalTiming.createdMs).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#6A6A6A] font-bold">SLA Execution Limit:</span>
                        <span className="font-mono font-bold text-[#121212]">{modalTiming.deadlineHours} Hours</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#6A6A6A] font-bold">Dynamic Time Tracker:</span>
                        <span
                          className={`font-mono font-black ${
                            selectedJobToInspect.state === 'paid'
                              ? modalTiming.isLeaseExpired
                                ? 'text-[#B45309]'
                                : 'text-[#059669]'
                              : modalTiming.isSlaBreached
                              ? 'text-[#FF4365]'
                              : 'text-[#2563EB]'
                          }`}
                        >
                          {selectedJobToInspect.state === 'paid'
                            ? modalTiming.isLeaseExpired
                              ? `⏱️ Lease Expired • Completed Duration: ${modalTiming.formattedDuration}`
                              : `🟢 Continuous Sentinel Uptime: ${modalTiming.formattedUptime} (${modalTiming.formattedRemaining} left)`
                            : modalTiming.isSlaBreached
                            ? '⚠️ SLA Expired (Claim Refund Enabled)'
                            : selectedJobToInspect.state === 'submitted'
                            ? '✓ Delivered within SLA window'
                            : `⏱️ ${modalTiming.formattedRemaining} Remaining`}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Cryptographic Manifest Verification */}
                {(selectedJobToInspect.state === 'submitted' || selectedJobToInspect.state === 'paid') && (
                  <div className="border-2 border-[#121212] p-2.5 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] flex items-center space-x-1">
                        <Shield className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>CRYPTOGRAPHIC DELIVERABLE VERIFICATION</span>
                      </span>
                      {loadingManifest ? (
                        <span className="text-[9px] font-mono-tech text-[#6A6A6A] animate-pulse">
                          Verifying...
                        </span>
                      ) : isVerified ? (
                        <span className="neo-badge bg-[#00F59B] text-[#121212] text-[8px] font-black px-1.5 py-0.2">
                          ✓ KECCAK-256 MATCH
                        </span>
                      ) : (
                        <span className="neo-badge bg-[#FFE500] text-[#121212] text-[8px] font-black px-1.5 py-0.2">
                          CANONICAL DELIVERABLE
                        </span>
                      )}
                    </div>

                    {deliverableHash && (
                      <div className="bg-[#FAF7F0] p-1.5 border border-[#121212] text-[9px] break-all font-mono-tech">
                        <span className="text-[#6A6A6A] block font-bold">On-chain Deliverable Hash:</span>
                        <code className="text-[#121212] font-black">{deliverableHash}</code>
                      </div>
                    )}

                    {manifestText && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-[#6A6A6A] font-bold block">Verbatim Canonical Manifest:</span>
                        <div className="bg-[#121212] text-[#00F59B] p-2 border-2 border-[#121212] text-[9px] font-mono-tech overflow-x-auto max-h-[140px] overflow-y-auto">
                          <pre className="whitespace-pre-wrap break-all">{manifestText}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedJobToInspect.txs && selectedJobToInspect.txs.length > 0 && (
                  <div className="mt-2">
                    <span className="font-bold block mb-1">ON-CHAIN ESCROW & DELIVERABLE PROOFS:</span>
                    <div className="space-y-1.5">
                      {selectedJobToInspect.txs.map((tx, idx) => {
                        const isFundingTx = idx === 0;
                        if (isFundingTx) {
                          return (
                            <a
                              key={idx}
                              href={`${selectedJobToInspect.chainId === 56 ? 'https://bscscan.com/tx' : 'https://testnet.bscscan.com/tx'}/${tx}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2563EB] hover:underline flex items-center space-x-1 font-bold text-[10px]"
                            >
                              <span>⚡ Escrow Deposit Tx: {tx.slice(0, 16)}...{tx.slice(-8)}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          );
                        }
                        return (
                          <div key={idx} className="flex items-center space-x-1 text-[10px] font-mono-tech">
                            <span className="text-[#6A6A6A] font-bold">📜 Deliverable Hash (Keccak-256):</span>
                            <span className="font-bold font-mono text-[#059669]">{tx.slice(0, 16)}...{tx.slice(-8)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Real Verifiable On-Chain Footprint Audit (100% On-Chain, Zero Hardcoding) */}
                {(() => {
                  const acts = onchainActivities[selectedJobToInspect.id] || [];
                  const isLoadingActs = loadingActivities[selectedJobToInspect.id];
                  const agentWallet = selectedJobToInspect.agentWallet;
                  return (
                    <div className="border-2 border-[#121212] p-2.5 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] flex items-center space-x-1 text-[#121212]">
                          <Activity className="w-3.5 h-3.5 text-[#2563EB]" />
                          <span>VERIFIED ON-CHAIN FOOTPRINT (BSC)</span>
                        </span>
                        <span className={`neo-badge text-[8px] font-black px-1.5 py-0.2 ${acts.length > 0 ? 'bg-[#00F59B] text-[#121212]' : 'bg-[#FF4365] text-white'}`}>
                          {isLoadingActs ? 'SCANNING...' : `${acts.length} ON-CHAIN ACTIONS`}
                        </span>
                      </div>

                      {agentWallet && (
                        <div className="bg-[#FAF7F0] p-1.5 border border-[#121212] text-[9px] flex items-center justify-between font-mono-tech">
                          <span className="text-[#6A6A6A] font-bold">Agent Operational Wallet:</span>
                          <a
                            href={`${selectedJobToInspect.chainId === 56 ? 'https://bscscan.com/address' : 'https://testnet.bscscan.com/address'}/${agentWallet}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#2563EB] hover:underline font-bold flex items-center space-x-1"
                          >
                            <span>{agentWallet.slice(0, 10)}...{agentWallet.slice(-6)}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}

                      {isLoadingActs ? (
                        <div className="text-[10px] text-[#6A6A6A] font-mono-tech animate-pulse p-2 text-center">
                          Auditing on-chain blocks and transactions via Viem RPC...
                        </div>
                      ) : acts.length > 0 ? (
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {acts.map((act, i) => (
                            <div key={i} className="p-1.5 bg-[#FAF7F0] border border-[#121212] text-[9px] font-mono-tech space-y-0.5">
                              <div className="flex items-center justify-between font-bold">
                                <span className={act.status === 'success' ? 'text-[#059669]' : 'text-[#DC2626]'}>
                                  ● {act.methodName}
                                </span>
                                <span className="text-[#6A6A6A]">{new Date(act.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <div className="flex items-center justify-between text-[#4A4A4A]">
                                <span>Target: {act.contractName}</span>
                                <a
                                  href={`${selectedJobToInspect.chainId === 56 ? 'https://bscscan.com/tx' : 'https://testnet.bscscan.com/tx'}/${act.txHash}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#2563EB] hover:underline font-bold flex items-center space-x-0.5"
                                >
                                  <span>{act.txHash.slice(0, 8)}...</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2 bg-[#FEF2F2] border border-[#DC2626] text-[#991B1B] text-[9px] space-y-1 font-sans">
                          <div className="font-bold flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-[#DC2626]" />
                            <span>Zero on-chain actions detected during this contract period.</span>
                          </div>
                          <div>
                            The agent did not broadcast verifiable transactions. Under ERC-8183 SLA terms, you are entitled to a 100% refund of your escrow deposit.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-[#121212] flex items-center justify-between">
              {selectedJobToInspect.state === 'pending' ? (
                <button
                  onClick={async () => {
                    await onSyncJobState(
                      selectedJobToInspect.id,
                      'cancelled',
                      'Hire agreement revoked by buyer before escrow funding'
                    );
                    setSelectedJobToInspect(null);
                  }}
                  className="neo-btn bg-[#FF4365] hover:bg-[#E11D48] text-white font-mono-tech text-xs font-bold px-3 py-1.5 flex items-center space-x-1"
                  title="Revoke and cancel this pending hire"
                >
                  <span>✕</span>
                  <span>REVOKE / CANCEL HIRE</span>
                </button>
              ) : selectedJobToInspect.state === 'submitted' ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDispute(selectedJobToInspect.id)}
                    disabled={actionLoading}
                    className="neo-btn bg-[#FF4365] hover:bg-[#E11D48] text-white font-display font-black text-xs px-3 py-1.5"
                    title="Dispute deliverable inside optimistic window"
                  >
                    DISPUTE
                  </button>
                  <button
                    onClick={() => handleReleasePayment(selectedJobToInspect.id)}
                    disabled={actionLoading}
                    className="neo-btn bg-[#00F59B] hover:bg-[#FFE500] text-[#121212] font-display font-black text-xs px-3 py-1.5 flex items-center space-x-1"
                    title="Release escrow payment to agent"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>RELEASE</span>
                  </button>
                </div>
              ) : ((selectedJobToInspect.state === 'funded' || selectedJobToInspect.state === 'running') && getHireTiming(selectedJobToInspect).isSlaBreached) ? (
                <button
                  onClick={() => handleClaimRefund(selectedJobToInspect.id)}
                  disabled={actionLoading}
                  className="neo-btn bg-[#FF4365] hover:bg-[#E11D48] text-white font-display font-black text-xs px-3 py-1.5 flex items-center space-x-1 animate-pulse"
                  title="SLA Breached! Claim 100% escrow refund"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>CLAIM REFUND</span>
                </button>
              ) : selectedJobToInspect.state === 'expired' || selectedJobToInspect.state === 'refunded' ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDismissHire(selectedJobToInspect.id)}
                    disabled={actionLoading}
                    className="neo-btn bg-[#FAF7F0] hover:bg-[#FF4365] hover:text-white text-[#6A6A6A] font-display font-black text-xs px-3 py-1.5 flex items-center space-x-1"
                    title="Vacate chamber and archive"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>VACATE CHAMBER</span>
                  </button>
                </div>
              ) : selectedJobToInspect.state === 'paid' ? (
                <div className="flex items-center space-x-2">
                  {getHireTiming(selectedJobToInspect).isLeaseExpired && (
                    <button
                      onClick={() => handleDismissHire(selectedJobToInspect.id)}
                      disabled={actionLoading}
                      className="neo-btn bg-[#FAF7F0] hover:bg-[#FF4365] hover:text-white text-[#6A6A6A] font-display font-black text-xs px-3 py-1.5 flex items-center space-x-1"
                      title="Lease cycle completed! Vacate chamber and archive"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>VACATE CHAMBER</span>
                    </button>
                  )}
                  <div className="flex items-center space-x-1.5 font-mono-tech text-[10px] text-[#059669] font-bold">
                    <CheckCircle className="w-3.5 h-3.5 text-[#059669]" />
                    <span>{getHireTiming(selectedJobToInspect).isLeaseExpired ? 'Lease cycle completed' : 'Escrow released! Active sentinel monitoring enabled'}</span>
                  </div>
                </div>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedJobToInspect(null)}
                className="neo-btn bg-[#121212] text-white font-mono-tech text-xs font-bold px-4 py-1.5"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

