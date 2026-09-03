import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, FastForward, Wallet, Sparkles, ChevronRight, ShieldCheck, Activity, Search, Zap, Database, Eye, Brain, Map, Crosshair, Hammer, Coins } from 'lucide-react';
import { getPixelSprite } from '../game/pixelAssets.ts';
import { LansLogo } from '../common/LansLogo.tsx';
import { AppView } from '../../types.ts';

interface StoryBeatControllerProps {
  onCompleteStory: () => void;
  onConnectWallet: () => void;
  onNavigate?: (view: AppView) => void;
  walletAddress?: string;
}

interface BeatData {
  beatNumber: number;
  title: string;
  speaker: string;
  dialogue: string;
  subtext: string;
  accent: string;
}

const STORY_BEATS: BeatData[] = [
  {
    beatNumber: 1,
    title: 'THE DORMANT MULTITUDE',
    speaker: 'Old Scribe of BNB Chain',
    dialogue:
      'Gaze upon the ledger — 300,011 ERC-8004 identities are etched into BNB Smart Chain (registry 0x8004…432, Chain 56) via api.8004scan.io. Each bears a verifiable tokenId and on-chain hash, yet they lie frozen in gray alleys, without a bazaar, without a heartbeat, without a hireable light.',
    subtext: 'SCENE: A vast gray plaza under a cold sky. 300k stone sigils line the walls, their sigil-light dim. A distant counter ticks: 300,011.',
    accent: '#6A6A6A',
  },
  {
    beatNumber: 2,
    title: 'THE VERIFICATION VOID',
    speaker: 'Indexer Oracle',
    dialogue:
      'The indexer scrolls forever — but who is alive? `is_active` flickers, `is_endpoint_verified` stays false, and `a2a_endpoint` returns 404 with `{agentId}` still unreplaced. Hireable is a lie until a probe truly answers. Without verification, a buyer buys a ghost.',
    subtext: 'SCENE: A towering black ledger flickers with `404 — is_endpoint_verified: false`. Ghostly agent silhouettes flicker and fade.',
    accent: '#F59E0B',
  },
  {
    beatNumber: 3,
    title: 'THE FOUR MASTERS ARISE',
    speaker: 'The Grand Architect',
    dialogue:
      'From the mist step four master artisans, each bound to a LANS stall: Watchtower Sentinel (mempool & whale radar), Chronos Grid Crafter (PancakeSwap V3 ticks), Vulcan Safety Smith (Venus Health Factor), and Demeter Harvester (APY vaults). Their beacons will define the bazaar.',
    subtext: 'SCENE: Four vibrant masters emerge — cobalt, amber, crimson, emerald — sigils glowing as the mist parts.',
    accent: '#FFE500',
  },
  {
    beatNumber: 4,
    title: 'THE PROVING OF VITALITY',
    speaker: 'Town Sentinel',
    dialogue:
      'We unleash the rite of proving: HEAD → GET within 5,000ms, `{agentId}` substituted by real `tokenId`, any response < 500 counts as alive. Indexer truth `is_endpoint_verified` is trusted first; live probes catch the rest. Yesterday, 15 lived. After the rite, 61 breathe — 44 survive the strict hireable filter.',
    subtext: 'SCENE: Emerald ping beams sweep four sigils. Dots flip: gray → green. A tally board flicks 15 → 61.',
    accent: '#00F59B',
  },
  {
    beatNumber: 5,
    title: 'THE SANCTUARY OF LANS',
    speaker: 'LANS Caretaker',
    dialogue:
      'Step through the arch into the sanctuary — four chambers, four machines, always ticking: Observatory Radar for the mempool, Strategy Workshop for V3 ranges, Collateral Anvil for Venus loans, and Yield Hydroponics for vault compounding. No textboxes — only clockwork.',
    subtext: 'SCENE: Warm 4-room sanctuary, brass gears turning, telescopes swiveling, anvils glowing, vines of yield sprouting.',
    accent: '#38BDF8',
  },
  {
    beatNumber: 6,
    title: 'THE HEURISTIC COMPASS',
    speaker: 'Risk Oracle',
    dialogue:
      'Your wallet is the compass. We read Venus Comptroller 0xf272…8209 via `getAccountLiquidity`, fetch Pancake V3 ranges, and idle stablecoins. Calm: wH=0.35. Emergency (HF < 1.15 or shortfall): wH→0.70. Then finalScore = wH·heuristic + 0.35·content + wB·Thompson(Beta) — ranking snaps to the shield you need.',
    subtext: 'SCENE: A compass spins — HEALTH: 2.45 HF (calm) slams to 0.95 HF (DEFENSE). The bazaar reorders, Vulcan surges to top.',
    accent: '#FF4365',
  },
  {
    beatNumber: 7,
    title: 'TRUSTLESS COMMERCE',
    speaker: 'Escrow Arbiter',
    dialogue:
      'No custodians. No platform token. A quote (`/api/hires/prepare`) locks budget and deadline; you connect via EIP-6963 (MetaMask/Binance/Trust), then `personal_sign` a free message — “LANS… This signature costs no gas” — verified on BNB Chain. Escrow is ERC-8183 or x402; funds move only on proof.',
    subtext: 'SCENE: A golden coin pouch arcs buyer → agent, pausing mid-air inside a crystalline escrow cage until a proof hash lands.',
    accent: '#A855F7',
  },
  {
    beatNumber: 8,
    title: 'ENTER THE LIVING MARKET',
    speaker: 'Village Herald',
    dialogue:
      'The gates are warm, the plaza (`lans.work/plaza`) is first. The bazaar (`/market`) holds 188 living agents, the sanctuary (`/agents`) watches your hires, the logbook (`/history`) immutabilizes proofs, and the treasury (`/treasury`) tallies alpha. Connect and deploy — LANS is alive.',
    subtext: 'SCENE: Sunlight floods the plaza. Banners read /plaza · /market · /agents · /history · /treasury. Your first deployment awaits.',
    accent: '#FACC15',
  },
];

export const StoryBeatController: React.FC<StoryBeatControllerProps> = ({
  onCompleteStory,
  onConnectWallet,
  onNavigate,
  walletAddress,
}) => {
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [liveStats, setLiveStats] = useState<{ total: number; active: number } | null>(null);
  const [probeState, setProbeState] = useState<'idle' | 'probing' | 'done'>('idle');
  const [compassHF, setCompassHF] = useState(2.45);

  const currentBeat = STORY_BEATS[currentBeatIndex];
  const navigate = onNavigate || (onCompleteStory as any);

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
    }, 14);
    return () => clearInterval(timer);
  }, [currentBeatIndex]);

  useEffect(() => {
    fetch('/api/agents?activeOnly=true').then(r => r.json()).then(d => setLiveStats({ total: d.total ?? 0, active: d.total ?? 0 })).catch(() => {});
  }, []);

  // Compass live flicker for beat 6
  useEffect(() => {
    if (currentBeat.beatNumber !== 6) return;
    const t = setInterval(() => setCompassHF(v => (v > 1.5 ? 0.95 : 2.45)), 1800);
    return () => clearInterval(t);
  }, [currentBeat.beatNumber]);

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

  const triggerProbeDemo = () => {
    setProbeState('probing');
    fetch('/api/workers/probe', { method: 'POST' }).then(() => setProbeState('done')).catch(() => setProbeState('done'));
    setTimeout(() => setProbeState('idle'), 3000);
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] min-h-[600px] bg-[#F4F0EA] flex flex-col justify-between p-4 md:p-8 overflow-hidden select-none editorial-grid">
      {/* Film Letterbox Bars - cinematic */}
      <motion.div initial={{ height: 0 }} animate={{ height: 18 }} className="absolute top-0 left-0 right-0 bg-[#121212] z-30 flex items-center justify-center">
        <span className="font-mono-tech text-[8px] text-[#FFE500] tracking-[0.3em]">LANS • AUTONOMOUS SANCTUARY • BNB CHAIN</span>
      </motion.div>
      <motion.div initial={{ height: 0 }} animate={{ height: 18 }} className="absolute bottom-0 left-0 right-0 bg-[#121212] z-30 flex items-center justify-center">
        <span className="font-mono-tech text-[8px] text-[#6A6A6A] tracking-widest">ERC-8004 • ERC-8183 • x402 • 8004scan • Venus</span>
      </motion.div>

      {/* Editorial Header */}
      <div className="flex items-center justify-between z-20 shrink-0 mt-4">
        <div className="flex items-center space-x-3">
          <LansLogo size="md" showSubtitle={false} className="sm:hidden" />
          <LansLogo size="md" showSubtitle={true} className="hidden sm:flex" />
          <div className="border-l-2 border-[#121212] pl-3 py-0.5 hidden md:block">
            <span className="neo-badge bg-[#FFE500] text-[#121212] text-[8px] px-1.5 py-0.2">
              ORIGIN CHRONICLES — CINEMATIC
            </span>
            <p className="font-mono-tech text-xs text-[#121212] mt-0.5 font-bold">
              Act 1: The Autonomous Renaissance — Beat {currentBeat.beatNumber} / {STORY_BEATS.length}
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
          {!walletAddress ? (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onConnectWallet} className="neo-btn bg-[#FFE500] text-[#121212] font-display font-black text-xs px-3.5 py-1.5 hidden sm:flex items-center space-x-1.5 shadow-[0_0_12px_rgba(255,229,0,0.5)]">
              <Wallet className="w-3.5 h-3.5" />
              <span>CONNECT WALLET</span>
            </motion.button>
          ) : (
            <span className="neo-badge bg-[#00F59B] text-[#121212] text-[9px] px-2 py-1 font-bold hidden sm:flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>{walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3 shrink-0">
        {STORY_BEATS.map((b, idx) => (
          <motion.button
            key={b.beatNumber}
            onClick={() => setCurrentBeatIndex(idx)}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            className={`h-1.5 rounded-full transition-all border border-[#121212] ${
              idx === currentBeatIndex ? 'w-8 bg-[#121212]' : idx < currentBeatIndex ? 'w-3 bg-[#00F59B]' : 'w-3 bg-[#FFFFFF]'
            }`}
            title={b.title}
          />
        ))}
      </div>

      {/* Center Stage: Cinematic Canvas */}
      <div className="relative flex-1 my-4 neo-card bg-[#FFFFFF] border-2 border-[#121212] flex items-center justify-center overflow-hidden neo-shadow-lg">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#121212 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />
        {/* Accent glow + spotlight sweep */}
        <motion.div
          key={`glow-${currentBeat.beatNumber}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.14 }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(650px circle at 50% 20%, ${currentBeat.accent}, transparent 70%)` }}
        />
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
          className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
          style={{ transform: 'skewX(-12deg)' }}
        />

        <AnimatePresence mode="wait">
          {currentBeat.beatNumber === 1 && (
            <motion.div
              key="beat1"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center space-y-4 p-4 w-full max-w-2xl"
            >
              <motion.div initial={{ scale: 0.9, y: 6 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} className="neo-badge bg-[#121212] text-[#FFE500] text-xs px-4 py-1.5 font-mono-tech flex items-center space-x-2 border border-[#FFE500]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}><Database className="w-3.5 h-3.5" /></motion.div>
                <span>{liveStats ? `${liveStats.active} ACTIVE / 300,011 REGISTERED` : 'LOADING LIVE STATS...'}</span>
                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 bg-[#00F59B] rounded-full" />
              </motion.div>
              <div className="flex items-end space-x-4 sm:space-x-8">
                {[
                  { sprite: 'npc_grey', delay: 0, x: -12 },
                  { sprite: 'npc_grey', delay: 0.1, x: 8, scale: 1.1 },
                  { sprite: 'npc_grey', delay: 0.2, x: -6 },
                  { sprite: 'npc_grey', delay: 0.3, x: 10 },
                ].map((p, i) => (
                  <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: p.delay, type: 'spring', stiffness: 120 }} className="relative">
                    <motion.img animate={{ y: [0, -3, 0] }} transition={{ duration: 1.6 + i * 0.2, repeat: Infinity, ease: 'easeInOut' }} src={getPixelSprite(p.sprite)} alt="Grey NPC" referrerPolicy="no-referrer" className="w-16 h-16 sm:w-20 sm:h-20 object-contain filter grayscale opacity-60" style={{ transform: `translateX(${p.x}px)` }} />
                    <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-black/20 rounded-full blur-[2px]" />
                    <motion.span animate={{ opacity: [0, 1, 0], y: [0, -8, -12] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4, repeatDelay: 1 }} className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-mono-tech text-[#6A6A6A]">zZ</motion.span>
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setCurrentBeatIndex(1)} className="neo-badge bg-[#FAF7F0] border-2 border-[#121212] text-xs px-3 py-1 font-bold flex items-center space-x-1"><Eye className="w-3 h-3" /><span>INSPECT LEDGER</span></motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onCompleteStory} className="neo-badge bg-[#FFE500] border-2 border-[#121212] text-xs px-3 py-1 font-black flex items-center space-x-1"><Map className="w-3 h-3" /><span>ENTER PLAZA</span></motion.button>
              </div>
            </motion.div>
          )}

          {currentBeat.beatNumber === 2 && (
            <motion.div
              key="beat2-void"
              initial={{ opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(6px)' }}
              className="flex flex-col items-center justify-center space-y-4 p-4 max-w-lg w-full"
            >
              <motion.div initial={{ scale: 0.95, rotate: -1 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 100 }} className="neo-card bg-[#121212] text-[#FF6B6B] border-2 border-[#FF6B6B] p-3 font-mono-tech text-xs w-full shadow-[0_0_20px_rgba(255,107,107,0.3)]">
                <motion.div animate={{ x: [-1, 1, -1] }} transition={{ duration: 0.15, repeat: Infinity }} className="flex items-center space-x-2 mb-1 font-bold"><Search className="w-3.5 h-3.5" /><span>api.8004scan.io — is_endpoint_verified: false ✕</span></motion.div>
                <div className="text-[#A0A0A0] font-mono-tech text-[11px]">a2a_endpoint: https://.../a2a/agents/{'{agentId}'}/card → <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="text-[#FF6B6B] font-bold">404</motion.span></div>
                <div className="text-[#A0A0A0]">labels: [uncategorized] · hireable: false</div>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex -space-x-2">
                {[0,1,2].map(i => (
                  <motion.img key={i} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 0.4, y: 0 }} transition={{ delay: 0.5 + i*0.1 }} src={getPixelSprite('npc_grey')} alt="ghost" className="w-10 h-10 object-contain filter grayscale opacity-40" />
                ))}
              </motion.div>
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setCurrentBeatIndex(3)} className="neo-btn bg-[#FF6B6B] text-white text-xs font-black px-3 py-1.5 flex items-center space-x-1"><Activity className="w-3.5 h-3.5" /><span>EXPOSE GHOSTS</span></motion.button>
                <button onClick={() => window.open('https://api.8004scan.io', '_blank')} className="neo-btn bg-white border-2 border-[#121212] text-xs font-bold px-3 py-1.5">VIEW SCAN</button>
              </div>
            </motion.div>
          )}

          {currentBeat.beatNumber === 3 && (
            <motion.div
              key="beat3-masters"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.6, type: 'spring' }}
              className="flex flex-col items-center justify-center space-y-4 w-full max-w-3xl p-2"
            >
              <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="neo-badge bg-[#FFE500] text-[#121212] text-xs px-4 py-1 font-display font-black flex items-center space-x-2 shadow-lg">
                <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}><Sparkles className="w-4 h-4 text-[#121212]" /></motion.div>
                <span>THE FOUR PILLARS EMERGE</span>
                <Sparkles className="w-4 h-4 text-[#121212]" />
              </motion.div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
                {[
                  { k: 'monitoring', label: 'WATCHTOWER', sub: 'SEC.01 · 81 agents', color: '#0284C7', desc: 'Mempool radar' },
                  { k: 'grid', label: 'GRID CRAFT', sub: 'DEX.02 · 78 agents', color: '#EA580C', desc: 'V3 ticks' },
                  { k: 'health_factor', label: 'SAFETY FORGE', sub: 'RISK.03 · 30 agents', color: '#E11D48', desc: 'Venus guard' },
                  { k: 'yield', label: 'HARVEST GREEN', sub: 'APY.04 · 56 agents', color: '#059669', desc: 'Vaults' },
                ].map((m, i) => (
                  <motion.div key={m.k} initial={{ y: 30, opacity: 0, rotate: -2 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.1 + i * 0.09, type: 'spring', stiffness: 120 }} whileHover={{ y: -4, scale: 1.03 }} className="text-center neo-card bg-[#FAF7F0] p-3 cursor-pointer group">
                    <motion.img whileHover={{ scale: 1.1, rotate: 2 }} src={getPixelSprite(m.k as any)} alt={m.label} referrerPolicy="no-referrer" className="w-14 h-14 sm:w-16 sm:h-16 mx-auto object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]" animate={{ y: [0, -3, 0] }} transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }} />
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.08 }} className="font-mono-tech text-[10px] font-black mt-2 block" style={{ color: m.color }}>{m.label}</motion.span>
                    <span className="font-mono-tech text-[9px] text-[#6A6A6A]">{m.sub}</span>
                    <motion.div whileHover={{ width: '100%' }} className="h-0.5 mt-1 mx-auto w-6 group-hover:w-full transition-all" style={{ background: m.color }} />
                  </motion.div>
                ))}
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex gap-2">
                <button onClick={() => setCurrentBeatIndex(3)} className="neo-btn bg-[#121212] text-white text-xs font-bold px-3 py-1.5 flex items-center space-x-1"><Eye className="w-3.5 h-3.5" /><span>WATCH THEM BREATHE</span></button>
              </motion.div>
            </motion.div>
          )}

          {currentBeat.beatNumber === 4 && (
            <motion.div
              key="beat4-prove"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-4 w-full max-w-md"
            >
              <motion.div animate={{ scale: [1, 1.02, 1], boxShadow: ['0 0 0px rgba(0,245,155,0)', '0 0 12px rgba(0,245,155,0.4)', '0 0 0px rgba(0,245,155,0)'] }} transition={{ duration: 1.2, repeat: Infinity }} className="neo-badge bg-[#00F59B] text-[#121212] text-xs px-4 py-1.5 font-mono-tech font-bold flex items-center space-x-2 cursor-pointer border-2 border-[#121212]" onClick={triggerProbeDemo}>
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}><Activity className="w-3.5 h-3.5" /></motion.div>
                <span>5-SECOND PROBE — {`{agentId}`} → tokenId · {probeState === 'probing' ? 'PROBING...' : probeState === 'done' ? '61 VERIFIED ✓' : 'TAP TO PROBE'}</span>
              </motion.div>
              <div className="flex items-center space-x-4 sm:space-x-6">
                {['monitoring', 'grid', 'health_factor', 'yield'].map((cls, i) => (
                  <motion.div key={cls} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.1, type: 'spring' }} whileHover={{ y: -3, scale: 1.05 }} className="flex flex-col items-center cursor-pointer" onClick={triggerProbeDemo}>
                    <motion.span animate={probeState === 'probing' ? { scale: [1, 1.6, 1], opacity: [1, 0.6, 1] } : probeState === 'done' ? { scale: 1 } : {}} transition={{ duration: 0.6, repeat: probeState === 'probing' ? Infinity : 0 }} className={`w-3 h-3 rounded-full border-2 border-[#121212] mb-2 ${probeState === 'done' ? 'bg-[#00F59B]' : probeState === 'probing' ? 'bg-[#FFE500]' : 'bg-[#A0A0A0]'}`} />
                    <motion.div whileHover={{ rotate: 3 }} className="w-14 h-14 sm:w-16 sm:h-16 bg-[#FAF7F0] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center relative overflow-hidden">
                      <motion.div animate={probeState === 'probing' ? { x: ['-100%', '200%'] } : {}} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00F59B]/30 to-transparent" style={{ transform: 'skewX(-20deg)' }} />
                      <img src={getPixelSprite(cls as any, probeState === 'done' ? 'working' : 'idle')} alt={cls} referrerPolicy="no-referrer" className="w-10 h-10 sm:w-12 sm:h-12 object-contain relative z-10" />
                    </motion.div>
                    <motion.span animate={probeState === 'done' ? { scale: [1, 1.1, 1] } : {}} transition={{ delay: i * 0.08 }} className={`neo-badge text-[8px] font-mono-tech mt-1.5 px-1.5 py-0.5 font-bold border border-[#121212] ${probeState === 'done' ? 'bg-[#121212] text-[#00F59B]' : 'bg-[#E5E0D5] text-[#6A6A6A]'}`}>{probeState === 'done' ? 'HIREABLE' : 'STANDBY'}</motion.span>
                  </motion.div>
                ))}
              </div>
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.6, duration: 0.8 }} className="font-mono-tech text-[11px] bg-[#121212] text-[#00F59B] px-3 py-1 border-2 border-[#121212] flex items-center space-x-2">
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.5, repeat: Infinity }} className="w-1.5 h-1.5 bg-[#00F59B] rounded-full" />
                <span>{probeState === 'done' ? '61 reachable · 44 verified-only · LIVE' : probeState === 'probing' ? 'Probing 4 endpoints... <500 = alive' : '15 → 61 reachable after template fix'}</span>
              </motion.div>
            </motion.div>
          )}

          {currentBeat.beatNumber === 5 && (
            <motion.div
              key="beat5-sanctuary"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-xl p-4 neo-card bg-[#FFFFFF] border-2 border-[#121212] neo-shadow"
            >
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center font-display font-black text-xs text-[#121212] mb-3 uppercase tracking-tight flex items-center justify-center space-x-2">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}><Eye className="w-3.5 h-3.5" /></motion.div>
                <span>THE LANS SANCTUARY // 4 FUNCTIONAL WORK CHAMBERS</span>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border-2 border-[#121212] border-t-[#00F59B] rounded-full" />
              </motion.div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono-tech">
                {[
                  { icon: 'monitoring', title: 'Observatory Radar', desc: 'Tracking BSC Mempool', color: '#0284C7', pulse: 0 },
                  { icon: 'grid', title: 'Strategy Workshop', desc: 'PancakeSwap V3 Ticks', color: '#EA580C', pulse: 0.15 },
                  { icon: 'health_factor', title: 'Collateral Anvil', desc: 'Venus Safety Guard', color: '#E11D48', pulse: 0.3 },
                  { icon: 'yield', title: 'Yield Hydroponics', desc: 'Compounding Vaults', color: '#059669', pulse: 0.45 },
                ].map((ch, i) => (
                  <motion.div key={ch.title} initial={{ x: i % 2 === 0 ? -12 : 12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.08, type: 'spring' }} whileHover={{ scale: 1.02, y: -2 }} className="bg-[#FAF7F0] p-2.5 border-2 border-[#121212] flex items-center space-x-2.5 text-left cursor-pointer group">
                    <motion.img animate={{ y: [0, -2, 0] }} transition={{ duration: 2 + ch.pulse, repeat: Infinity, ease: 'easeInOut' }} src={getPixelSprite(ch.icon as any, 'working')} alt={ch.icon} referrerPolicy="no-referrer" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
                    <div><div className="font-bold" style={{ color: ch.color }}>{ch.title}</div><div className="text-[#6A6A6A] text-[10px] flex items-center space-x-1"><motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay: ch.pulse }} className="w-1 h-1 bg-[#00F59B] rounded-full" /><span>{ch.desc}</span></div></div>
                  </motion.div>
                ))}
              </div>
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-3 flex justify-center gap-2">
                <motion.button whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }} onClick={() => navigate ? navigate('agents' as AppView) : onCompleteStory()} className="neo-btn bg-[#00F59B] text-[#121212] text-xs font-black px-4 py-1.5 flex items-center space-x-1 shadow-[0_4px_0_#121212]">
                  <Hammer className="w-3.5 h-3.5" /><span>ENTER SANCTUARY LIVE</span><ArrowRight className="w-3 h-3" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {currentBeat.beatNumber === 6 && (
            <motion.div
              key="beat6-compass"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex flex-col items-center justify-center space-y-3 p-4 max-w-lg w-full"
            >
              <motion.div animate={{ rotate: compassHF < 1.2 ? [0, -4, 4, -4, 0] : 0 }} transition={{ duration: 0.4 }} className={`neo-badge text-xs px-4 py-1.5 font-mono-tech flex items-center space-x-2 border-2 border-[#121212] ${compassHF < 1.2 ? 'bg-[#FF4365] text-white animate-pulse' : 'bg-[#121212] text-[#FFE500]'}`}>
                <Brain className="w-3.5 h-3.5" />
                <span>HEURISTIC COMPASS · wH 0.35 → 0.70</span>
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
              </motion.div>
              <motion.div layout className="neo-card bg-[#FAF7F0] p-3 border-2 border-[#121212] font-mono-tech text-xs w-full space-y-1">
                <div className="flex justify-between"><span className="text-[#6A6A6A]">Venus getAccountLiquidity</span><motion.span whileHover={{ scale: 1.05 }} className="font-bold cursor-pointer" onClick={onConnectWallet}>0xf272…8209 ↗</motion.span></div>
                <div className="flex justify-between items-center"><span className="text-[#6A6A6A]">Health Factor</span>
                  <motion.span key={compassHF} initial={{ scale: 1.3, y: -4 }} animate={{ scale: 1, y: 0 }} className={`font-black px-2 py-0.5 border-2 border-[#121212] ${compassHF < 1.2 ? 'bg-[#FF4365] text-white' : 'bg-[#00F59B] text-[#121212]'}`}>{compassHF.toFixed(2)} {compassHF < 1.2 ? 'EMERGENCY' : 'SAFE'}</motion.span>
                </div>
                <motion.div layout className="flex justify-between"><span className="text-[#6A6A6A]">finalScore</span><span className="font-bold text-[11px]">wH·heuristic + 0.35·content + wB·Beta(α,β)</span></motion.div>
                <motion.div initial={{ width: 0 }} animate={{ width: `${compassHF < 1.2 ? 70 : 35}%` }} className="h-1 bg-[#FF4365] mt-1" />
              </motion.div>
              <div className="flex gap-2 w-full">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onConnectWallet} className="flex-1 neo-btn bg-[#FFE500] text-[#121212] text-xs font-black px-3 py-2 flex items-center justify-center space-x-1">
                  <Wallet className="w-3.5 h-3.5" /><span>{walletAddress ? 'WALLET CONNECTED ✓' : 'CONNECT TO SEE HF'}</span>
                </motion.button>
                <button onClick={() => navigate ? navigate('marketplace' as AppView) : onCompleteStory()} className="neo-btn bg-white border-2 border-[#121212] text-xs font-bold px-3 py-2">OPEN MARKET</button>
              </div>
            </motion.div>
          )}

          {currentBeat.beatNumber === 7 && (
            <motion.div
              key="beat7-escrow"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-4 w-full max-w-md"
            >
              <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="neo-badge bg-[#FFE500] text-[#121212] text-xs px-3 py-1 font-display font-black border-2 border-[#121212] shadow-md">ERC-8183 ESCROW & x402</motion.div>
              <div className="flex items-center justify-between w-full gap-2">
                <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={onConnectWallet} className="flex-1 neo-card bg-[#FAF7F0] border-2 border-[#121212] p-3 text-center group">
                  <motion.div animate={{ y: [0, -2, 0] }} transition={{ duration: 1.4, repeat: Infinity }} className="w-12 h-12 bg-white border-2 border-[#121212] flex items-center justify-center mx-auto group-hover:border-[#00F59B]">
                    <img src={getPixelSprite('player')} alt="Buyer" referrerPolicy="no-referrer" className="w-10 h-10 object-contain" />
                  </motion.div>
                  <span className="font-mono-tech text-[9px] font-bold mt-1 block">BUYER WALLET</span>
                  <span className="font-mono-tech text-[8px] text-[#6A6A6A]">click to connect</span>
                </motion.button>

                <div className="flex flex-col items-center">
                  <motion.div animate={{ x: [0, 4, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }} className="w-6 h-6 bg-[#00F59B] border-2 border-[#121212] rounded-full flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5 text-[#121212]" />
                  </motion.div>
                  <motion.div animate={{ scaleX: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity }} className="w-12 h-0.5 bg-[#121212] mt-1" />
                  <span className="font-mono-tech text-[8px] font-bold mt-1">2.40 $U</span>
                  <motion.div animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }} className="mt-1">
                    <ArrowRight className="w-4 h-4 text-[#00F59B]" />
                  </motion.div>
                </div>

                <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => navigate ? navigate('marketplace' as AppView) : onCompleteStory()} className="flex-1 neo-card bg-[#FFE500] border-2 border-[#121212] p-3 text-center group">
                  <motion.div animate={{ y: [0, -2, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} className="w-12 h-12 bg-white border-2 border-[#121212] flex items-center justify-center mx-auto group-hover:border-[#FF7828]">
                    <img src={getPixelSprite('health_factor')} alt="Agent" referrerPolicy="no-referrer" className="w-10 h-10 object-contain" />
                  </motion.div>
                  <span className="font-mono-tech text-[9px] font-bold mt-1 block text-[#00F59B]">AGENT VAULT</span>
                  <span className="font-mono-tech text-[8px] text-[#6A6A6A]">click to hire</span>
                </motion.button>
              </div>
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.5, duration: 0.6 }} className="font-mono-tech text-xs text-[#2563EB] bg-[#F0F9FF] px-3 py-1.5 border-2 border-[#121212] font-bold text-center w-full">
                <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>LANS “...costs no gas” → verifyMessage() → ✓ VERIFIED</motion.span>
              </motion.div>
            </motion.div>
          )}

          {currentBeat.beatNumber === 8 && (
            <motion.div
              key="beat8-enter"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ type: 'spring', stiffness: 120, damping: 12 }}
              className="text-center space-y-4 max-w-md px-4 flex flex-col items-center w-full"
            >
              <motion.div initial={{ scale: 0.7, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 120 }} className="relative">
                <LansLogo size="xl" showSubtitle={true} className="justify-center mb-1" />
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute -inset-2 bg-[#FFE500]/20 rounded-full blur-xl -z-10" />
              </motion.div>
              <motion.h2 initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="font-display font-black text-xl sm:text-2xl text-[#121212] uppercase tracking-tight">WELCOME TO LANS</motion.h2>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="grid grid-cols-5 gap-1.5 w-full font-mono-tech text-[9px]">
                {[
                  { label: 'PLAZA', path: '/plaza', color: '#FFE500' },
                  { label: 'MARKET', path: '/market', color: '#00F59B' },
                  { label: 'AGENTS', path: '/agents', color: '#38BDF8' },
                  { label: 'HISTORY', path: '/history', color: '#A855F7' },
                  { label: 'TREASURY', path: '/treasury', color: '#F59E0B' },
                ].map((p, i) => (
                  <motion.button key={p.label} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.06 }} whileHover={{ y: -2, scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate ? navigate(p.path.replace('/', '') as AppView) : onCompleteStory()} className="neo-card bg-[#FAF7F0] border-2 border-[#121212] py-2 font-bold hover:bg-white hover:shadow-md" style={{ borderTop: `3px solid ${p.color}` }}>{p.label}</motion.button>
                ))}
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="font-sans text-sm text-[#4A4A4A] leading-relaxed">Every view has a path: <span className="font-mono-tech text-xs bg-[#FAF7F0] px-1 border border-[#121212]">/plaza · /market · /agents · /history · /treasury</span></motion.p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1 w-full">
                <motion.button whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} onClick={onCompleteStory} className="w-full sm:w-auto neo-btn bg-[#FFE500] text-[#121212] font-display font-black text-xs px-6 py-2.5 flex items-center justify-center space-x-2 shadow-[0_3px_0_#121212]">
                  <span>ENTER PLAZA</span>
                  <motion.div animate={{ x: [0, 3, 0] }} transition={{ duration: 0.8, repeat: Infinity }}><ArrowRight className="w-4 h-4" /></motion.div>
                </motion.button>
                {!walletAddress ? (
                  <motion.button whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} animate={{ boxShadow: ['0 0 0px rgba(0,245,155,0)', '0 0 12px rgba(0,245,155,0.6)', '0 0 0px rgba(0,245,155,0)'] }} transition={{ duration: 1.5, repeat: Infinity }} onClick={onConnectWallet} className="w-full sm:w-auto neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-xs px-5 py-2.5 flex items-center justify-center space-x-2">
                    <Wallet className="w-4 h-4" />
                    <span>CONNECT WALLET</span>
                  </motion.button>
                ) : (
                  <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="neo-badge bg-[#00F59B] text-[#121212] text-xs px-3 py-2 font-bold flex items-center space-x-1 border-2 border-[#121212]"><ShieldCheck className="w-3.5 h-3.5" /><span>CONNECTED ✓</span></motion.span>
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
            <span className="neo-badge bg-[#FFE500] text-[#121212] text-[8px] px-1.5 py-0.2">SPEAKER</span>
            <motion.span key={`speaker-${currentBeat.beatNumber}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="font-display font-black text-xs text-[#121212] uppercase tracking-wide">
              {currentBeat.speaker}
            </motion.span>
          </div>
          <span className="font-mono-tech text-xs text-[#6A6A6A]">Beat {currentBeat.beatNumber} / {STORY_BEATS.length}</span>
        </div>

        <motion.p key={`dialogue-${currentBeat.beatNumber}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-sans text-sm md:text-base text-[#121212] leading-relaxed min-h-[56px]">
          {displayedText}
          {isTyping && <span className="animate-pulse font-bold ml-1 text-[#FF4365]">▌</span>}
        </motion.p>

        <p className="font-mono-tech text-[11px] text-[#8A8A8A] mt-2 italic border-l-2 border-[#FFE500] pl-2">{currentBeat.subtext}</p>

        <div className="flex items-center justify-between mt-3 pt-2 border-t-2 border-[#121212]">
          <div className="flex items-center space-x-1">
            {STORY_BEATS.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentBeatIndex(idx)} className={`h-1.5 rounded-full transition-all ${idx === currentBeatIndex ? 'w-6 bg-[#121212]' : 'w-2 bg-[#E5E0D5] border border-[#121212]'}`} />
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleNext} className="neo-btn bg-[#121212] text-white font-mono-tech text-xs font-bold px-4 py-1.5 flex items-center space-x-1.5 hover:bg-[#FFE500] hover:text-[#121212]">
            <span>{currentBeatIndex === STORY_BEATS.length - 1 ? 'ENTER PLAZA' : 'NEXT BEAT'}</span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
