import React from 'react';
import { AgentData } from '../../types.ts';
import { getPixelSprite } from '../game/pixelAssets.ts';
import { X, Check, ArrowRight, ShieldCheck, Zap, Scale } from 'lucide-react';

interface CompareModalProps {
  agent1: AgentData;
  agent2: AgentData;
  onClose: () => void;
  onSelectToHire: (agent: AgentData) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  agent1,
  agent2,
  onClose,
  onSelectToHire,
}) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="neo-card bg-[#FFFFFF] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 md:p-6 neo-shadow-xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#121212] pb-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-[#FFE500] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center">
              <Scale className="w-4 h-4 text-[#121212]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="neo-badge bg-[#FAF7F0] text-[#121212] text-[9px] px-1.5 py-0.2">
                  DIFF.MATRIX
                </span>
                <h2 className="font-display font-black text-sm md:text-base text-[#121212] uppercase tracking-tight">
                  BENCHMARK COMPARISON
                </h2>
              </div>
              <p className="font-mono-tech text-[11px] text-[#6A6A6A]">
                Head-to-head evaluation of Bayesian win rates, latency, and costs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="neo-btn w-7 h-7 bg-[#121212] text-white flex items-center justify-center font-bold text-xs"
          >
            ✕
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[agent1, agent2].map((agent, idx) => {
            const career = (agent.labels?.[0] || 'monitoring') as any;
            const spriteSrc = getPixelSprite(career);
            const hourlyRate = agent.rawJson?.hourlyCostU || '0.25';
            const latency = agent.rawJson?.p99LatencyMs || 350;
            const reputation = agent.rawJson?.reputationScore || 95;
            const totalJobs = (agent.successCount || 0) + (agent.failureCount || 0);
            const winRate =
              totalJobs > 0 ? Math.round((agent.successCount / totalJobs) * 100) : 100;

            return (
              <div
                key={agent.agentId}
                className="neo-card bg-[#FAF7F0] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-white border-2 border-[#121212] neo-shadow-sm flex items-center justify-center shrink-0">
                      <img
                        src={spriteSrc}
                        alt={agent.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getPixelSprite(career, 'idle');
                        }}
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div>
                      <span className="neo-badge bg-[#121212] text-[#FFE500] text-[8px] px-1.5 py-0.2 uppercase">
                        {career}
                      </span>
                      <h3 className="font-display font-extrabold text-sm text-[#121212] mt-1 leading-tight">
                        {agent.name}
                      </h3>
                      <span className="font-mono-tech text-[10px] text-[#6A6A6A]">
                        ID: {agent.agentId}
                      </span>
                    </div>
                  </div>

                  <p className="font-sans text-xs text-[#5A5A5A] mb-3 leading-relaxed">
                    "{agent.description}"
                  </p>

                  {/* Benchmark Specs Matrix */}
                  <div className="space-y-2 border-t-2 border-[#121212] pt-3 font-mono-tech text-xs">
                    <div className="flex justify-between py-1 border-b border-[#D0C8B8]">
                      <span className="text-[#6A6A6A]">HOURLY TARIFF:</span>
                      <span className="font-bold text-[#121212]">{hourlyRate} $U/hr</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#D0C8B8]">
                      <span className="text-[#6A6A6A]">P99 LATENCY:</span>
                      <span className="font-bold text-[#2563EB]">{latency} ms</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#D0C8B8]">
                      <span className="text-[#6A6A6A]">PROVEN WIN RATE:</span>
                      <span className="font-bold text-[#00F59B]">{winRate}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#D0C8B8]">
                      <span className="text-[#6A6A6A]">TRUST SCORE:</span>
                      <span className="font-bold text-[#121212]">{reputation}/100</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#6A6A6A]">PAYMENT STANDARD:</span>
                      <span className="font-bold text-[#FF7828]">ERC-8183 ESCROW</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-[#121212]">
                  <button
                    onClick={() => {
                      onClose();
                      onSelectToHire(agent);
                    }}
                    className="w-full neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-xs py-2 flex items-center justify-center space-x-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 fill-[#121212]" />
                    <span>CHOOSE {agent.name.split(' ')[0].toUpperCase()}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
