import React from 'react';
import { HireData, AgentData, AppView } from '../../types.ts';
import { getPixelSprite } from '../game/pixelAssets.ts';
import { Users, Plus } from 'lucide-react';

interface BottomActionBarProps {
  hires: HireData[];
  agents: AgentData[];
  onSelectHiredSlot: (hire: HireData) => void;
  onNavigate: (view: AppView) => void;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  hires,
  agents,
  onSelectHiredSlot,
  onNavigate,
}) => {
  // Unlimited slots: Show all hired agents plus inviting empty slots
  const minSlots = Math.max(4, hires.length + 1);
  const slots: (HireData | null)[] = [
    ...hires,
    ...Array.from({ length: minSlots - hires.length }, () => null),
  ];

  return (
    <footer className="w-full bg-[#FFFFFF] border-t-[2.5px] border-[#121212] px-3 sm:px-4 py-2 flex items-center justify-between z-30 select-none relative shadow-[0_-3px_0px_rgba(18,18,18,0.06)]">
      {/* Editorial Category Tag */}
      <div className="flex items-center space-x-2 shrink-0">
        <div className="w-6 h-6 bg-[#FFE500] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center font-bold text-xs">
          <Users className="w-3.5 h-3.5 text-[#121212]" />
        </div>
          <div className="hidden sm:block">
          <div className="flex items-center space-x-1.5">
            <span className="font-display font-extrabold text-xs text-[#121212] uppercase tracking-tight block leading-none">
              ACTIVE AGENTS
            </span>
            <span className="neo-badge bg-[#00F59B] text-[#121212] text-[8px] font-black px-1.5 py-0.2">
              ∞ UNLIMITED
            </span>
          </div>
          <span className="font-mono-tech text-[10px] text-[#6A6A6A]">
            {hires.length} ACTIVE {hires.length === 1 ? 'AGENT' : 'AGENTS'} // NO LIMIT
          </span>
        </div>
      </div>

      {/* Dynamic Chunky Neo-Brutalist Slots (Unlimited) */}
      <div className="flex items-center space-x-2 sm:space-x-2.5 overflow-x-auto py-1 px-2 mx-2 max-w-[65vw]">
        {slots.map((hire, i) => {
          if (!hire) {
            return (
              <button
                key={`empty-${i}`}
                onClick={() => onNavigate('marketplace')}
                title={`Empty slot ${i + 1} — Click to hire another agent (No limits)`} // HIRE giữ nguyên khi chưa thuê
                className="w-10 h-10 sm:w-11 sm:h-11 bg-[#F4F0EA] border-2 border-dashed border-[#121212] flex flex-col items-center justify-center text-[#121212] hover:bg-[#FFE500] hover:border-solid hover:neo-shadow-sm transition-all rounded-none group shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#6A6A6A] group-hover:text-[#121212]" />
                <span className="font-mono-tech text-[8px] font-bold text-[#6A6A6A] group-hover:text-[#121212]">
                  {i < 9 ? `0${i + 1}` : `${i + 1}`}
                </span>
              </button>
            );
          }

          const agent = agents.find((a) => a.agentId === hire.agentId);
          const rawCareer = (hire.catalog || 'rebalancing') as string;
          const career = (rawCareer === 'monitoring' ? 'rebalancing' : rawCareer) as 'rebalancing' | 'grid' | 'health_factor' | 'yield';
          const spriteSrc = getPixelSprite(career, hire.state);

          const stateColor =
            hire.state === 'running' || hire.state === 'funded'
              ? 'bg-[#00F59B]'
              : hire.state === 'submitted'
              ? 'bg-[#FFE500]'
              : hire.state === 'paid'
              ? 'bg-[#38BDF8]'
              : 'bg-[#FF4365]';

          return (
            <button
              key={hire.id || `hire-${i}`}
              onClick={() => onSelectHiredSlot(hire)}
              title={`${agent?.name || hire.agentId} #${i + 1} (${hire.state.toUpperCase()}) — Click to view agent`}
              className="w-10 h-10 sm:w-11 sm:h-11 bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm hover:neo-shadow flex flex-col items-center justify-center relative rounded-none shrink-0 transition-all hover:translate-y-[-2px]"
            >
              <img
                src={spriteSrc}
                alt={agent?.name || 'Agent'}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getPixelSprite(career, 'idle');
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
              <span
                className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border border-[#121212] ${stateColor}`}
                title={`Status: ${hire.state}`}
              />
              <span className="absolute -bottom-1 -left-1 bg-[#121212] text-white text-[7px] font-mono-tech px-1 leading-none font-bold">
                {i < 9 ? `0${i + 1}` : `${i + 1}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Primary Action Button */}
      <div className="text-right shrink-0">
        <button
          onClick={() => onNavigate('marketplace')}
          className="neo-btn bg-[#FFE500] hover:bg-[#00F59B] text-[#121212] font-display font-black text-xs px-3 py-1.5 flex items-center space-x-1"
          title="Activate more agents — unlimited concurrent"
        >
          <span>+ ACTIVATE MORE</span>
        </button>
      </div>
    </footer>
  );
};
