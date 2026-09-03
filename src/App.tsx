import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppView, AgentData, HireData, WalletContextState, CareerCategory } from './types.ts';
import { TopBar } from './components/hud/TopBar.tsx';
import { LeftNav } from './components/hud/LeftNav.tsx';
import { BottomActionBar } from './components/hud/BottomActionBar.tsx';
import { WalletPickerModal } from './components/hud/WalletPickerModal.tsx';
import { StoryBeatController } from './components/story/StoryBeatController.tsx';
import { TownMap } from './components/game/TownMap.tsx';
import { MarketplaceView } from './components/market/MarketplaceView.tsx';
import { AgentHouse } from './components/game/AgentHouse.tsx';
import { HistoryBookView } from './components/history/HistoryBookView.tsx';
import { ProfitsDashboard } from './components/profits/ProfitsDashboard.tsx';
import { AutoDemoRunner } from './components/demo/AutoDemoRunner.tsx';
import {
  BscNetwork,
  BSC_CHAIN_IDS,
  Eip1193Provider,
  WalletOption,
  discoverWallets,
  onEip6963Announce,
  connectWallet,
  switchBscChain,
  signVerificationMessage,
  fetchNativeBalance,
  fetchUBalance,
} from './lib/wallet.ts';

const VIEW_TO_PATH: Record<AppView, string> = {
  story: '/story',
  town: '/plaza',
  marketplace: '/market',
  agents: '/agents',
  history: '/history',
  profits: '/treasury',
  demo: '/demo',
};

const PATH_TO_VIEW: Record<string, AppView> = {
  '/': 'town',
  '/plaza': 'town',
  '/town': 'town',
  '/market': 'marketplace',
  '/marketplace': 'marketplace',
  '/agents': 'agents',
  '/sanctuary': 'agents',
  '/history': 'history',
  '/logbook': 'history',
  '/treasury': 'profits',
  '/profits': 'profits',
  '/demo': 'demo',
  '/story': 'story',
};

function getInitialView(): AppView {
  if (typeof window === 'undefined') return 'town';
  const p = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return PATH_TO_VIEW[p] || 'town';
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(() => getInitialView());
  const [agents, setAgents] = useState<AgentData[]>([]); // toàn bộ pool (769) — directory & search mặc định
  const [agentsActive, setAgentsActive] = useState<AgentData[]>([]); // active labeled (143) — 4 stalls Image 1
  const [hires, setHires] = useState<HireData[]>([]);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletBalanceU, setWalletBalanceU] = useState<number>(0);
  const [walletBalanceBnb, setWalletBalanceBnb] = useState<number>(0);
  const [network, setNetwork] = useState<BscNetwork>('bscMainnet');
  const [focusedChamber, setFocusedChamber] = useState<CareerCategory | null>(null);

  const [walletContext, setWalletContext] = useState<WalletContextState>({
    hasEmergencyShortfall: false,
    healthFactor: 2.45,
  });

  // Lightweight toast notification
  const [toast, setToast] = useState<{ id: number; text: string; kind: 'ok' | 'err' } | null>(null);
  const notify = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now();
    setToast({ id, text, kind });
    setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t));
    }, 5000);
  }, []);

  // Wallet picker
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [pickerWallets, setPickerWallets] = useState<WalletOption[]>([]);
  const [walletVerified, setWalletVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const activeProviderRef = useRef<Eip1193Provider | null>(null);

  // Sync URL <-> view (Browser History)
  const navigate = useCallback((view: AppView) => {
    const path = VIEW_TO_PATH[view] || '/plaza';
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setCurrentView(view);
  }, []);

  useEffect(() => {
    const onPopState = () => setCurrentView(getInitialView());
    window.addEventListener('popstate', onPopState);
    // Ensure initial URL matches view (e.g. / -> /plaza)
    const initialPath = VIEW_TO_PATH[getInitialView()];
    if (window.location.pathname !== initialPath && getInitialView() === 'town' && window.location.pathname === '/') {
      window.history.replaceState(null, '', initialPath);
    }
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Live EIP-6963 discovery while the picker is open
  useEffect(() => {
    if (!walletPickerOpen) return;
    return onEip6963Announce((wallet) => {
      setPickerWallets((prev) => (prev.some((w) => w.id === wallet.id) ? prev : [...prev, wallet]));
    });
  }, [walletPickerOpen]);

  // Fetch agents from API — toàn bộ pool (769) làm directory & search mặc định
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents?wallet=${walletAddress}&activeOnly=false&includeUncategorized=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.agents) {
          setAgents(data.agents);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch agents, will retry or fallback', err);
    }
  }, [walletAddress]);

  // Fetch active labeled agents (143) riêng cho 4 stalls Image 1
  const fetchAgentsActive = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents?wallet=${walletAddress}&activeOnly=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.agents && data.agents.length > 0) {
          setAgentsActive(data.agents);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch active agents', err);
    }
  }, [walletAddress]);

  // Fetch hires from API
  const fetchHires = useCallback(async () => {
    try {
      const res = await fetch(`/api/hires?buyer=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (data.hires && data.hires.length > 0) {
          setHires(data.hires);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch hires', err);
    }
  }, [walletAddress]);

  // Fetch context from API (real Venus on-chain health factor for the connected wallet)
  const fetchContext = useCallback(async () => {
    try {
      const res = await fetch(`/api/context?wallet=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        setWalletContext({
          ...data,
          totalCollateralUSD: data.totalCollateralUSD,
          totalBorrowUSD: data.totalBorrowUSD,
          shortfallUSD: data.shortfallUSD,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch context', err);
    }
  }, [walletAddress]);

  // Refresh real on-chain balances for the connected wallet. Returns { bnb, u }.
  const refreshBalances = useCallback(async (address: string, chain: BscNetwork) => {
    if (!address) {
      setWalletBalanceU(0);
      setWalletBalanceBnb(0);
      return { bnb: 0, u: 0 };
    }
    const bnb = await fetchNativeBalance(address, chain);
    setWalletBalanceBnb(bnb);
    let u = 0;
    if (chain === 'bscMainnet') {
      u = await fetchUBalance(address);
      setWalletBalanceU(u);
    } else {
      setWalletBalanceU(0);
    }
    return { bnb, u };
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchAgentsActive();
    fetchHires();
    fetchContext();
  }, [fetchAgents, fetchAgentsActive, fetchHires, fetchContext]);

  // Unified refresh for all agents (general directory + active labeled stalls)
  const refreshAllAgents = useCallback(async () => {
    await Promise.all([fetchAgents(), fetchAgentsActive()]);
  }, [fetchAgents, fetchAgentsActive]);

  // Immediate Backend → Frontend sync: SSE push after every DB update (no polling)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/agents/stream');
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'agents-updated') refreshAllAgents();
        } catch {}
      };
    } catch {}
    // Fallback for Vercel serverless (SSE may timeout): refetch when tab becomes visible/focused
    const onVisible = () => {
      if (!document.hidden) refreshAllAgents();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshAllAgents);
    return () => {
      try {
        es?.close();
      } catch {}
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshAllAgents);
    };
  }, [refreshAllAgents]);

  // Handle hiring an agent
  const handleHireAgent = async (payload: {
    agentId: string;
    catalog: CareerCategory | string;
    rail: 'x402' | 'erc8183';
    budgetU: string;
    taskSummary: string;
    txHash?: string;
  }) => {
    const res = await fetch('/api/hires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer: walletAddress,
        chainId: network === 'bscMainnet' ? 56 : 97,
        agentId: payload.agentId,
        catalog: payload.catalog,
        rail: payload.rail,
        budgetU: payload.budgetU,
        taskSummary: payload.taskSummary,
        txHash: payload.txHash,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Hire request failed (${res.status}): ${errText}`);
    }

    const hire = await res.json();
    setHires((prev) => [hire, ...prev]);

    // Switch to Agent House to witness active chamber!
    setFocusedChamber(payload.catalog as CareerCategory);
    navigate('agents');
  };

  // Sync state transition for an agent job in the house
  const handleSyncJobState = async (hireId: string, newState: string, lastAction?: string) => {
    try {
      const res = await fetch(`/api/hires/${hireId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState, lastAction }),
      });

      if (!res.ok) {
        throw new Error(`Sync failed (${res.status})`);
      }

      const updated = await res.json();
      setHires((prev) => prev.map((h) => (h.id === hireId ? { ...h, ...updated } : h)));

      // Job resolved — refresh real wallet context from the chain
      if (newState === 'paid' || newState === 'rejected' || newState === 'expired') {
        fetchContext();
      }
    } catch (err) {
      console.error('Sync job error', err);
    }
  };

  const handleSelectHiredSlot = (hire: HireData) => {
    const raw = (hire.catalog || 'rebalancing') as string;
    setFocusedChamber((raw === 'monitoring' ? 'rebalancing' : raw) as CareerCategory);
    navigate('agents');
  };

  const handleConnectWallet = async () => {
    setPickerWallets(discoverWallets());
    setWalletPickerOpen(true);
  };

  // Identity verification: user must confirm a free signature in their wallet
  const verifyWalletIdentity = useCallback(
    async (provider: Eip1193Provider, address: string) => {
      setIsVerifying(true);
      try {
        const { signature } = await signVerificationMessage(provider, address, network);
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: address, signature, chainId: BSC_CHAIN_IDS[network] }),
        });
        let data: any = { verified: false };
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : { verified: false, error: `Empty response (${res.status})` };
        } catch (parseErr: any) {
          throw new Error(`Verification service unavailable (${res.status}) - please retry`);
        }
        if (!res.ok) {
          throw new Error(data?.error || `Verification failed (${res.status})`);
        }
        if (data.verified) {
          setWalletVerified(true);
          notify('Identity verified — signature confirmed on BNB Chain', 'ok');
        } else {
          setWalletVerified(false);
          notify(data?.error || 'Signature verification failed — please retry', 'err');
        }
      } catch (err: any) {
        if (err?.code === 4001 || String(err?.message || '').toLowerCase().includes('reject')) {
          notify('Signature skipped — tap UNVERIFIED badge next to your address to sign', 'err');
        } else {
          console.error('Identity verification failed:', err);
          notify(`Signature verification failed: ${String(err?.message || err).slice(0, 120)}`, 'err');
        }
      } finally {
        setIsVerifying(false);
      }
    },
    [network, notify]
  );

  const handleVerifyWallet = async () => {
    const provider = activeProviderRef.current || discoverWallets()[0]?.provider || null;
    if (!walletAddress || !provider) {
      notify('Please connect a wallet first', 'err');
      return;
    }
    await verifyWalletIdentity(provider, walletAddress);
  };

  const handleSelectWallet = async (wallet: WalletOption) => {
    setWalletPickerOpen(false);
    try {
      const address = await connectWallet(wallet.provider, network);
      activeProviderRef.current = wallet.provider;
      setWalletVerified(false);
      setWalletAddress(address);
      const { bnb } = await refreshBalances(address, network);
      notify(
        `Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)} — ${bnb.toFixed(2)} BNB (${network === 'bscMainnet' ? 'BSC Mainnet' : 'BSC Testnet'})`,
        'ok'
      );
      // Next step automatically: request free signature confirmation in the wallet
      notify('Now confirm the free signature in your wallet to verify identity', 'ok');
      await verifyWalletIdentity(wallet.provider, address);
    } catch (err: any) {
      console.error('Wallet connect failed:', err);
      const detail = err?.message ? ` (${String(err.message).slice(0, 120)})` : '';
      notify(`Wallet connection failed${detail}`, 'err');
    }
  };

  const handleDisconnectWallet = () => {
    activeProviderRef.current = null;
    setWalletVerified(false);
    setIsVerifying(false);
    setWalletAddress('');
    setWalletBalanceU(0);
    setWalletBalanceBnb(0);
    notify('Wallet disconnected', 'ok');
  };

  const handleToggleNetwork = async () => {
    const next: BscNetwork = network === 'bscTestnet' ? 'bscMainnet' : 'bscTestnet';
    try {
      if (walletAddress) {
        const provider = activeProviderRef.current || discoverWallets()[0]?.provider || null;
        if (provider) {
          await switchBscChain(provider, next);
        }
        await refreshBalances(walletAddress, next);
      }
      setNetwork(next);
      notify(`Network switched to ${next === 'bscMainnet' ? 'BSC Mainnet' : 'BSC Testnet'}`, 'ok');
    } catch (err) {
      console.error('Network switch failed:', err);
      notify(`Could not switch to ${next === 'bscMainnet' ? 'BSC Mainnet' : 'BSC Testnet'} in your wallet.`, 'err');
    }
  };

  const activeJobsCount = hires.filter(
    (h) => h.state === 'funded' || h.state === 'running' || h.state === 'submitted'
  ).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F4F0EA] text-[#121212] overflow-hidden font-sans">
      {/* Top HUD Bar */}
      <TopBar
        currentView={currentView}
        activeJobsCount={activeJobsCount}
        walletAddress={walletAddress}
        walletBalanceU={walletBalanceU}
        walletBalanceBnb={walletBalanceBnb}
        contextState={walletContext}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        walletVerified={walletVerified}
        isVerifying={isVerifying}
        onVerifyWallet={handleVerifyWallet}
        onNavigate={(view) => navigate(view)}
        network={network}
        onToggleNetwork={handleToggleNetwork}
      />

      {/* Main Workspace Body: Left Nav + Viewport */}
      <div className="flex flex-1 overflow-hidden relative">
        <LeftNav currentView={currentView} onNavigate={(view) => navigate(view)} />

        <main className="flex-1 overflow-y-auto relative bg-[#F4F0EA] editorial-grid">
          {currentView === 'story' && (
            <StoryBeatController
              onCompleteStory={() => navigate('marketplace')}
              onConnectWallet={handleConnectWallet}
              walletAddress={walletAddress}
            />
          )}

          {currentView === 'town' && (
            <TownMap
              onNavigate={(view) => navigate(view)}
              activeJobsCount={activeJobsCount}
            />
          )}

          {currentView === 'marketplace' && (
            <MarketplaceView
              agents={agents}
              agentsActive={agentsActive}
              walletContext={walletContext}
              buyerAddress={walletAddress}
              onHireAgent={handleHireAgent}
              network={network}
              onRefreshAgents={refreshAllAgents}
            />
          )}

          {currentView === 'agents' && (
            <AgentHouse
              hires={hires}
              agents={agents}
              onNavigateMarket={() => navigate('marketplace')}
              onSyncJobState={handleSyncJobState}
              healthFactor={walletContext.healthFactor}
              focusedChamber={focusedChamber}
            />
          )}

          {currentView === 'history' && (
            <HistoryBookView
              hires={hires}
              agents={agents}
              onFocusAgentInHouse={(cat) => {
                setFocusedChamber(cat);
                navigate('agents');
              }}
              onSyncJobState={handleSyncJobState}
            />
          )}

          {currentView === 'profits' && (
            <ProfitsDashboard
              hires={hires}
              onNavigateMarket={(cat) => {
                navigate('marketplace');
              }}
              buyerAddress={walletAddress}
            />
          )}

          {currentView === 'demo' && (
            <AutoDemoRunner onNavigate={(view) => navigate(view)} />
          )}
        </main>
      </div>

      {/* Bottom Action Bar: Unlimited Hired Squad */}
      <BottomActionBar
        hires={hires}
        agents={agents}
        onSelectHiredSlot={handleSelectHiredSlot}
        onNavigate={(view) => navigate(view)}
      />

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 font-mono-tech text-xs font-bold border-2 border-[#121212] neo-shadow-xl max-w-[90vw] ${
            toast.kind === 'ok' ? 'bg-[#00F59B] text-[#121212]' : 'bg-[#FF4365] text-white'
          }`}
          role="status"
        >
          {toast.kind === 'ok' ? '✓ ' : '✕ '}
          {toast.text}
        </div>
      )}

      {/* Wallet picker modal */}
      {walletPickerOpen && (
        <WalletPickerModal
          wallets={pickerWallets}
          onSelect={handleSelectWallet}
          onClose={() => setWalletPickerOpen(false)}
        />
      )}
    </div>
  );
}
