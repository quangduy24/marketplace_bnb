import React, { useState, useEffect, useRef } from 'react';
import { AppView } from '../../types.ts';
import { getPixelSprite } from './pixelAssets.ts';
import {
  ShoppingBag,
  ShieldCheck,
  BookOpen,
  TrendingUp,
  Compass,
  ArrowRight,
  Sparkles,
  Navigation,
  KeyRound,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Zap,
} from 'lucide-react';

interface TownMapProps {
  onNavigate: (view: AppView) => void;
  activeJobsCount: number;
}

interface BuildingTarget {
  id: string;
  name: string;
  quarterName: string;
  subtext: string;
  view: AppView;
  x: number; // percentage (25 or 75 for perfect 4-corner balance)
  y: number; // percentage (26 or 74 for perfect 4-corner balance)
  icon: React.ElementType;
  accentColor: string;
  code: string;
  badgeText: string;
  spriteName: 'monitoring' | 'health_factor' | 'grid' | 'yield' | 'player' | 'npc_grey';
  tags: string[];
}

// Perfectly balanced 4-quadrant layout around the Central Plaza Nexus
const BUILDINGS: BuildingTarget[] = [
  {
    id: 'market',
    name: 'CENTRAL BAZAAR',
    quarterName: 'NORTHWEST SECTOR // COMMERCE',
    subtext: '4 Stalls of Autonomous Agents',
    view: 'marketplace',
    x: 24,
    y: 26,
    icon: ShoppingBag,
    accentColor: '#FFE500',
    code: 'HUB.01',
    badgeText: '4 STALLS ACTIVE',
    spriteName: 'monitoring',
    tags: ['ERC-8004 Directory', 'Thompson Sampling'],
  },
  {
    id: 'house',
    name: 'LANS SANCTUARY',
    quarterName: 'NORTHEAST SECTOR // OPERATIONS',
    subtext: '4 Autonomous Work Chambers',
    view: 'agents',
    x: 76,
    y: 26,
    icon: ShieldCheck,
    accentColor: '#38BDF8',
    code: 'HUB.02',
    badgeText: 'MACHINERY LIVE',
    spriteName: 'health_factor',
    tags: ['Venus Collateral', 'Radar Mempool'],
  },
  {
    id: 'history',
    name: 'SCRIBE ARCHIVES',
    quarterName: 'SOUTHWEST SECTOR // AUDIT',
    subtext: 'On-Chain Proof & Job History',
    view: 'history',
    x: 24,
    y: 74,
    icon: BookOpen,
    accentColor: '#A855F7',
    code: 'HUB.03',
    badgeText: 'IMMUTABLE LOGS',
    spriteName: 'grid',
    tags: ['ERC-8183 Proofs', 'BscScan Ledger'],
  },
  {
    id: 'profits',
    name: 'WINDMILL TREASURY',
    quarterName: 'SOUTHEAST SECTOR // TREASURY',
    subtext: 'Net Yield & Alpha Dashboard',
    view: 'profits',
    x: 76,
    y: 74,
    icon: TrendingUp,
    accentColor: '#00F59B',
    code: 'HUB.04',
    badgeText: 'LIVE TREASURY',
    spriteName: 'yield',
    tags: ['Liquidation Shield', 'Compounding APY'],
  },
];

export const TownMap: React.FC<TownMapProps> = ({ onNavigate, activeJobsCount }) => {
  // Player starts exactly at the Center Nexus (50%, 50%)
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 50 });
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [activeHoverBuilding, setActiveHoverBuilding] = useState<BuildingTarget | null>(null);
  const [isWalking, setIsWalking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerPosRef = useRef(playerPos);
  const walkTimeoutRef = useRef<any>(null);

  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  // Calculate distance between player and buildings to detect nearest hub
  const getDistance = (b: BuildingTarget) => {
    const dx = playerPos.x - b.x;
    const dy = playerPos.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const nearestBuilding = BUILDINGS.reduce((prev, curr) => {
    return getDistance(curr) < getDistance(prev) ? curr : prev;
  });

  const isNearNearest = getDistance(nearestBuilding) <= 22;

  // Move step helper
  const moveBy = (dx: number, dy: number) => {
    const prev = playerPosRef.current;
    const newX = Math.min(88, Math.max(12, prev.x + dx));
    const newY = Math.min(88, Math.max(12, prev.y + dy));

    if (dx < 0) setFacing('left');
    if (dx > 0) setFacing('right');

    setIsWalking(true);
    clearTimeout(walkTimeoutRef.current);
    walkTimeoutRef.current = setTimeout(() => setIsWalking(false), 300);

    setPlayerPos({ x: newX, y: newY });
  };

  // Keyboard controls: WASD / Arrow keys and Enter to step inside nearest building
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 4;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        moveBy(0, -step);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        moveBy(0, step);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        moveBy(-step, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        moveBy(step, 0);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (isNearNearest) {
          e.preventDefault();
          onNavigate(nearestBuilding.view);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(walkTimeoutRef.current);
    };
  }, [isNearNearest, nearestBuilding, onNavigate]);

  // Click on terrain to move player
  const handleTerrainClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.min(88, Math.max(12, clickX));
    const clampedY = Math.min(88, Math.max(12, clickY));

    if (clampedX > playerPos.x) {
      setFacing('right');
    } else {
      setFacing('left');
    }

    setIsWalking(true);
    clearTimeout(walkTimeoutRef.current);
    walkTimeoutRef.current = setTimeout(() => setIsWalking(false), 400);

    setPlayerPos({ x: clampedX, y: clampedY });
  };

  return (
    <div className="w-full h-[calc(100vh-120px)] min-h-[580px] bg-[#F4F0EA] p-3 sm:p-5 flex flex-col justify-between select-none overflow-hidden editorial-grid">
      {/* Top Editorial HUD Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#FFFFFF] border-2 border-[#121212] neo-shadow-sm px-3 sm:px-4 py-2 sm:py-2.5 z-20 shrink-0 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-[#FFE500] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center font-bold shrink-0">
            <Compass className="w-4 h-4 text-[#121212]" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="neo-badge bg-[#121212] text-[#FFE500] text-[9px] px-1.5 py-0.2 font-mono-tech">
                ZONE.00
              </span>
              <span className="font-display font-black text-xs sm:text-sm text-[#121212] tracking-tight">
                TACTICAL BAZAAR PLAZA // 4-QUADRANT CITADEL
              </span>
              <span className="hidden md:inline-block neo-badge bg-[#FAF7F0] text-[#121212] text-[9px] px-1.5 py-0.2">
                BALANCED MAP
              </span>
            </div>
            <span className="font-mono-tech text-[10px] text-[#6A6A6A]">
              Interactive Town Plaza: WASD / Arrow keys or click to walk • Symmetrical 4-Hub Citadel
            </span>
          </div>
        </div>

        {/* Quick Travel Shortcut Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 font-mono-tech text-xs">
          <span className="text-[10px] font-bold text-[#8A8A8A] uppercase hidden lg:inline mr-1">
            DIRECT JUMP:
          </span>
          {BUILDINGS.map((b) => (
            <button
              key={b.id}
              onClick={() => onNavigate(b.view)}
              className="neo-btn bg-[#FAF7F0] hover:bg-[#121212] hover:text-white px-2 py-0.5 text-[10px] font-bold border-2 border-[#121212] flex items-center space-x-1 transition-colors"
              style={{ borderLeftColor: b.accentColor, borderLeftWidth: '4px' }}
            >
              <span>{b.code}</span>
            </button>
          ))}
          <span className="neo-badge bg-[#00F59B] text-[#121212] text-[10px] px-2 py-0.5 font-bold ml-1 shrink-0">
            ACTIVE JOBS: {activeJobsCount}
          </span>
        </div>
      </div>

      {/* Main Tactical Map Arena (100% Symmetrical 4-Quadrant Architecture) */}
      <div
        ref={containerRef}
        onClick={handleTerrainClick}
        className="flex-1 relative neo-card bg-[#F6F2EA] overflow-hidden my-3 cursor-crosshair neo-shadow"
      >
        {/* Architectural Blueprint Grid */}
        <div
          className="absolute inset-0 opacity-45 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#121212 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* 4 Quadrant Subtle Zone Tint Backgrounds */}
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-[#FFE500]/5 border-r-2 border-b-2 border-[#121212]/15 pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[#38BDF8]/5 border-l-2 border-b-2 border-[#121212]/15 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#A855F7]/5 border-r-2 border-t-2 border-[#121212]/15 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[#00F59B]/5 border-l-2 border-t-2 border-[#121212]/15 pointer-events-none" />

        {/* Diagonal Arteries (Corner Walkways Connecting Nexus to all 4 Hubs) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          <line x1="24%" y1="26%" x2="50%" y2="50%" stroke="#121212" strokeWidth="3" strokeDasharray="6,6" />
          <line x1="76%" y1="26%" x2="50%" y2="50%" stroke="#121212" strokeWidth="3" strokeDasharray="6,6" />
          <line x1="24%" y1="74%" x2="50%" y2="50%" stroke="#121212" strokeWidth="3" strokeDasharray="6,6" />
          <line x1="76%" y1="74%" x2="50%" y2="50%" stroke="#121212" strokeWidth="3" strokeDasharray="6,6" />
        </svg>

        {/* Cardinal Main Avenues (Crosshairs) */}
        <div className="absolute top-[48%] left-0 right-0 h-10 bg-[#EDE5D6] border-y-2 border-[#121212]/20 pointer-events-none flex items-center justify-between px-4">
          <span className="font-mono-tech text-[9px] text-[#8A8A8A] font-bold tracking-widest pointer-events-none">
            WEST GATE // ARCHIVE PROMENADE
          </span>
          <span className="font-mono-tech text-[9px] text-[#8A8A8A] font-bold tracking-widest pointer-events-none">
            EAST GATE // TREASURY AVENUE
          </span>
        </div>
        <div className="absolute left-[48%] top-0 bottom-0 w-10 bg-[#EDE5D6] border-x-2 border-[#121212]/20 pointer-events-none flex flex-col items-center justify-between py-4">
          <span className="font-mono-tech text-[9px] text-[#8A8A8A] font-bold tracking-widest pointer-events-none [writing-mode:vertical-lr] rotate-180">
            NORTH // COMMERCE BOULEVARD
          </span>
          <span className="font-mono-tech text-[9px] text-[#8A8A8A] font-bold tracking-widest pointer-events-none [writing-mode:vertical-lr]">
            SOUTH // SOVEREIGN GATE
          </span>
        </div>

        {/* Architectural Quadrant Sector Labels */}
        <div className="absolute top-2 left-3 pointer-events-none">
          <span className="font-mono-tech text-[9px] text-[#8A8A8A] font-bold uppercase tracking-wider">
            [+] NW SECTOR // BAZAAR MARKET STALLS
          </span>
        </div>
        <div className="absolute top-2 right-3 text-right pointer-events-none">
          <span className="font-mono-tech text-[9px] text-[#8A8A8A] font-bold uppercase tracking-wider">
            NE SECTOR // WORK SANCTUARY [+]
          </span>
        </div>
        <div className="absolute bottom-2 left-3 pointer-events-none">
          <span className="font-mono-tech text-[9px] text-[#8A8A8A] font-bold uppercase tracking-wider">
            [+] SW SECTOR // SCRIBE ARCHIVES
          </span>
        </div>
        <div className="absolute bottom-2 right-3 text-right pointer-events-none">
          <span className="font-mono-tech text-[9px] text-[#8A8A8A] font-bold uppercase tracking-wider">
            SE SECTOR // TREASURY RESERVES [+]
          </span>
        </div>

        {/* Central Plaza Roundabout Nexus (Unobstructed, Balanced Focal Point) */}
        <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-2 border-[#121212] bg-[#FFFFFF] neo-shadow-sm flex items-center justify-center pointer-events-none z-10">
          {/* Outer Compass Ring */}
          <div className="w-36 h-36 rounded-full border-2 border-dashed border-[#121212]/40 flex items-center justify-center relative">
            {/* Cardinal Compass Markers */}
            <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 font-mono-tech text-[8px] font-black text-[#121212] bg-[#FAF7F0] px-1 border border-[#121212]">
              N
            </span>
            <span className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 font-mono-tech text-[8px] font-black text-[#121212] bg-[#FAF7F0] px-1 border border-[#121212]">
              S
            </span>
            <span className="absolute -left-3 top-1/2 transform -translate-y-1/2 font-mono-tech text-[8px] font-black text-[#121212] bg-[#FAF7F0] px-1 border border-[#121212]">
              W
            </span>
            <span className="absolute -right-3 top-1/2 transform -translate-y-1/2 font-mono-tech text-[8px] font-black text-[#121212] bg-[#FAF7F0] px-1 border border-[#121212]">
              E
            </span>

            {/* Inner Monument Core */}
            <div className="w-20 h-20 rounded-full bg-[#FAF7F0] border-2 border-[#121212] flex flex-col items-center justify-center text-center p-1 relative">
              <div className="w-6 h-6 rounded-full bg-[#FFE500] border-2 border-[#121212] flex items-center justify-center mb-0.5">
                <Sparkles className="w-3 h-3 text-[#121212] animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <span className="font-mono-tech text-[8px] font-black text-[#121212] uppercase leading-none">
                LANS NEXUS
              </span>
              <span className="font-mono-tech text-[7px] text-[#6A6A6A] leading-none mt-0.5">
                BNB 0x8004
              </span>
            </div>
          </div>
        </div>

        {/* 4 Symmetrically Balanced District Hub Cards */}
        {BUILDINGS.map((b) => {
          const Icon = b.icon;
          const isTargeted = activeHoverBuilding?.id === b.id;
          const isClosest = nearestBuilding.id === b.id && isNearNearest;

          return (
            <div
              key={b.id}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(b.view);
              }}
              onMouseEnter={() => setActiveHoverBuilding(b)}
              onMouseLeave={() => setActiveHoverBuilding(null)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer transition-transform duration-200"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: '24%',
                minWidth: '220px',
                maxWidth: '290px',
              }}
            >
              <div
                className={`neo-card bg-[#FFFFFF] p-3 sm:p-3.5 transition-all duration-150 relative ${
                  isTargeted || isClosest ? 'neo-shadow-lg -translate-y-1' : 'neo-shadow'
                }`}
                style={{
                  borderTop: `6px solid ${b.accentColor}`,
                  outline: isClosest ? `2px solid ${b.accentColor}` : 'none',
                }}
              >
                {/* Hub Header */}
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className="neo-badge text-[9px] px-1.5 py-0.2 font-mono-tech font-black"
                      style={{ backgroundColor: b.accentColor, color: '#121212' }}
                    >
                      {b.code}
                    </span>
                    <span className="font-mono-tech text-[8px] text-[#6A6A6A] uppercase font-bold hidden sm:inline">
                      {b.badgeText}
                    </span>
                  </div>
                  <span className="font-mono-tech text-[9px] text-[#121212] font-black uppercase flex items-center space-x-0.5 group">
                    <span>ENTER</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* Hub Graphic Strip */}
                <div className="flex items-center space-x-2.5 mb-2 bg-[#FAF7F0] p-2 border-2 border-[#121212]">
                  <div
                    className="w-10 h-10 border-2 border-[#121212] neo-shadow-sm flex items-center justify-center shrink-0"
                    style={{ backgroundColor: b.accentColor, color: '#121212' }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="font-display font-black text-xs sm:text-sm text-[#121212] block truncate tracking-tight">
                      {b.name}
                    </span>
                    <span className="font-sans text-[11px] text-[#555555] block truncate">
                      {b.subtext}
                    </span>
                  </div>

                  {/* Mini Pixel Avatar Mascot Preview */}
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    <img
                      src={getPixelSprite(b.spriteName)}
                      alt={b.name}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1 flex-wrap mb-2">
                  {b.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="neo-badge bg-[#FFFFFF] border border-[#121212] text-[8px] px-1.5 py-0.2 font-mono-tech text-[#4A4A4A]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Enter Button Action */}
                <button
                  type="button"
                  className="w-full neo-btn bg-[#121212] text-white font-mono-tech text-[10px] font-black py-1.5 flex items-center justify-center space-x-1.5 hover:bg-[#FFE500] hover:text-[#121212] transition-colors"
                >
                  <span>STEP INSIDE {b.code}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                {/* Proximity Callout Badge */}
                {isClosest && (
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 neo-badge bg-[#121212] text-[#00F59B] text-[8px] font-mono-tech px-2 py-0.5 border border-[#00F59B] animate-bounce z-30">
                    PRESS [ENTER] TO STEP IN
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Dynamic Player Character Avatar */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-150 z-30"
          style={{
            left: `${playerPos.x}%`,
            top: `${playerPos.y}%`,
          }}
        >
          <div className="flex flex-col items-center">
            <span className="neo-badge bg-[#121212] text-[#FFE500] text-[8px] px-1.5 py-0.2 mb-0.5 border border-[#FFE500]">
              YOU (BUYER)
            </span>
            <div className="relative">
              {/* Drop Shadow beneath player feet */}
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-2.5 bg-[#121212]/30 rounded-full blur-[1px]" />
              <img
                src={getPixelSprite('player')}
                alt="Player"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getPixelSprite('player');
                }}
                className={`w-12 h-12 object-contain relative z-10 transition-transform ${
                  facing === 'left' ? 'scale-x-[-1]' : ''
                } ${isWalking ? 'animate-bounce' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* On-Screen Touch D-Pad for Direct Touch/Mouse Navigation */}
        <div className="absolute bottom-3 right-3 z-30 hidden sm:flex flex-col items-center bg-[#FFFFFF] p-1.5 border-2 border-[#121212] neo-shadow-sm opacity-80 hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveBy(0, -5);
            }}
            className="w-6 h-6 bg-[#FAF7F0] border border-[#121212] hover:bg-[#FFE500] flex items-center justify-center font-bold text-xs"
            title="Move Up (W)"
          >
            <ArrowUp className="w-3.5 h-3.5 text-[#121212]" />
          </button>
          <div className="flex space-x-1 my-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveBy(-5, 0);
              }}
              className="w-6 h-6 bg-[#FAF7F0] border border-[#121212] hover:bg-[#FFE500] flex items-center justify-center font-bold text-xs"
              title="Move Left (A)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#121212]" />
            </button>
            <div className="w-6 h-6 bg-[#121212] flex items-center justify-center font-mono-tech text-[8px] text-white">
              WALK
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveBy(5, 0);
              }}
              className="w-6 h-6 bg-[#FAF7F0] border border-[#121212] hover:bg-[#FFE500] flex items-center justify-center font-bold text-xs"
              title="Move Right (D)"
            >
              <ArrowRight className="w-3.5 h-3.5 text-[#121212]" />
            </button>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveBy(0, 5);
            }}
            className="w-6 h-6 bg-[#FAF7F0] border border-[#121212] hover:bg-[#FFE500] flex items-center justify-center font-bold text-xs"
            title="Move Down (S)"
          >
            <ArrowDown className="w-3.5 h-3.5 text-[#121212]" />
          </button>
        </div>
      </div>

      {/* Bottom Editorial Telemetry Strip */}
      <div className="neo-card bg-[#FFFFFF] border-2 border-[#121212] px-3 sm:px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-xs text-[#121212] z-20 neo-shadow-sm shrink-0 gap-2">
        <div className="flex items-center space-x-2 font-mono-tech text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#00F59B] animate-ping" />
          {activeHoverBuilding ? (
            <span>
              DESTINATION:{' '}
              <strong className="text-[#121212] font-black">{activeHoverBuilding.name}</strong> ({activeHoverBuilding.quarterName}) —{' '}
              {activeHoverBuilding.subtext}.
            </span>
          ) : isNearNearest ? (
            <span>
              PROXIMITY ALERT:{' '}
              <strong className="text-[#121212] font-black">{nearestBuilding.name}</strong> is right next to you. Press{' '}
              <kbd className="px-1 py-0.5 bg-[#FAF7F0] border border-[#121212] font-mono-tech font-bold text-[10px]">
                ENTER
              </kbd>{' '}
              or click building to enter.
            </span>
          ) : (
            <span>
              COORDINATES: <span className="font-bold">X: {playerPos.x.toFixed(0)}% | Y: {playerPos.y.toFixed(0)}%</span> — Click anywhere on the tactical grid or use WASD to explore the 4 quarters.
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 font-mono-tech text-[10px] text-[#6A6A6A]">
          <span className="hidden md:inline">KEYBOARD: [W/A/S/D] or [ARROWS]</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden sm:inline">CLICK TERRAIN TO WALK</span>
        </div>
      </div>
    </div>
  );
};
