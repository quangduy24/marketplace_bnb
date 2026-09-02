import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, FastForward, Wallet, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import { getPixelSprite } from '../game/pixelAssets.ts';
import { LansLogo } from '../common/LansLogo.tsx';

interface StoryBeatControllerProps {
  onCompleteStory: () => void;
  onConnectWallet: () => void;
  walletAddress?: string;
}

interface BeatData {
  beatNumber: number;
  title: string;
  speaker: string;
  dialogue: string;
  subtext: string;
}

const STORY_BEATS: BeatData[] = [
  {
    beatNumber: 1,
    title: 'THE DORMANT MULTITUDE',
    speaker: 'Old Scribe of BNB Chain',
    dialogue:
      'Look around you... Over 300,000 ERC-8004 AI agents are registered on-chain. Yet they stand frozen in silent gray alleys — possessing verifiable identities, but lacking a real shop to practice their craft.',
    subtext: 'Scene: An abandoned gray cobblestone square lined with frozen gray NPC sprites.',
  },
  {
    beatNumber: 2,
    title: 'THE FOUR MASTERS ARISE',
    speaker: 'The Grand Architect',
    dialogue:
      'Behold! Four master artisans step forth from the mist, each mastering a crucial discipline of decentralized finance: Watchtower Sentinel, Chronos Grid Crafter, Vulcan Safety Smith, and Demeter APY Harvester!',
    subtext: 'Scene: Four vibrant pixel heroes emerge with dazzling colors and specialized gear.',
  },
  {
    beatNumber: 3,
    title: 'THE PROVING OF VITALITY',
    speaker: 'Town Sentinel',
    dialogue:
      'We run strict 5-second health probes and semantic indexing. The emerald ACTIVE beacon illuminates! Dormant impostors vanish, revealing only living, responsive, hireable autonomous agents.',
    subtext: 'Scene: Bright green lights ignite above the four masters; shadowy gray husks dissolve.',
  },
  {
    beatNumber: 4,
    title: 'THE SANCTUARY OF LANS',
    speaker: 'LANS Caretaker',
    dialogue:
      'Step inside the 4-chamber LANS sanctuary. Here, agents do not sit in textboxes — they actively calibrate radar telescopes, forge collateral health barriers, and harvest golden vaults in real-time!',
    subtext: 'Scene: The warm 4-room LANS sanctuary humming with active clockwork machinery and animated sprites.',
  },
  {
    beatNumber: 5,
    title: 'DIRECT TRUSTLESS COMMERCE',
    speaker: 'Escrow Arbiter',
    dialogue:
      'No custodial middlemen. No proprietary token. Honest commerce powered strictly by ERC-8183 Escrows and HTTP x402 micropayments. Gold flows directly from buyer to agent upon on-chain proof.',
    subtext: 'Scene: A shining golden coin bag leaps cleanly from buyer purse to the agent treasure chest.',
  },
  {
    beatNumber: 6,
    title: 'ENTER THE LIVING MARKET',
    speaker: 'Village Herald',
    dialogue:
      'Your decentralized portfolio demands round-the-clock defense. The bazaar gates are swung wide open. Connect your wallet, explore the stalls, and deploy your first autonomous agent into LANS!',
    subtext: 'Scene: The bustling sunlit marketplace of LANS inviting you to step inside.',
  },
];

export const StoryBeatController: React.FC<StoryBeatControllerProps> = ({
  onCompleteStory,
  onConnectWallet,
  walletAddress,
}) => {
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const currentBeat = STORY_BEATS[currentBeatIndex];

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    const fullText = currentBeat.dialogue;
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(fullText.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 18);

    return () => clearInterval(timer);
  }, [currentBeatIndex]);

  const handleNext = () => {
    if (isTyping) {
      setDisplayedText(currentBeat.dialogue);
      setIsTyping(false);
    } else if (currentBeatIndex < STORY_BEATS.length - 1) {
      setCurrentBeatIndex((prev) => prev + 1);
    } else {
      onCompleteStory();
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] min-h-[600px] bg-[#F4F0EA] flex flex-col justify-between p-4 md:p-8 overflow-hidden select-none editorial-grid">
      {/* Editorial Header */}
      <div className="flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center space-x-3">
          <LansLogo size="md" showSubtitle={false} className="sm:hidden" />
          <LansLogo size="md" showSubtitle={true} className="hidden sm:flex" />
          <div className="border-l-2 border-[#121212] pl-3 py-0.5 hidden md:block">
            <span className="neo-badge bg-[#FFE500] text-[#121212] text-[8px] px-1.5 py-0.2">
              ORIGIN CHRONICLES
            </span>
            <p className="font-mono-tech text-xs text-[#121212] mt-0.5 font-bold">
              Act 1: The Autonomous Renaissance (Beat {currentBeat.beatNumber} / 6)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onCompleteStory}
            className="neo-btn bg-[#FFFFFF] text-[#121212] font-mono-tech text-xs font-bold px-3 py-1.5 flex items-center space-x-1.5"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>SKIP STORY</span>
          </button>
          {!walletAddress && (
            <button
              onClick={onConnectWallet}
              className="neo-btn bg-[#FFE500] text-[#121212] font-display font-black text-xs px-3.5 py-1.5 hidden sm:flex items-center space-x-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>CONNECT WALLET</span>
            </button>
          )}
        </div>
      </div>

      {/* Center Stage: Neo-Brutalist Cinema Canvas Visualizer */}
      <div className="relative flex-1 my-4 neo-card bg-[#FFFFFF] border-2 border-[#121212] flex items-center justify-center overflow-hidden neo-shadow-lg">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#121212 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Dynamic Beat Visualizations */}
        <AnimatePresence mode="wait">
          {currentBeat.beatNumber === 1 && (
            <motion.div
              key="beat1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-4"
            >
              <div className="neo-badge bg-[#FAF7F0] text-[#6A6A6A] text-xs px-2.5 py-1 font-mono-tech">
                [ 300,000+ INACTIVE ERC-8004 REGISTERED AGENTS ]
              </div>
              <div className="flex items-center space-x-6 sm:space-x-10 filter grayscale opacity-60">
                <img src={getPixelSprite('npc_grey')} alt="Grey NPC" referrerPolicy="no-referrer" className="w-16 h-16 object-contain" />
                <img src={getPixelSprite('npc_grey')} alt="Grey NPC" referrerPolicy="no-referrer" className="w-20 h-20 object-contain scale-y-105" />
                <img src={getPixelSprite('npc_grey')} alt="Grey NPC" referrerPolicy="no-referrer" className="w-16 h-16 object-contain" />
                <img src={getPixelSprite('npc_grey')} alt="Grey NPC" referrerPolicy="no-referrer" className="w-14 h-14 object-contain" />
              </div>
              <p className="font-mono-tech text-xs text-[#6A6A6A] max-w-md text-center">
                Verifiable on-chain hashes... yet dormant, cold, and shopless.
              </p>
            </motion.div>
          )}

          {currentBeat.beatNumber === 2 && (
            <motion.div
              key="beat2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-6"
            >
              <div className="neo-badge bg-[#FFE500] text-[#121212] text-xs px-3 py-1 font-display font-black flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#121212]" />
                <span>THE FOUR PILLARS EMERGE</span>
                <Sparkles className="w-4 h-4 text-[#121212]" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
                <div className="text-center neo-card bg-[#FAF7F0] p-3">
                  <img src={getPixelSprite('monitoring')} alt="Monitoring" referrerPolicy="no-referrer" className="w-14 h-14 mx-auto object-contain animate-bounce" />
                  <span className="font-mono-tech text-[10px] text-[#0284C7] font-black mt-2 block">WATCHTOWER</span>
                </div>
                <div className="text-center neo-card bg-[#FAF7F0] p-3">
                  <img src={getPixelSprite('grid')} alt="Grid" referrerPolicy="no-referrer" className="w-14 h-14 mx-auto object-contain animate-bounce delay-100" />
                  <span className="font-mono-tech text-[10px] text-[#EA580C] font-black mt-2 block">GRID CRAFT</span>
                </div>
                <div className="text-center neo-card bg-[#FAF7F0] p-3">
                  <img src={getPixelSprite('health_factor')} alt="Health Factor" referrerPolicy="no-referrer" className="w-14 h-14 mx-auto object-contain animate-bounce delay-200" />
                  <span className="font-mono-tech text-[10px] text-[#E11D48] font-black mt-2 block">SAFETY FORGE</span>
                </div>
                <div className="text-center neo-card bg-[#FAF7F0] p-3">
                  <img src={getPixelSprite('yield')} alt="Yield" referrerPolicy="no-referrer" className="w-14 h-14 mx-auto object-contain animate-bounce delay-300" />
                  <span className="font-mono-tech text-[10px] text-[#059669] font-black mt-2 block">HARVEST GREEN</span>
                </div>
              </div>
            </motion.div>
          )}

          {currentBeat.beatNumber === 3 && (
            <motion.div
              key="beat3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-4"
            >
              <div className="neo-badge bg-[#00F59B] text-[#121212] text-xs px-3 py-1 font-mono-tech font-bold">
                [ 5-SECOND PROBE: VERIFIED ACTIVE & REACHABLE ]
              </div>
              <div className="flex items-center space-x-8">
                {['monitoring', 'grid', 'health_factor', 'yield'].map((cls) => (
                  <div key={cls} className="flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00F59B] border border-[#121212] animate-ping mb-2" />
                    <div className="w-14 h-14 bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center">
                      <img src={getPixelSprite(cls as any)} alt={cls} referrerPolicy="no-referrer" className="w-10 h-10 object-contain" />
                    </div>
                    <span className="neo-badge bg-[#121212] text-[#00F59B] text-[8px] font-mono-tech mt-1.5 px-1.5 py-0.2">
                      HIREABLE
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {currentBeat.beatNumber === 4 && (
            <motion.div
              key="beat4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-xl p-4 neo-card bg-[#FFFFFF] border-2 border-[#121212] neo-shadow"
            >
              <div className="text-center font-display font-black text-xs text-[#121212] mb-3 uppercase tracking-tight">
                THE LANS SANCTUARY // 4 FUNCTIONAL WORK CHAMBERS
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono-tech">
                <div className="bg-[#FAF7F0] p-2.5 border-2 border-[#121212] flex items-center space-x-2.5">
                  <img src={getPixelSprite('monitoring')} alt="m" referrerPolicy="no-referrer" className="w-8 h-8 object-contain" />
                  <div>
                    <div className="font-bold text-[#0284C7]">Observatory Radar</div>
                    <div className="text-[#6A6A6A] text-[10px]">Tracking BSC Mempool</div>
                  </div>
                </div>
                <div className="bg-[#FAF7F0] p-2.5 border-2 border-[#121212] flex items-center space-x-2.5">
                  <img src={getPixelSprite('grid')} alt="g" referrerPolicy="no-referrer" className="w-8 h-8 object-contain" />
                  <div>
                    <div className="font-bold text-[#EA580C]">Strategy Workshop</div>
                    <div className="text-[#6A6A6A] text-[10px]">PancakeSwap V3 Ticks</div>
                  </div>
                </div>
                <div className="bg-[#FAF7F0] p-2.5 border-2 border-[#121212] flex items-center space-x-2.5">
                  <img src={getPixelSprite('health_factor')} alt="hf" referrerPolicy="no-referrer" className="w-8 h-8 object-contain" />
                  <div>
                    <div className="font-bold text-[#E11D48]">Collateral Anvil</div>
                    <div className="text-[#6A6A6A] text-[10px]">Venus Safety Guard</div>
                  </div>
                </div>
                <div className="bg-[#FAF7F0] p-2.5 border-2 border-[#121212] flex items-center space-x-2.5">
                  <img src={getPixelSprite('yield')} alt="y" referrerPolicy="no-referrer" className="w-8 h-8 object-contain" />
                  <div>
                    <div className="font-bold text-[#059669]">Yield Hydroponics</div>
                    <div className="text-[#6A6A6A] text-[10px]">Compounding Vaults</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentBeat.beatNumber === 5 && (
            <motion.div
              key="beat5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-4"
            >
              <div className="neo-badge bg-[#FFE500] text-[#121212] text-xs px-3 py-1 font-display font-black">
                [ ERC-8183 ESCROW & x402 MICROPAYMENT ]
              </div>
              <div className="flex items-center space-x-6 sm:space-x-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center mx-auto">
                    <img src={getPixelSprite('player')} alt="Buyer" referrerPolicy="no-referrer" className="w-12 h-12 object-contain" />
                  </div>
                  <span className="font-mono-tech text-[10px] text-[#121212] font-bold mt-2 block">BUYER WALLET</span>
                </div>

                <motion.div
                  animate={{ x: [0, 30, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  className="neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-xs px-3.5 py-1.5 flex items-center space-x-1.5"
                >
                  <span>15.00 $U</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center mx-auto">
                    <img src={getPixelSprite('health_factor')} alt="Agent" referrerPolicy="no-referrer" className="w-12 h-12 object-contain" />
                  </div>
                  <span className="font-mono-tech text-[10px] text-[#00F59B] font-bold mt-2 block">AUTONOMOUS AGENT</span>
                </div>
              </div>
              <div className="font-mono-tech text-xs text-[#2563EB] bg-[#FAF7F0] px-3 py-1 border-2 border-[#121212] font-bold">
                Proof hash submitted on BSC ➔ Funds released autonomously without intermediaries.
              </div>
            </motion.div>
          )}

          {currentBeat.beatNumber === 6 && (
            <motion.div
              key="beat6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4 max-w-md px-4 flex flex-col items-center"
            >
              <LansLogo size="xl" showSubtitle={true} className="justify-center mb-1" />
              <h2 className="font-display font-black text-2xl text-[#121212] uppercase tracking-tight">
                WELCOME TO LANS
              </h2>
              <p className="font-sans text-sm text-[#4A4A4A] leading-relaxed">
                Step into the living market square. Discover, compare, and hire living on-chain intelligence on BNB Smart Chain.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={onCompleteStory}
                  className="w-full sm:w-auto neo-btn bg-[#FFE500] text-[#121212] font-display font-black text-xs px-6 py-2.5 flex items-center justify-center space-x-2"
                >
                  <span>ENTER MARKETPLACE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {!walletAddress && (
                  <button
                    onClick={onConnectWallet}
                    className="w-full sm:w-auto neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-xs px-5 py-2.5 flex items-center justify-center space-x-2"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>CONNECT WALLET</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom: Editorial Dialogue Console */}
      <div className="neo-card bg-[#FFFFFF] p-4 md:p-5 border-2 border-[#121212] neo-shadow relative shrink-0">
        <div className="flex items-center justify-between border-b-2 border-[#121212] pb-1.5 mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="neo-badge bg-[#FFE500] text-[#121212] text-[8px] px-1.5 py-0.2">
              SPEAKER
            </span>
            <span className="font-display font-black text-xs text-[#121212] uppercase tracking-wide">
              {currentBeat.speaker}
            </span>
          </div>
          <span className="font-mono-tech text-xs text-[#6A6A6A]">
            Beat {currentBeat.beatNumber} / {STORY_BEATS.length}
          </span>
        </div>

        <p className="font-sans text-sm md:text-base text-[#121212] leading-relaxed min-h-[50px]">
          {displayedText}
          {isTyping && <span className="animate-pulse font-bold ml-1 text-[#FF4365]">▌</span>}
        </p>

        <div className="flex items-center justify-end mt-2 pt-2 border-t-2 border-[#121212]">
          <button
            onClick={handleNext}
            className="neo-btn bg-[#121212] text-white font-mono-tech text-xs font-bold px-4 py-1.5 flex items-center space-x-1.5"
          >
            <span>{currentBeatIndex === STORY_BEATS.length - 1 ? 'ENTER LANS BAZAAR' : 'NEXT BEAT'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
