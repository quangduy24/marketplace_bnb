import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward, CheckCircle2, ShieldCheck, Sparkles, ExternalLink, Activity } from 'lucide-react';
import { getPixelSprite } from '../game/pixelAssets.ts';
import { AppView } from '../../types.ts';

interface AutoDemoRunnerProps {
  onNavigate: (view: AppView) => void;
}

interface DemoStep {
  startSec: number;
  endSec: number;
  stage: string;
  title: string;
  description: string;
  visualHighlight: string;
  targetView: AppView;
  badge: string;
}

const DEMO_TIMELINE: DemoStep[] = [
  {
    startSec: 0,
    endSec: 20,
    stage: 'PHASE 1: THE ECOSYSTEM CHALLENGE',
    title: '300,000+ Dormant Agents on BSC',
    description:
      'Over 300,000 AI agents are inscribed on BNB Smart Chain via ERC-8004. Without an active marketplace and reachability probing, buyers face dead endpoints and empty registries.',
    visualHighlight: 'Gray NPC streets dissolve as 5-second health probes activate the living agents.',
    targetView: 'story',
    badge: 'PROBLEM STATEMENT',
  },
  {
    startSec: 20,
    endSec: 45,
    stage: 'PHASE 2: TWO-STAGE HYBRID RECOMMENDATION',
    title: 'Bayesian Thompson Sampling & Heuristic Context',
    description:
      'Stage 1 strictly eliminates inactive & unreachable impostors. Stage 2 evaluates Venus Comptroller liquidity & PancakeSwap V3 ranges, combined with Marsaglia-Tsang Gamma Beta sampling.',
    visualHighlight: 'Dynamic ranking scores re-order agents instantly according to urgent wallet defense needs.',
    targetView: 'marketplace',
    badge: 'RANKING ALGORITHM',
  },
  {
    startSec: 45,
    endSec: 70,
    stage: 'PHASE 3: EMERGENCY COLLATERAL OVERRIDE',
    title: 'Venus Liquidation Warning & Stall Filtering',
    description:
      'When Health Factor dips below 1.15 or shortfall > 0, the engine triggers an Emergency Override (wH = 0.70), prioritizing Vulcan Safety Forge directly into the buyer attention field.',
    visualHighlight: 'Red pulsating emergency risk banner on the Bazaar stall directing user to safety shield.',
    targetView: 'marketplace',
    badge: 'HEURISTIC OVERRIDE',
  },
  {
    startSec: 70,
    endSec: 95,
    stage: 'PHASE 4: ERC-8183 ESCROW COMMERCE',
    title: 'Trustless On-Chain Job Funding',
    description:
      'The buyer locks 15.00 $U into the ERC-8183 escrow contract on BSC Testnet. No central intermediaries, zero custody of private keys. Agent receives on-chain event signal.',
    visualHighlight: 'Job funded on-chain: Tx 0x7a3e9c1f8d42b083e47915b4931a78e47c78096cba8714e82b7d2f4001c23f11',
    targetView: 'agents',
    badge: 'ON-CHAIN ESCROW',
  },
  {
    startSec: 95,
    endSec: 115,
    stage: 'PHASE 5: LANS 4-CHAMBER EXECUTION',
    title: 'Real-Time Machinery Animation & Proof Hash',
    description:
      'Agents in LANS run active animations strictly when an on-chain job is running. Upon loan defense payload execution, the agent posts proof hash and flags XONG! (DONE!).',
    visualHighlight: 'Vulcan Forge hammer sparks fly; proof hash recorded to IPFS and BSC explorer.',
    targetView: 'agents',
    badge: 'WORK VERIFICATION',
  },
  {
    startSec: 115,
    endSec: 130,
    stage: 'PHASE 6: TREASURY VALUE VERIFICATION',
    title: 'Immutable Proof & Net Portfolio Alpha',
    description:
      'The Historical Logbook records verified hashes. The Profits Ledger computes exact savings from current wallet records: $1,840 liquidation penalty avoided with $15 spent.',
    visualHighlight: 'Net profit alpha +$1,825 $U verified across BSC Testnet & Mainnet.',
    targetView: 'profits',
    badge: 'BENCHMARK PROOF',
  },
];

export const AutoDemoRunner: React.FC<AutoDemoRunnerProps> = ({ onNavigate }) => {
  const [seconds, setSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 130) {
            setIsPlaying(false);
            return 130;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentStep =
    DEMO_TIMELINE.find((s) => seconds >= s.startSec && seconds < s.endSec) ||
    DEMO_TIMELINE[DEMO_TIMELINE.length - 1];

  const handleSeek = (sec: number) => {
    setSeconds(sec);
  };

  const progressPercent = (seconds / 130) * 100;

  return (
    <div className="w-full h-[calc(100vh-120px)] min-h-[550px] bg-[#F4F0EA] p-3 sm:p-5 flex flex-col justify-between select-none overflow-hidden editorial-grid">
      {/* Top Controller Strip */}
      <div className="neo-card bg-[#FFFFFF] p-3 sm:p-4 neo-shadow-sm mb-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#121212] pb-2.5 mb-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 bg-[#FF4365] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center font-bold">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-1.5 py-0.2">
                  AUTO.DEMO
                </span>
                <span className="font-display font-black text-xs sm:text-sm text-[#121212] tracking-tight">
                  JUDGE EVALUATION TIMELINE (0 - 130s)
                </span>
              </div>
              <span className="font-mono-tech text-[10px] text-[#6A6A6A]">
                Autonomously demonstrating all protocol flows without login walls
              </span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center space-x-2 font-mono-tech text-xs">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="neo-btn bg-[#121212] text-white px-3 py-1 font-bold flex items-center space-x-1"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              onClick={() => {
                setSeconds(0);
                setIsPlaying(true);
              }}
              className="neo-btn bg-[#FAF7F0] text-[#121212] px-2 py-1 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <span className="font-bold min-w-[70px] text-right text-[#121212]">
              {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')} / 2:10
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#FAF7F0] border-2 border-[#121212] h-3.5 relative cursor-pointer overflow-hidden mb-2.5">
          <div
            className="bg-[#FFE500] h-full border-r-2 border-[#121212] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 6 Phase Markers */}
        <div className="grid grid-cols-6 gap-1.5 text-center font-mono-tech text-[9px]">
          {DEMO_TIMELINE.map((step, idx) => {
            const isActive = seconds >= step.startSec && seconds < step.endSec;
            return (
              <button
                key={idx}
                onClick={() => handleSeek(step.startSec)}
                className={`p-1.5 border-2 text-left truncate transition-all neo-btn ${
                  isActive
                    ? 'bg-[#121212] text-white font-bold'
                    : 'bg-[#FAF7F0] text-[#6A6A6A] hover:bg-[#FFE500] hover:text-[#121212]'
                }`}
              >
                P{idx + 1}: {step.startSec}s
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Showcase Card */}
      <div className="flex-1 neo-card bg-[#FFFFFF] p-4 sm:p-6 neo-shadow-lg flex flex-col justify-between overflow-y-auto relative">
        <div>
          <div className="flex items-center justify-between border-b-2 border-[#121212] pb-3 mb-4">
            <div>
              <span className="neo-badge bg-[#FAF7F0] text-[#6A6A6A] text-[9px] px-1.5 py-0.2 uppercase font-mono-tech">
                {currentStep.stage}
              </span>
              <h3 className="font-display font-black text-base sm:text-lg text-[#121212] mt-1.5 tracking-tight">
                {currentStep.title}
              </h3>
            </div>
            <span className="neo-badge bg-[#FFE500] text-[#121212] text-[10px] px-2 py-0.5 font-bold">
              {currentStep.badge}
            </span>
          </div>

          <p className="font-sans text-sm sm:text-base text-[#3A3A3A] leading-relaxed max-w-3xl">
            {currentStep.description}
          </p>

          <div className="my-4 p-3 bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm flex items-center space-x-3">
            <Sparkles className="w-5 h-5 text-[#2563EB] shrink-0 animate-pulse" />
            <div className="font-mono-tech text-xs text-[#121212]">
              <strong className="text-[#2563EB]">Live Telemetry:</strong> {currentStep.visualHighlight}
            </div>
          </div>
        </div>

        {/* Footer Navigation Jump */}
        <div className="border-t-2 border-[#121212] pt-3.5 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#FAF7F0] border-2 border-[#121212] flex items-center justify-center">
              <img
                src={getPixelSprite(
                  seconds < 45 ? 'monitoring' : seconds < 90 ? 'health_factor' : 'yield'
                )}
                alt="demo sprite"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getPixelSprite('monitoring', 'idle');
                }}
                className="w-8 h-8 object-contain"
              />
            </div>
            <span className="font-mono-tech text-xs text-[#6A6A6A]">
              Jump directly to the interactive live page for this phase.
            </span>
          </div>

          <button
            onClick={() => onNavigate(currentStep.targetView)}
            className="w-full sm:w-auto neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-xs px-5 py-2 flex items-center justify-center space-x-2"
          >
            <span>JUMP TO {currentStep.targetView.toUpperCase()} VIEW</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
