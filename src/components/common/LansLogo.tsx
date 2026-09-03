import React from 'react';

interface LansLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showBadge?: boolean;
  className?: string;
  animate?: boolean;
}

export const LansLogo: React.FC<LansLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  showBadge = true,
  className = '',
  animate = true,
}) => {
  const iconDimensions = {
    sm: { box: 'w-7 h-7', px: 28 },
    md: { box: 'w-9 h-9 sm:w-10 sm:h-10', px: 38 },
    lg: { box: 'w-12 h-12 sm:w-14 sm:h-14', px: 52 },
    xl: { box: 'w-16 h-16 sm:w-20 sm:h-20', px: 76 },
  };

  const titleSizeMap = {
    sm: 'text-base tracking-tight',
    md: 'text-xl sm:text-2xl tracking-tighter',
    lg: 'text-2xl sm:text-3xl tracking-tighter',
    xl: 'text-4xl sm:text-5xl tracking-tighter',
  };

  const badgeSizeMap = {
    sm: 'text-[8px] px-1.5 py-0.2',
    md: 'text-[9px] px-2 py-0.5',
    lg: 'text-[10px] px-2.5 py-0.5',
    xl: 'text-xs px-3 py-1',
  };

  return (
    <div className={`flex items-center space-x-2.5 sm:space-x-3 select-none group ${className}`}>
      {/* High-Craft Neo-Brutalist Vector Emblem */}
      <div className="relative shrink-0">
        <div
          className={`${iconDimensions[size].box} bg-[#FFE500] border-2 sm:border-[2.5px] border-[#121212] neo-shadow-sm group-hover:neo-shadow group-hover:-translate-y-0.5 transition-all duration-150 relative overflow-hidden flex items-center justify-center`}
          style={{
            clipPath: 'polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 0 100%)',
          }}
        >
          {/* Subtle Cyber Grid Texture */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(#121212 1px, transparent 1px), radial-gradient(#121212 1px, #FFE500 1px)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 4px 4px',
            }}
          />

          {/* Top-Right Chamfer Corner Accent Triangle */}
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#121212] pointer-events-none" />

          {/* Custom SVG Monogram: Architectural "L" + Autonomous Quantum Nexus Star "*" */}
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`w-full h-full p-1 relative z-10 ${animate ? 'transition-transform duration-300' : ''}`}
          >
            {/* Ambient Tech Coordinates & Subtle Frame Marks */}
            <line x1="6" y1="12" x2="6" y2="16" stroke="#121212" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="12" y1="6" x2="16" y2="6" stroke="#121212" strokeWidth="1" strokeOpacity="0.4" />
            <circle cx="38" cy="38" r="1.5" fill="#121212" fillOpacity="0.4" />

            {/* Architectural Modern "L" Monogram */}
            <path
              d="M 10 9 H 19 V 28 H 35 L 32 36 H 10 V 9 Z"
              fill="#121212"
              className="drop-shadow-xs"
            />
            {/* L Inset Cyber Slit */}
            <line
              x1="12.5"
              y1="11"
              x2="12.5"
              y2="33"
              stroke="#FFE500"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeOpacity="0.85"
            />

            {/* Autonomous Nexus Star / Beacon "*" */}
            <g className="group-hover:rotate-45 transition-transform duration-500 origin-[31px_16px]">
              {/* 4 Cardinal Cosmic Rays */}
              <path
                d="M 31 7 Q 31 16 40 16 Q 31 16 31 25 Q 31 16 22 16 Q 31 16 31 7 Z"
                fill="#121212"
              />
              {/* 4 Diagonal Micro Beams */}
              <path
                d="M 26 11 L 36 21 M 36 11 L 26 21"
                stroke="#121212"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* Luminous Emerald Autonomous Core */}
              <circle
                cx="31"
                cy="16"
                r="2.5"
                fill="#00F59B"
                stroke="#121212"
                strokeWidth="1"
              />
              {/* Micro Specular Point */}
              <circle cx="30.5" cy="15.5" r="0.8" fill="#FFFFFF" />
            </g>
          </svg>
        </div>
      </div>

      {/* Brand Wordmark & Typography Lockup */}
      <div className="flex flex-col justify-center text-left">
        <div className="flex items-center space-x-2">
          {/* Main Wordmark "LANS" */}
          <div className="flex items-baseline">
            <span
              className={`font-display font-black text-[#121212] group-hover:text-[#121212] transition-colors leading-none tracking-tighter ${titleSizeMap[size]}`}
            >
              LANS
            </span>
            {/* Subtle Autonomous Super-Script Dot */}
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00F59B] border border-[#121212] ml-1 self-start animate-pulse" />
          </div>

          {/* Network / Protocol Badge */}
          {showBadge && (
            <div className="flex items-center space-x-1">
              <span
                className={`neo-badge bg-[#FFE500] text-[#121212] font-mono-tech font-black border border-[#121212] flex items-center space-x-1 leading-none ${badgeSizeMap[size]}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#121212] animate-ping opacity-75 mr-0.5" />
                <span>BNB CHAIN</span>
              </span>
            </div>
          )}
        </div>

        {/* Editorial Subtitle */}
        {showSubtitle && (
          <div className="font-mono-tech text-[9.5px] sm:text-[10.5px] text-[#4A4A4A] tracking-tight flex items-center space-x-1.5 leading-none mt-1 font-bold">
            <span className="text-[#FF4365] text-[8px]">▶</span>
            <span>AUTONOMOUS AGENTS</span>
            <span className="hidden lg:inline text-[#8A8A8A] font-normal">// ERC-8004</span>
          </div>
        )}
      </div>
    </div>
  );
};
