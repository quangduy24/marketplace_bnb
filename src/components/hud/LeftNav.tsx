import React from 'react';
import {
  Home,
  ShoppingBag,
  ShieldCheck,
  BookOpen,
  TrendingUp,
  PlaySquare,
  Film,
  Terminal,
} from 'lucide-react';
import { AppView } from '../../types.ts';

interface LeftNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

interface NavItem {
  view: AppView;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badge?: string;
  accentColor: string;
}

export const LeftNav: React.FC<LeftNavProps> = ({ currentView, onNavigate }) => {
  const items: NavItem[] = [
    {
      view: 'town',
      label: 'PLAZA',
      sublabel: 'Interactive Map',
      icon: Home,
      accentColor: '#FFE500',
    },
    {
      view: 'marketplace',
      label: 'MARKET',
      sublabel: '4 Stalls Bazaar',
      icon: ShoppingBag,
      badge: 'HOT',
      accentColor: '#38BDF8',
    },
    {
      view: 'agents',
      label: 'SANCTUARY',
      sublabel: 'Work Chambers',
      icon: ShieldCheck,
      accentColor: '#00F59B',
    },
    {
      view: 'history',
      label: 'HISTORY',
      sublabel: 'On-Chain Records',
      icon: BookOpen,
      accentColor: '#A855F7',
    },
    {
      view: 'profits',
      label: 'TREASURY',
      sublabel: 'Net Yield Report',
      icon: TrendingUp,
      accentColor: '#FF7828',
    },
    {
      view: 'demo',
      label: 'SHOWCASE',
      sublabel: 'Judge Auto-Demo',
      icon: PlaySquare,
      badge: 'LIVE',
      accentColor: '#FF4365',
    },
    {
      view: 'story',
      label: 'ORIGINS',
      sublabel: '6-Beat Lore',
      icon: Film,
      accentColor: '#FFE500',
    },
  ];

  return (
    <aside className="w-16 md:w-56 bg-[#FFFFFF] border-r-[2.5px] border-[#121212] flex flex-col justify-between py-3 select-none z-30 shrink-0">
      <div className="space-y-1.5 px-2">
        {/* Editorial Section Masthead */}
        <div className="hidden md:block px-2 py-1 mb-2 border-b-2 border-[#121212] pb-2">
          <div className="flex items-center justify-between text-[#121212]">
            <span className="font-mono-tech font-bold text-[9px] tracking-wider uppercase">
              // PORTAL INDEX
            </span>
            <span className="font-mono-tech text-[9px] text-[#FF4365] font-bold">
              [V.26]
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;

          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center space-x-2.5 px-2 py-2 text-left rounded-none transition-all duration-100 relative ${
                isActive
                  ? 'border-2 border-[#121212] neo-shadow translate-x-[-1px] translate-y-[-1px]'
                  : 'border-2 border-transparent hover:border-[#121212] hover:bg-[#FAF7F0] text-[#4A4A4A] hover:text-[#121212]'
              }`}
              style={{
                backgroundColor: isActive ? item.accentColor : undefined,
              }}
            >
              {/* Icon Frame */}
              <div
                className={`w-8 h-8 flex items-center justify-center shrink-0 border-2 border-[#121212] ${
                  isActive ? 'bg-[#121212] text-white' : 'bg-[#F4F0EA] text-[#121212]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Text Meta */}
              <div className="hidden md:block overflow-hidden flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-display font-extrabold text-[13px] tracking-tight leading-none ${
                      isActive ? 'text-[#121212]' : 'text-[#121212]'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={`neo-badge text-[8px] px-1 py-0.2 ${
                        item.badge === 'HOT'
                          ? 'bg-[#FF4365] text-white'
                          : 'bg-[#121212] text-[#FFE500]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Editorial Protocol Stamp Footer */}
      <div className="hidden md:block px-3 py-2.5 bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm mx-2">
        <div className="flex items-center space-x-1.5 text-[#121212] mb-1">
          <Terminal className="w-3 h-3 text-[#2563EB]" />
          <span className="font-mono-tech font-bold text-[9px] uppercase tracking-wider">
            BSC ON-CHAIN
          </span>
        </div>
        <div className="font-mono-tech text-[10px] text-[#4A4A4A] leading-tight font-medium">
          ERC-8004 Identity
          <br />
          ERC-8183 Escrow v2
        </div>
      </div>
    </aside>
  );
};
