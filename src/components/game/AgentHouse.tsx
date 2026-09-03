import React, { useState } from 'react';
import { HireData, AgentData, CareerCategory } from '../../types.ts';
import { getPixelSprite } from './pixelAssets.ts';
import { Shield, Sparkles, CheckCircle, AlertTriangle, Eye, ArrowRight, ExternalLink, Cpu, Zap, Activity } from 'lucide-react';

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

  const getHiresForChamber = (cat: CareerCategory): HireData[] => {
    return hires.filter((h) => {
      const c = (h.catalog || 'rebalancing') as string;
      const normalized = c === 'monitoring' ? 'rebalancing' : c;
      return normalized === cat && h.state !== 'cancelled';
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
                          : 'bg-[#FF4365] text-white'
                      }`}
                    >
                      Status: {hire.state.toUpperCase()}
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

                {/* Living Character Sprite or Empty State */}
                <div className="z-10 flex flex-col items-center justify-center shrink-0 min-w-[130px]">
                  {hire && agent ? (
                    <div className="flex flex-col items-center relative">
                      {hire.state === 'submitted' && (
                        <div className="neo-badge bg-[#FFE500] text-[#121212] text-[8px] px-1.5 py-0.5 mb-1 animate-bounce font-black">
                          ✓ PROOF SUBMITTED
                        </div>
                      )}

                      {isAlert && (
                        <div className="neo-badge bg-[#FF4365] text-white text-[8px] px-1.5 py-0.5 mb-1 font-black animate-pulse">
                          ! HEALTH FACTOR LOW !
                        </div>
                      )}

                      <div className="w-16 h-16 bg-[#FFFFFF] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center">
                        <img
                          src={getPixelSprite(chamber.id, spriteState)}
                          alt={agent.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getPixelSprite(chamber.id, 'idle');
                          }}
                          className={`w-12 h-12 object-contain ${
                            hire.state === 'running' || hire.state === 'funded'
                              ? 'animate-pulse'
                              : ''
                          }`}
                        />
                      </div>

                      <span className="font-display font-extrabold text-[11px] text-[#121212] mt-1 text-center truncate max-w-[120px] block">
                        {agent.name.split(' ')[0]}
                      </span>

                      <button
                        onClick={() => setSelectedJobToInspect(hire)}
                        className="neo-btn bg-[#FAF7F0] text-[#121212] hover:bg-[#FFE500] font-mono-tech text-[8px] font-bold px-2 py-0.5 mt-1"
                      >
                        VIEW DETAILS
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center p-2">
                      <div className="w-12 h-12 border-2 border-dashed border-[#121212] bg-[#F4F0EA] flex items-center justify-center mb-1">
                        <span className="font-mono-tech text-[9px] text-[#8A8A8A] font-bold">Empty</span>
                      </div>
                       <span className="font-mono-tech text-[10px] text-[#6A6A6A] mb-1.5">
                        No active agent
                      </span>
                      <button
                        onClick={onNavigateMarket}
                        className="neo-btn bg-[#FFE500] text-[#121212] font-display font-black text-[10px] px-2.5 py-1"
                      >
                        Browse Marketplace
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chamber Footer Action Strip */}
              {hire && (
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t-2 border-[#121212] text-xs font-mono-tech">
                  <span className="text-[#6A6A6A]">
                    Budget: <strong className="text-[#121212] font-black">{hire.budgetU} $U</strong> ({hire.rail.toUpperCase()})
                  </span>

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
                        onClick={() => onSyncJobState(hire.id, 'running', 'Agent listening to live BSC blocks')}
                        className="neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-[10px] px-2.5 py-0.5"
                      >
                        START
                      </button>
                    )}

                    {hire.state === 'running' && (
                      <button
                        onClick={() =>
                          onSyncJobState(
                            hire.id,
                            'submitted',
                            'Agent submitted proof of work to BSC'
                          )
                        }
                        className="neo-btn bg-[#FFE500] text-[#121212] font-display font-black text-[10px] px-2.5 py-0.5"
                      >
                        SUBMIT PROOF
                      </button>
                    )}

                    {hire.state === 'submitted' && (
                      <button
                        onClick={() =>
                          onSyncJobState(
                            hire.id,
                            'paid',
                            'Buyer released payment to agent upon proof verification'
                          )
                        }
                        className="neo-btn bg-[#38BDF8] text-[#121212] font-display font-black text-[10px] px-2.5 py-0.5"
                      >
                        RELEASE PAYMENT
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Inspect Job Modal */}
      {selectedJobToInspect && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="neo-card bg-[#FFFFFF] w-full max-w-lg p-5 neo-shadow-xl relative">
            <div className="flex items-center justify-between border-b-2 border-[#121212] pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-1.5 py-0.2">
                  Details
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

            <div className="space-y-2.5 font-mono-tech text-xs text-[#121212]">
              <div className="bg-[#FAF7F0] border-2 border-[#121212] p-3 space-y-1.5">
                <p><strong>Agent:</strong> {selectedJobToInspect.agentId}</p>
                <p><strong>Category:</strong> {selectedJobToInspect.catalog}</p>
                <p><strong>Payment:</strong> {selectedJobToInspect.rail.toUpperCase()}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className="neo-badge bg-[#121212] text-[#FFE500] text-[8px] px-1.5 py-0.2">
                    {selectedJobToInspect.state.toUpperCase()}
                  </span>
                </p>
                <p><strong>Deposit:</strong> {selectedJobToInspect.budgetU} $U</p>
                <p><strong>Last Action:</strong> {selectedJobToInspect.lastAction || 'Deposit funded'}</p>
              </div>

              {selectedJobToInspect.txs && selectedJobToInspect.txs.length > 0 && (
                <div className="mt-2">
                  <span className="font-bold block mb-1">ON-CHAIN PROOFS:</span>
                  <div className="space-y-1">
                    {selectedJobToInspect.txs.map((tx, idx) => (
                      <a
                        key={idx}
                        href={`${selectedJobToInspect.chainId === 56 ? 'https://bscscan.com/tx' : 'https://testnet.bscscan.com/tx'}/${tx}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#2563EB] hover:underline flex items-center space-x-1 font-bold"
                      >
                        <span>Tx #{idx + 1}: {tx.slice(0, 16)}...{tx.slice(-8)}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
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
