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
  // Always 6 squad slots
  const slots = Array.from({ length: 6 }, (_, index) => {
    return hires[index] || null;
  });

  return (
    <footer className="w-full bg-[#FFFFFF] border-t-[2.5px] border-[#121212] px-4 py-2.5 flex items-center justify-between z-30 select-none relative shadow-[0_-3px_0px_rgba(18,18,18,0.06)]">
      {/* Editorial Category Tag */}
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-[#FFE500] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center font-bold text-xs">
          <Users className="w-3.5 h-3.5 text-[#121212]" />
        </div>
        <div className="hidden sm:block">
          <span className="font-display font-extrabold text-xs text-[#121212] uppercase tracking-tight block leading-none">
            HIRED SQUAD
          </span>
          <span className="font-mono-tech text-[10px] text-[#6A6A6A]">
            6 ACTIVE SLOTS
          </span>
        </div>
      </div>

      {/* 6 Chunky Neo-Brutalist Slots */}
      <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto py-0.5 px-2">
        {slots.map((hire, i) => {
          if (!hire) {
            return (
              <button
                key={i}
                onClick={() => onNavigate('marketplace')}
                title={`Empty slot ${i + 1} — Click to hire an agent from the marketplace`}
                className="w-11 h-11 bg-[#F4F0EA] border-2 border-dashed border-[#121212] flex flex-col items-center justify-center text-[#121212] hover:bg-[#FFE500] hover:border-solid hover:neo-shadow-sm transition-all rounded-none group shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#6A6A6A] group-hover:text-[#121212]" />
                <span className="font-mono-tech text-[8px] font-bold text-[#6A6A6A] group-hover:text-[#121212]">
                  0{i + 1}
                </span>
              </button>
            );
          }

          const agent = agents.find((a) => a.agentId === hire.agentId);
          const career = (hire.catalog || 'monitoring') as 'monitoring' | 'grid' | 'health_factor' | 'yield';
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
              key={hire.id || i}
              onClick={() => onSelectHiredSlot(hire)}
              title={`${agent?.name || hire.agentId} (${hire.state.toUpperCase()}) — Click to focus chamber`}
              className="w-11 h-11 bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm hover:neo-shadow flex flex-col items-center justify-center relative rounded-none shrink-0 transition-all hover:translate-y-[-2px]"
            >
              <img
                src={spriteSrc}
                alt={agent?.name || 'Agent'}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getPixelSprite(career, 'idle');
                }}
                className="w-8 h-8 object-contain"
              />
              <span
                className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border border-[#121212] ${stateColor}`}
                title={`Status: ${hire.state}`}
              />
            </button>
          );
        })}
      </div>

      {/* Primary Action Button */}
      <div className="text-right">
        <button
          onClick={() => onNavigate('marketplace')}
          className="neo-btn bg-[#FFE500] text-[#121212] font-display font-black text-xs px-3 py-1.5 flex items-center space-x-1"
        >
          <span>+ HIRE MORE</span>
        </button>
      </div>
    </footer>
  );
};
