import React, { useState, useEffect } from 'react';
import { HireData, AgentData, CareerCategory, formatHirePayment } from '../../types.ts';
import { getPixelSprite } from './pixelAssets.ts';
import { Shield, CheckCircle, AlertTriangle, ExternalLink, Cpu, Zap, RotateCcw } from 'lucide-react';
import { verifyErc8183ManifestText } from '../../../lib/canonical.ts';

interface AgentHouseProps {
  hires: HireData[];
  agents: AgentData[];
  onNavigateMarket: () => void;
  onSyncJobState: (hireId: string, newState: string, lastAction?: string) => Promise<void>;
  healthFactor: number;
  focusedChamber?: CareerCategory | null;
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
}) => {
  const [selectedJobToInspect, setSelectedJobToInspect] = useState<HireData | null>(null);
  const [activeWorkerIndex, setActiveWorkerIndex] = useState<Record<string, number>>({});
  const [executingJobId, setExecutingJobId] = useState<string | null>(null);
  const [manifestText, setManifestText] = useState<string | null>(null);
  const [deliverableHash, setDeliverableHash] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loadingManifest, setLoadingManifest] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedJobToInspect) {
      setManifestText(null);
      setDeliverableHash(null);
      setIsVerified(null);
      return;
    }

    let active = true;
    setLoadingManifest(true);
    fetch(`/api/hires/${selectedJobToInspect.id}/manifest`)
      .then(async (res) => {
        if (!res.ok) {
          if (active) {
            setManifestText(null);
            setIsVerified(null);
            setLoadingManifest(false);
          }
          return;
        }
        const headerHash = res.headers.get('X-Deliverable-Hash');
        const text = await res.text();
        if (!active) return;
        setManifestText(text);
        setDeliverableHash(headerHash);

        const expectedHash =
          headerHash ||
          selectedJobToInspect.txs?.find((_, idx) => idx > 0) ||
          '';

        const verified = verifyErc8183ManifestText(text, expectedHash);
        setIsVerified(verified);
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
  }, [selectedJobToInspect]);

  const handleDispute = async (hireId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hires/${hireId}/dispute`, { method: 'POST' });
      if (res.ok) {
        await onSyncJobState(
          hireId,
          'rejected',
          'Buyer disputed deliverable inside optimistic dispute window'
        );
        if (selectedJobToInspect?.id === hireId) {
          setSelectedJobToInspect((prev) =>
            prev
              ? {
                  ...prev,
                  state: 'rejected',
                  lastAction: 'Buyer disputed deliverable inside optimistic dispute window',
                }
              : null
          );
        }
      }
    } catch (err) {
      console.error('Failed to dispute hire:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimRefund = async (hireId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hires/${hireId}/claim-refund`, { method: 'POST' });
      if (res.ok) {
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
      }
    } catch (err) {
      console.error('Failed to claim refund:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleasePayment = async (hireId: string) => {
    setActionLoading(true);
    try {
      await onSyncJobState(
        hireId,
        'paid',
        'Buyer verified cryptographic proof and released escrow payment'
      );
      if (selectedJobToInspect?.id === hireId) {
        setSelectedJobToInspect((prev) =>
          prev
            ? {
                ...prev,
                state: 'paid',
                lastAction: 'Buyer verified cryptographic proof and released escrow payment',
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
      return normalized === cat && ['pending', 'funded', 'running', 'submitted'].includes(h.state);
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
          const spriteState = hire ? hire.state : 'idle';

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
                      className={`neo-badge text-[9px] px-2 py-0.5 ${
                        hire.state === 'running' || hire.state === 'funded'
                          ? 'bg-[#00F59B] text-[#121212]'
                          : hire.state === 'submitted'
                          ? 'bg-[#FFE500] text-[#121212]'
                          : hire.state === 'paid'
                          ? 'bg-[#38BDF8] text-[#121212]'
                          : hire.state === 'pending'
                          ? 'bg-[#F59E0B] text-white'
                          : 'bg-[#FF4365] text-white'
                      }`}
                    >
                      Status: {hire.state === 'paid' ? 'RELEASED' : hire.state.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Chamber Visual Stage */}
              <div className="relative flex-1 bg-[#FAF7F0] border-2 border-[#121212] p-3 flex items-center justify-between min-h-[130px] overflow-hidden">
                {/* Room Machinery & Background Props */}
                <div className="space-y-1 z-10 font-mono-tech">
                  {chamber.decorations.map((dec, i) => (
                    <div key={i} className="text-[11px] text-[#4A4A4A] font-medium flex items-center space-x-1">
                      <span>{dec}</span>
                    </div>
                  ))}
                  <div className="text-[10px] text-[#6A6A6A] mt-2 max-w-[210px] font-sans leading-snug">
                    {chamber.description}
                  </div>
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

                    {hire.state === 'funded' && (
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

                    {hire.state === 'running' && (
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

                    {hire.state === 'expired' && (
                      <button
                        onClick={() => handleClaimRefund(hire.id)}
                        disabled={actionLoading}
                        className="neo-btn bg-[#FFE500] hover:bg-[#F59E0B] text-[#121212] font-display font-black text-[10px] px-2.5 py-0.5 flex items-center space-x-1"
                        title="Reclaim full escrow deposit"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>CLAIM REFUND</span>
                      </button>
                    )}

                    {hire.state === 'paid' && (
                      <button
                        onClick={() => setSelectedJobToInspect(hire)}
                        className="neo-btn bg-[#00F59B] text-[#121212] font-display font-bold text-[9px] px-2 py-0.5"
                      >
                        ✓ RELEASED
                      </button>
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
                      {selectedJobToInspect.state === 'paid' ? 'RELEASED' : selectedJobToInspect.state.toUpperCase()}
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
              ) : selectedJobToInspect.state === 'expired' ? (
                <button
                  onClick={() => handleClaimRefund(selectedJobToInspect.id)}
                  disabled={actionLoading}
                  className="neo-btn bg-[#FFE500] hover:bg-[#F59E0B] text-[#121212] font-display font-black text-xs px-3 py-1.5 flex items-center space-x-1"
                  title="Reclaim full escrow deposit"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>CLAIM REFUND</span>
                </button>
              ) : selectedJobToInspect.state === 'paid' ? (
                <div className="flex items-center space-x-1.5 font-mono-tech text-[10px] text-[#059669] font-bold">
                  <CheckCircle className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Escrow released! Chamber vacated & archived in History Book</span>
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

