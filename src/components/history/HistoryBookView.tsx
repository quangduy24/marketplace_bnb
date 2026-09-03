import React, { useState } from 'react';
import { HireData, AgentData, CareerCategory } from '../../types.ts';
import { getPixelSprite } from '../game/pixelAssets.ts';
import { BookOpen, ExternalLink, Filter, MapPin, Hash, CheckCircle2 } from 'lucide-react';

interface HistoryBookViewProps {
  hires: HireData[];
  agents: AgentData[];
  onFocusAgentInHouse: (category: CareerCategory) => void;
}

export const HistoryBookView: React.FC<HistoryBookViewProps> = ({
  hires,
  agents,
  onFocusAgentInHouse,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');

  const filteredHires = hires.filter((h) => {
    if (filterCategory !== 'all' && h.catalog !== filterCategory) return false;
    if (filterState !== 'all' && h.state !== filterState) return false;
    return true;
  });

  return (
    <div className="w-full h-[calc(100vh-120px)] min-h-[550px] bg-[#F4F0EA] p-3 sm:p-5 flex flex-col justify-between select-none overflow-hidden editorial-grid">
      {/* Ledger Container */}
      <div className="flex-1 neo-card bg-[#FFFFFF] p-4 sm:p-6 neo-shadow-lg flex flex-col overflow-hidden relative">
        {/* Ledger Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#121212] pb-3 mb-3 gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#A855F7] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-1.5 py-0.2">
                  LEDGER.03
                </span>
                <h2 className="font-display font-black text-xs sm:text-sm text-[#121212] uppercase tracking-tight">
                  ON-CHAIN HISTORY
                </h2>
              </div>
              <span className="font-mono-tech text-[10px] text-[#6A6A6A]">
                Verifiable ERC-8183 escrow locks & HTTP x402 micropayment settlements
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center space-x-2 font-mono-tech text-xs">
            <div className="flex items-center space-x-1.5 bg-[#FAF7F0] border-2 border-[#121212] px-2 py-1 neo-shadow-sm">
              <Filter className="w-3.5 h-3.5 text-[#6A6A6A]" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#121212] focus:outline-none uppercase"
              >
                <option value="all">ALL DISCIPLINES</option>
                <option value="monitoring">MONITORING</option>
                <option value="grid">GRID</option>
                <option value="health_factor">HEALTH FACTOR</option>
                <option value="yield">YIELD</option>
              </select>
            </div>

            <div className="bg-[#FAF7F0] border-2 border-[#121212] px-2 py-1 neo-shadow-sm">
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#121212] focus:outline-none uppercase"
              >
                <option value="all">ALL STATES</option>
                <option value="funded">FUNDED</option>
                <option value="running">RUNNING</option>
                <option value="submitted">SUBMITTED</option>
                <option value="paid">PAID</option>
                <option value="rejected">REJECTED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredHires.length === 0 ? (
            <div className="text-center py-16 font-mono-tech text-xs text-[#8A8A8A]">
              [NO ON-CHAIN AUDIT ENTRIES RECORDED UNDER THIS FILTER]
            </div>
          ) : (
            <table className="w-full text-left font-mono-tech text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-[#121212] bg-[#FAF7F0] text-[9px] text-[#121212] uppercase font-bold">
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-2">Discipline</th>
                  <th className="py-2.5 px-2">Payment Rail</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2">Deposit</th>
                  <th className="py-2.5 px-2">BSC Scan Proof</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0D8C8]">
                {filteredHires.map((hire) => {
                  const agent = agents.find((a) => a.agentId === hire.agentId);
                  const career = (hire.catalog || 'monitoring') as CareerCategory;
                  const spriteSrc = getPixelSprite(career);
                  const firstTx = hire.txs?.[0] || null;
                  const explorerBase =
                    hire.chainId === 56 ? 'https://bscscan.com/tx' : 'https://testnet.bscscan.com/tx';

                  const stateBadge =
                    hire.state === 'paid'
                      ? 'bg-[#00F59B] text-[#121212]'
                      : hire.state === 'submitted'
                      ? 'bg-[#FFE500] text-[#121212]'
                      : hire.state === 'running' || hire.state === 'funded'
                      ? 'bg-[#38BDF8] text-[#121212]'
                      : 'bg-[#FF4365] text-white';

                  return (
                    <tr key={hire.id} className="hover:bg-[#FAF7F0] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 bg-[#FAF7F0] border border-[#121212] flex items-center justify-center shrink-0">
                            <img
                              src={spriteSrc}
                              alt="agent"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = getPixelSprite(career, 'idle');
                              }}
                              className="w-6 h-6 object-contain"
                            />
                          </div>
                          <div>
                            <span className="font-display font-black text-xs text-[#121212] block">
                              {agent?.name || hire.agentId}
                            </span>
                            <span className="text-[10px] text-[#6A6A6A] block">
                              Job: {hire.jobId?.slice(0, 14)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-2">
                        <span className="neo-badge bg-[#FAF7F0] text-[#121212] text-[8px] px-1.5 py-0.2 uppercase">
                          {hire.catalog}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 font-bold text-[#121212]">
                        {hire.rail.toUpperCase()}
                      </td>

                      <td className="py-2.5 px-2">
                        <span className={`neo-badge text-[8px] px-1.5 py-0.2 font-black ${stateBadge}`}>
                          {hire.state.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 font-bold text-[#121212]">
                        {hire.budgetU} $U
                      </td>

                      <td className="py-2.5 px-2">
                        {firstTx ? (
                          <a
                            href={`${explorerBase}/${firstTx}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#2563EB] font-bold hover:underline flex items-center space-x-1"
                          >
                            <span>{firstTx.slice(0, 8)}...{firstTx.slice(-6)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[#A0A0A0]">— pending on-chain tx</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onFocusAgentInHouse(career)}
                          className="neo-btn bg-[#FFE500] text-[#121212] font-display font-black text-[10px] px-2.5 py-1 inline-flex items-center space-x-1 ml-auto"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>LOCATE</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Audit Summary */}
        <div className="border-t-2 border-[#121212] pt-2.5 mt-2 flex items-center justify-between text-[11px] font-mono-tech text-[#6A6A6A] shrink-0">
          <span>Total Recorded On-Chain Entries: <strong className="text-[#121212]">{filteredHires.length}</strong></span>
          <span className="font-medium text-[#2563EB]">Chain ID 97 (BSC Testnet) / 56 (BSC Mainnet)</span>
        </div>
      </div>
    </div>
  );
};
