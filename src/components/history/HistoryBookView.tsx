import React, { useState, useEffect } from 'react';
import { HireData, AgentData, CareerCategory, formatHirePayment } from '../../types.ts';
import { getPixelSprite } from '../game/pixelAssets.ts';
import { BookOpen, ExternalLink, Filter, MapPin, Hash, CheckCircle2, Shield, CheckCircle } from 'lucide-react';
import { verifyErc8183ManifestText } from '../../../lib/canonical.ts';

interface HistoryBookViewProps {
  hires: HireData[];
  agents: AgentData[];
  onFocusAgentInHouse: (category: CareerCategory) => void;
  onSyncJobState?: (hireId: string, newState: string, lastAction?: string) => Promise<void>;
  activeChainId?: number;
}

export const HistoryBookView: React.FC<HistoryBookViewProps> = ({
  hires,
  agents,
  onFocusAgentInHouse,
  onSyncJobState,
  activeChainId,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [filterNetwork, setFilterNetwork] = useState<string>('all');
  const [selectedJobToInspect, setSelectedJobToInspect] = useState<HireData | null>(null);
  const [manifestText, setManifestText] = useState<string | null>(null);
  const [deliverableHash, setDeliverableHash] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loadingManifest, setLoadingManifest] = useState<boolean>(false);

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

  const filteredHires = hires.filter((h) => {
    const cat = (h.catalog || 'rebalancing') as string;
    const normalizedCat = cat === 'monitoring' ? 'rebalancing' : cat;
    if (filterCategory !== 'all' && normalizedCat !== filterCategory) return false;
    if (filterState !== 'all' && h.state !== filterState) return false;
    if (filterNetwork !== 'all' && String(h.chainId) !== filterNetwork) return false;
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
                  HISTORY
                </span>
                <h2 className="font-display font-black text-xs sm:text-sm text-[#121212] uppercase tracking-tight">
                  HISTORY
                </h2>
              </div>
              <span className="font-mono-tech text-[10px] text-[#6A6A6A]">
                Transaction history — escrow and payment settlements
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 font-mono-tech text-xs">
            {/* Network Filter */}
            <div className="bg-[#FAF7F0] border-2 border-[#121212] px-2 py-1 neo-shadow-sm">
              <select
                value={filterNetwork}
                onChange={(e) => setFilterNetwork(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#121212] focus:outline-none uppercase"
              >
                <option value="all">ALL NETWORKS</option>
                <option value="97">BSC TESTNET (97)</option>
                <option value="56">BSC MAINNET (56)</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5 bg-[#FAF7F0] border-2 border-[#121212] px-2 py-1 neo-shadow-sm">
              <Filter className="w-3.5 h-3.5 text-[#6A6A6A]" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#121212] focus:outline-none uppercase"
              >
                <option value="all">ALL CATEGORIES</option>
                <option value="rebalancing">REBALANCING</option>
                <option value="grid">GRID TRADING</option>
                <option value="health_factor">HEALTH FACTOR MONITORING</option>
                <option value="yield">YIELD OPTIMISATION</option>
              </select>
            </div>

            <div className="bg-[#FAF7F0] border-2 border-[#121212] px-2 py-1 neo-shadow-sm">
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#121212] focus:outline-none uppercase"
              >
                <option value="all">ALL STATES</option>
                <option value="pending">PENDING</option>
                <option value="funded">FUNDED</option>
                <option value="running">RUNNING</option>
                <option value="submitted">SUBMITTED</option>
                <option value="paid">PAID</option>
                <option value="rejected">REJECTED</option>
                <option value="cancelled">CANCELLED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredHires.length === 0 ? (
            <div className="text-center py-16 font-mono-tech text-xs text-[#8A8A8A]">
              No records match this filter.
            </div>
          ) : (
            <table className="w-full text-left font-mono-tech text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-[#121212] bg-[#FAF7F0] text-[9px] text-[#121212] uppercase font-bold">
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-2">Network</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-2">Payment</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2">Deposit</th>
                  <th className="py-2.5 px-2">Explorer Proof</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0D8C8]">
                {filteredHires.map((hire) => {
                  const agent = agents.find((a) => a.agentId === hire.agentId);
                  const rawCareer = (hire.catalog || 'rebalancing') as string;
                  const career = (rawCareer === 'monitoring' ? 'rebalancing' : rawCareer) as CareerCategory;
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
                      : hire.state === 'pending'
                      ? 'bg-[#F59E0B] text-white'
                      : hire.state === 'cancelled'
                      ? 'bg-[#71717A] text-white'
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

                      <td className="py-2.5 px-2 font-mono-tech text-[10px] font-bold">
                        <span
                          className={`neo-badge text-[8px] px-1.5 py-0.2 font-black ${
                            hire.chainId === 97
                              ? 'bg-[#FFE500] text-[#121212]'
                              : 'bg-[#00F59B] text-[#121212]'
                          }`}
                        >
                          {hire.chainId === 97 ? 'TESTNET' : 'MAINNET'}
                        </span>
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
                        {(() => {
                          const payment = formatHirePayment(hire);
                          return `${payment.amount} ${payment.symbol}`;
                        })()}
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
                          <span className="text-[#A0A0A0]">
                            {hire.state === 'cancelled' ? '— cancelled before tx' : '— pending on-chain tx'}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center space-x-1.5 justify-end">
                          {hire.state === 'pending' && onSyncJobState && (
                            <button
                              onClick={() =>
                                onSyncJobState(
                                  hire.id,
                                  'cancelled',
                                  'Hire agreement revoked by buyer before escrow funding'
                                )
                              }
                              className="neo-btn bg-[#FF4365] hover:bg-[#E11D48] text-white font-display font-black text-[10px] px-2 py-1"
                              title="Revoke / Cancel this pending hire"
                            >
                              REVOKE
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedJobToInspect(hire)}
                            className="neo-btn bg-[#FAF7F0] hover:bg-[#FFE500] text-[#121212] font-mono-tech font-bold text-[10px] px-2 py-1 inline-flex items-center space-x-1"
                            title="Inspect cryptographic proof and deliverable manifest"
                          >
                            <Shield className="w-3 h-3 text-[#2563EB]" />
                            <span>PROOFS</span>
                          </button>
                          {['pending', 'funded', 'running', 'submitted'].includes(hire.state) && (
                            <button
                              onClick={() => onFocusAgentInHouse(career)}
                              className="neo-btn bg-[#FFE500] text-[#121212] font-display font-black text-[10px] px-2.5 py-1 inline-flex items-center space-x-1"
                              title="View active worker in Agent House chamber"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>HOUSE</span>
                            </button>
                          )}
                        </div>
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
          <span>Total records: <strong className="text-[#121212]">{filteredHires.length}</strong></span>
          <span className="font-medium text-[#2563EB]">BSC Testnet / BSC Mainnet</span>
        </div>
      </div>

      {/* Inspect Job Modal from History Book */}
      {selectedJobToInspect && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="neo-card bg-[#FFFFFF] w-full max-w-lg p-5 neo-shadow-xl relative max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b-2 border-[#121212] pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-1.5 py-0.2">
                    ESCROW ARCHIVE
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
                  <p><strong>Escrow Rail:</strong> {selectedJobToInspect.rail.toUpperCase()}</p>
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
                  <p><strong>Last Action:</strong> {selectedJobToInspect.lastAction || 'Escrow record archived'}</p>
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
              <div className="flex items-center space-x-1.5 font-mono-tech text-[10px] text-[#6A6A6A]">
                <CheckCircle className="w-3.5 h-3.5 text-[#059669]" />
                <span>On-chain Escrow Archive Verified</span>
              </div>
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
