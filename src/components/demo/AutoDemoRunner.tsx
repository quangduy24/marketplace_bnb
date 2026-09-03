import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, ExternalLink, Search, Filter, ArrowRight, Check, Zap } from 'lucide-react';
import { getPixelSprite } from '../game/pixelAssets.ts';
import { AppView } from '../../types.ts';

interface AutoDemoRunnerProps {
  onNavigate: (view: AppView) => void;
}

interface DemoStep {
  startSec: number;
  endSec: number;
  title: string;
  badge: string;
  targetView: AppView;
  intro: string;
  operations: string[];
}

const DEMO_DURATION = 90;

const DEMO_TIMELINE: DemoStep[] = [
  {
    startSec: 0,
    endSec: 17,
    title: '1 — Home • Overview',
    badge: 'HOME',
    targetView: 'town',
    intro: 'Home is the overview map — the central navigation hub. From here you see the full LANS overview and travel to any area.',
    operations: [
      'Move character (WASD / click) around the square',
      'Hover each house to view status: active / reachable / hireable',
      'Click 4 categories: Rebalancing · Grid Trading · Health Factor Monitoring · Yield Optimisation to filter Market',
      'Click Marketplace / My Agents gate to jump to the corresponding area',
    ],
  },
  {
    startSec: 17,
    endSec: 37,
    title: '2 — Marketplace • Browse Agents',
    badge: 'MARKET',
    targetView: 'marketplace',
    intro: 'Marketplace lists real verified agents synced from on-chain. Every card uses live data: price, score, and rail X402/ERC-8183/A2A.',
    operations: [
      'Filter by category: use 4 cards or dropdown ALL / REBALANCING / GRID TRADING / HEALTH FACTOR MONITORING / YIELD OPTIMISATION',
      'Enable VERIFIED ONLY to show only probed hireable agents',
      'Search by name/description, view cards: price $U/hr (or —), ★ score, status ONLINE/UNVERIFIED',
      'Select 2 agents → VIEW COMPARISON to compare hourly rate, endpoint, and win rate; click Details to view tokenId/chain',
      'Click HIRE → choose package Trial 2h / Standard 24h / Weekly 168h, select rail X402/ERC-8183, HIRE (recorded as pending, awaiting funding)',
    ],
  },
  {
    startSec: 37,
    endSec: 58,
    title: '3 — My Agents • Active Agents',
    badge: 'AGENTS',
    targetView: 'agents',
    intro: 'My Agents is the 4-category workspace for your active agents. Each hire is tracked by category with live status.',
    operations: [
      'View Active Agents on top — click slot to focus the corresponding category',
      'Switch categories: Rebalancing / Grid Trading / Health Factor Monitoring / Yield Optimisation',
      'Run job lifecycle: funded → click START → running → SUBMIT PROOF → submitted → RELEASE PAYMENT → paid',
      'Open Details to view agentId, budgetU, lastAction, and explorer tx (or — pending on-chain tx)',
    ],
  },
  {
    startSec: 58,
    endSec: 74,
    title: '4 — History • Transaction History',
    badge: 'HISTORY',
    targetView: 'history',
    intro: 'History is the transparent ledger: every hire, status, budget, and proof is stored on-chain.',
    operations: [
      'View table: Agent / Category / Payment / Status / Deposit / Explorer Proof / Action',
      'When no tx exists: shows — pending on-chain tx',
      'When tx exists: click link to testnet.bscscan.com/tx/{hash} or bscscan.com/tx/{hash} per chainId',
      'Click Action to open in My Agents',
    ],
  },
  {
    startSec: 74,
    endSec: 90,
    title: '5 — Performance • Portfolio',
    badge: 'PERFORMANCE',
    targetView: 'profits',
    intro: 'Performance aggregates results: only counts from real hires, showing Awaiting on-chain proof until proof exists.',
    operations: [
      'View 3 boxes: Total Expense (sum of budgetU), Value Defended (0 until proof), and Net Alpha',
      'Each category card: when no agent → No active agent + Browse Marketplace button; when active → shows contracts count + spent on this',
      'Click Activate more to return to Marketplace and hire more — unlimited agents',
    ],
  },
];

export const AutoDemoRunner: React.FC<AutoDemoRunnerProps> = ({ onNavigate }) => {
  const [seconds, setSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [demoMarketFilter, setDemoMarketFilter] = useState('ALL');
  const [demoSanctuaryState, setDemoSanctuaryState] = useState<'funded' | 'running' | 'submitted' | 'paid'>('funded');

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setSeconds((prev) => {
        if (prev >= DEMO_DURATION) {
          setIsPlaying(false);
          return DEMO_DURATION;
        }
        return prev + 1;
      });
    }, 450);
    return () => clearInterval(t);
  }, [isPlaying]);

  // auto-cycle sanctuary demo state for visual effect (faster)
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setDemoSanctuaryState((s) => (s === 'funded' ? 'running' : s === 'running' ? 'submitted' : s === 'submitted' ? 'paid' : 'funded'));
    }, 900);
    return () => clearInterval(t);
  }, [isPlaying]);

  const currentStep = DEMO_TIMELINE.find((s) => seconds >= s.startSec && seconds < s.endSec) || DEMO_TIMELINE[DEMO_TIMELINE.length - 1];
  const stepIndex = DEMO_TIMELINE.indexOf(currentStep);
  const progressPercent = (seconds / DEMO_DURATION) * 100;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const mockAgents = [
    { name: 'Aegis Rebalancing', price: '0.42', score: '4.8', tag: 'REBALANCING', color: '#38BDF8', sprite: 'rebalancing' as const },
    { name: 'Vulcan Health', price: '0.30', score: '4.9', tag: 'HEALTH_FACTOR', color: '#FF4365', sprite: 'health_factor' as const },
    { name: 'Yield Optimiser', price: '0.18', score: '4.6', tag: 'YIELD', color: '#00F59B', sprite: 'yield' as const },
  ];

  return (
    <div className="w-full h-[calc(100vh-120px)] min-h-[680px] bg-[#F4F0EA] p-3 sm:p-5 flex flex-col justify-between select-none overflow-hidden editorial-grid">
      <div className="neo-card bg-[#FFFFFF] p-3 sm:p-4 neo-shadow-sm mb-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#121212] pb-2.5 mb-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 bg-[#121212] flex items-center justify-center">
              <span className="text-[#FFE500] font-black text-xs">▶</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-1.5 py-0.2">DEMO</span>
                <span className="font-display font-black text-xs sm:text-sm text-[#121212]">Interactive Walkthrough — 5 Stages</span>
              </div>
              <span className="font-mono-tech text-[10px] text-[#6A6A6A]">Step {stepIndex + 1} / {DEMO_TIMELINE.length} · Click any visual to try the real action</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 font-mono-tech text-xs">
            <button onClick={() => setIsPlaying(!isPlaying)} className="neo-btn bg-[#121212] text-white px-3 py-1 font-bold flex items-center space-x-1">
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button onClick={() => { setSeconds(0); setIsPlaying(true); }} className="neo-btn bg-[#FAF7F0] text-[#121212] px-2 py-1 font-bold border-2 border-[#121212]">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold min-w-[78px] text-right">{formatTime(seconds)} / {formatTime(DEMO_DURATION)}</span>
          </div>
        </div>

        <div className="w-full bg-[#FAF7F0] border-2 border-[#121212] h-3 relative cursor-pointer overflow-hidden" onClick={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          setSeconds(Math.floor(((e.clientX - rect.left) / rect.width) * DEMO_DURATION));
        }}>
          <motion.div className="bg-[#FFE500] h-full border-r-2 border-[#121212]" animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }} />
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {DEMO_TIMELINE.map((s, idx) => (
            <button key={s.badge} onClick={() => setSeconds(s.startSec)} className={`h-1.5 rounded-full transition-all border border-[#121212] ${stepIndex === idx ? 'w-8 bg-[#121212]' : 'w-3 bg-white'}`} title={s.title} />
          ))}
        </div>
      </div>

      <div className="flex-1 neo-card bg-[#FFFFFF] p-4 sm:p-5 neo-shadow-lg flex flex-col overflow-y-auto relative">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: `radial-gradient(#121212 1px, transparent 1px)`, backgroundSize: '14px 14px' }} />

        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-center justify-between border-b-2 border-[#121212] pb-3 mb-3 gap-2">
            <h3 className="font-display font-black text-base sm:text-lg text-[#121212]">{currentStep.title}</h3>
            <span className="neo-badge bg-[#FFE500] text-[#121212] text-[10px] px-2 py-0.5 font-bold shrink-0">{currentStep.badge}</span>
          </div>
          <p className="font-sans text-[13px] text-[#2A2A2A] leading-relaxed max-w-2xl">{currentStep.intro}</p>

          {/* VISUAL STAGE - image/animation + live actions - ultra large to fill space */}
          <div className="mt-6 flex-1 flex items-center justify-center min-h-[520px]">
            <AnimatePresence mode="wait">
              {stepIndex === 0 && (
                <motion.div key="plaza-vis" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-xl">
                  <div className="grid grid-cols-2 gap-6">
                      {[
                      { id: 'health_factor', label: 'Health Factor Monitoring', accent: '#FF4365', sprite: 'health_factor' as const, pos: '2,3' },
                      { id: 'yield', label: 'Yield Optimisation', accent: '#00F59B', sprite: 'yield' as const, pos: '1,4' },
                      { id: 'rebalancing', label: 'Rebalancing', accent: '#38BDF8', sprite: 'rebalancing' as const, pos: '3,1' },
                      { id: 'grid', label: 'Grid Trading', accent: '#FF8C00', sprite: 'grid' as const, pos: '4,2' },
                    ].map((h, i) => (
                      <motion.button key={h.id} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.08 }} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => onNavigate('marketplace')} className="neo-card p-6 border-2 border-[#121212] bg-[#FAF7F0] text-left group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="w-3 h-3 rounded-full bg-[#00F59B] border border-[#121212] animate-pulse" />
                          <span className="font-mono-tech text-[9px] text-[#6A6A6A]">{h.pos}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-24 h-24 bg-white border-2 border-[#121212] flex items-center justify-center">
                            <img src={getPixelSprite(h.sprite)} alt={h.label} className="w-20 h-20 object-contain" />
                          </div>
                            <div>
                            <div className="font-display font-black text-base leading-none">{h.label}</div>
                            <div className="w-10 h-1.5 mt-1.5" style={{ background: h.accent }} />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-center space-x-2">
                    <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-6 h-6 bg-[#121212] flex items-center justify-center"><span className="text-[#FFE500] text-xs">●</span></motion.div>
                    <span className="font-mono-tech text-xs text-[#6A6A6A]">WASD / Click to move — Hover houses — Click any stall above ☝️</span>
                  </div>
                </motion.div>
              )}

              {stepIndex === 1 && (
                <motion.div key="market-vis" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 flex items-center space-x-2 bg-white border-2 border-[#121212] px-2 py-1.5">
                      <Search className="w-3.5 h-3.5 text-[#6A6A6A]" />
                      <span className="font-mono-tech text-xs text-[#6A6A6A]">Search agents…</span>
                      <span className="ml-auto w-2 h-3 bg-[#121212] animate-pulse" />
                    </div>
                    <span className="neo-badge bg-[#00F59B] text-[#121212] text-[9px] px-2 py-1 font-bold">LIVE</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {['ALL','REBALANCING','GRID','HEALTH_FACTOR','YIELD'].map(f => (
                      <button key={f} onClick={() => setDemoMarketFilter(f)} className={`px-2 py-1 text-[9px] font-mono-tech font-bold border-2 border-[#121212] neo-btn ${demoMarketFilter===f ? 'bg-[#121212] text-white' : 'bg-white text-[#121212] hover:bg-[#FFE500]'}`}>{f}</button>
                    ))}
                    <button className="ml-auto flex items-center space-x-1 neo-badge bg-[#FAF7F0] border border-[#121212] text-[9px] px-2 py-1"><Filter className="w-3 h-3" /><span>VERIFIED ONLY</span></button>
                  </div>
                  <div className="grid grid-cols-3 gap-5">
                    {mockAgents.slice(0,3).map((a,i) => (
                      <motion.div key={a.name} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i*0.08 }} whileHover={{ y: -2 }} className="neo-card bg-white border-2 border-[#121212] p-5">
                        <div className="flex items-center space-x-2 mb-2">
                          <img src={getPixelSprite(a.sprite)} alt={a.tag} className="w-16 h-16 object-contain" />
                          <span className="neo-badge text-[8px] px-1.5 py-0.5 font-bold text-white" style={{ background: a.color }}>{a.tag}</span>
                        </div>
                        <div className="font-display font-bold text-xs leading-none truncate">{a.name}</div>
                        <div className="font-mono-tech text-[10px] font-black">{a.price} $U/hr · ★ {a.score}</div>
                        <div className="mt-1 flex gap-1">
                          <button onClick={() => onNavigate('marketplace')} className="flex-1 bg-[#FFE500] border border-[#121212] text-[8px] font-bold py-0.5">COMPARE</button>
                          <button onClick={() => onNavigate('marketplace')} className="flex-1 bg-[#00F59B] border border-[#121212] text-[8px] font-bold py-0.5">HIRE</button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-2 text-center font-mono-tech text-[10px] text-[#2563EB]">↑ Try: click a filter or HIRE to open the real Market · lans.work/market</div>
                </motion.div>
              )}

              {stepIndex === 2 && (
                <motion.div key="sanc-vis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md flex flex-col items-center">
                  <div className="grid grid-cols-4 gap-4 w-full mb-5">
                    {(['rebalancing','grid','health_factor','yield'] as const).map(k => (
                      <div key={k} className="neo-card bg-[#FAF7F0] border-2 border-[#121212] p-5 text-center">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#00F59B] border border-[#121212] mx-auto animate-pulse mb-2" />
                        <img src={getPixelSprite(k)} alt={k} className="w-16 h-16 mx-auto object-contain" />
                      </div>
                    ))}
                  </div>
                  <motion.div key={demoSanctuaryState} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full neo-card bg-[#FAF7F0] border-2 border-[#121212] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display font-black text-xs">Agent — Active</span>
                      <span className={`neo-badge text-[9px] px-2 py-0.5 font-bold border border-[#121212] ${demoSanctuaryState==='paid' ? 'bg-[#00F59B]' : demoSanctuaryState==='submitted' ? 'bg-[#FFE500]' : demoSanctuaryState==='running' ? 'bg-[#38BDF8] text-white' : 'bg-[#121212] text-white'}`}>{demoSanctuaryState.toUpperCase()}</span>
                    </div>
                    <div className="h-1 bg-white border border-[#121212] mb-2">
                      <motion.div className="h-full bg-[#00F59B]" animate={{ width: demoSanctuaryState==='funded'?'25%':demoSanctuaryState==='running'?'50%':demoSanctuaryState==='submitted'?'75%':'100%' }} />
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <button onClick={() => setDemoSanctuaryState('running')} className={`py-1 text-[8px] font-bold border border-[#121212] ${demoSanctuaryState==='running'?'bg-[#38BDF8] text-white':'bg-white'}`}>START</button>
                      <button onClick={() => setDemoSanctuaryState('submitted')} className={`py-1 text-[8px] font-bold border border-[#121212] ${demoSanctuaryState==='submitted'?'bg-[#FFE500]':'bg-white'}`}>SUBMIT PROOF</button>
                      <button onClick={() => setDemoSanctuaryState('paid')} className={`py-1 text-[8px] font-bold border border-[#121212] ${demoSanctuaryState==='paid'?'bg-[#00F59B]':'bg-white'}`}>RELEASE PAYMENT</button>
                    </div>
                  </motion.div>
                  <span className="font-mono-tech text-[10px] text-[#6A6A6A] mt-2">Click the buttons above — then GO TO /agents</span>
                </motion.div>
              )}

              {stepIndex === 3 && (
                <motion.div key="log-vis" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-md">
                  <div className="neo-card bg-white border-2 border-[#121212] overflow-hidden">
                    <div className="bg-[#121212] text-white font-mono-tech text-[9px] flex px-2 py-1">
                      <span className="flex-1">Agent</span><span className="w-16">Status</span><span className="w-20 text-[#FFE500]">Proof</span>
                    </div>
                    {[
                      { name: 'Health Monitor', status: 'paid', tx: '0x7a3e…c23f' },
                      { name: 'Rebalancing Bot', status: 'submitted', tx: '0x9b12…8a01' },
                      { name: 'Yield Optimiser', status: 'funded', tx: '— pending' },
                    ].map(row => (
                      <div key={row.name} className="flex items-center px-2 py-1.5 border-b border-[#E5E0D5] font-mono-tech text-[10px]">
                        <span className="flex-1 font-bold truncate">{row.name}</span>
                        <span className={`w-16 neo-badge text-[8px] px-1 py-0.5 text-center ${row.status==='paid'?'bg-[#00F59B]':row.status==='submitted'?'bg-[#FFE500]':'bg-white border border-[#121212]'}`}>{row.status.toUpperCase()}</span>
                        <span className={`w-20 truncate ${row.tx.includes('0x')?'text-[#2563EB] underline cursor-pointer':'text-[#A0A0A0]'}`}>{row.tx}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-center">
                    <span className="font-mono-tech text-[10px] text-[#6A6A6A]">Click a blue Tx to open BscScan · lans.work/history</span>
                  </div>
                </motion.div>
              )}

              {stepIndex === 4 && (
                <motion.div key="treas-vis" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full max-w-sm">
                  <div className="grid grid-cols-3 gap-4 w-full">
                    <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[#FAF7F0] border-2 border-[#121212] p-5 text-center">
                      <div className="font-mono-tech text-[9px] text-[#6A6A6A]">SPENT</div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="font-display font-black text-2xl">$12.40</motion.div>
                    </motion.div>
                    <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="bg-[#00F59B] border-2 border-[#121212] p-5 text-center">
                      <div className="font-mono-tech text-[9px]">SAVED</div>
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }} className="font-display font-black text-2xl">$42.00</motion.div>
                    </motion.div>
                    <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-[#FFE500] border-2 border-[#121212] p-5 text-center">
                      <div className="font-mono-tech text-[9px]">NET RESULT</div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="font-display font-black text-2xl text-[#00F59B]">+$29.60</motion.div>
                    </motion.div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <span className="neo-badge bg-white border border-[#121212] text-[9px] px-2 py-1">2 contracts active</span>
                    <span className="neo-badge bg-[#121212] text-white text-[9px] px-2 py-1">Activate more →</span>
                  </div>
                  <span className="font-mono-tech text-[10px] text-[#6A6A6A] mt-2">lans.work/treasury</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ul className="mt-4 space-y-1.5">
            {currentStep.operations.map((op, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start space-x-2 font-mono-tech text-xs text-[#121212] bg-[#FAF7F0] border border-[#121212] px-2.5 py-1.5 cursor-pointer hover:bg-[#FFE500] transition-colors" onClick={() => onNavigate(currentStep.targetView)}>
                <span className="mt-0.5 w-1.5 h-1.5 bg-[#00F59B] border border-[#121212] shrink-0" />
                <span className="flex-1">{op}</span>
                <ArrowRight className="w-3 h-3 shrink-0 mt-0.5 text-[#6A6A6A]" />
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="border-t-2 border-[#121212] pt-3 mt-4 flex justify-center relative z-10">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onNavigate(currentStep.targetView)} className="neo-btn bg-[#00F59B] text-[#121212] font-display font-black text-xs px-6 py-2.5 flex items-center space-x-2">
            <span>OPEN {currentStep.targetView.toUpperCase()} LIVE</span>
            <ExternalLink className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
