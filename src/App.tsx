import React, { useState, useEffect, useCallback } from 'react';
import { AppView, AgentData, HireData, WalletContextState, CareerCategory } from './types.ts';
import { TopBar } from './components/hud/TopBar.tsx';
import { LeftNav } from './components/hud/LeftNav.tsx';
import { BottomActionBar } from './components/hud/BottomActionBar.tsx';
import { StoryBeatController } from './components/story/StoryBeatController.tsx';
import { TownMap } from './components/game/TownMap.tsx';
import { MarketplaceView } from './components/market/MarketplaceView.tsx';
import { AgentHouse } from './components/game/AgentHouse.tsx';
import { HistoryBookView } from './components/history/HistoryBookView.tsx';
import { ProfitsDashboard } from './components/profits/ProfitsDashboard.tsx';
import { AutoDemoRunner } from './components/demo/AutoDemoRunner.tsx';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('story');
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [hires, setHires] = useState<HireData[]>([]);
  const [walletAddress, setWalletAddress] = useState<string>('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
  const [walletBalanceU, setWalletBalanceU] = useState<number>(145.0);
  const [walletBalanceBnb, setWalletBalanceBnb] = useState<number>(2.38);
  const [network, setNetwork] = useState<'bscTestnet' | 'bscMainnet'>('bscTestnet');
  const [focusedChamber, setFocusedChamber] = useState<CareerCategory | null>(null);

  const [walletContext, setWalletContext] = useState<WalletContextState>({
    healthFactor: 1.12, // Critical alert trigger by default to showcase heuristic engine!
    hasEmergencyShortfall: true,
    totalCollateralUSD: 14500,
    totalBorrowUSD: 12940,
    shortfallUSD: 450,
    pancakePositionsCount: 3,
    idleStableUSD: 2400,
  });

  // Fetch agents from API
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents?wallet=${walletAddress}&activeOnly=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.agents && data.agents.length > 0) {
          setAgents(data.agents);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch agents, will retry or fallback', err);
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

  // Fetch context from API
  const fetchContext = useCallback(async () => {
    try {
      const res = await fetch(`/api/context?wallet=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (data.context) {
          setWalletContext(data.context);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch context', err);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchAgents();
    fetchHires();
    fetchContext();
  }, [fetchAgents, fetchHires, fetchContext]);

  // Handle hiring an agent
  const handleHireAgent = async (payload: {
    agentId: string;
    catalog: CareerCategory | string;
    rail: 'x402' | 'erc8183';
    budgetU: string;
    taskSummary: string;
    txHash: string;
  }) => {
    try {
      const res = await fetch('/api/hires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: payload.agentId,
          buyerAddress: walletAddress,
          catalog: payload.catalog,
          rail: payload.rail,
          budgetU: payload.budgetU,
          taskSummary: payload.taskSummary,
          txHash: payload.txHash,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.hire) {
          setHires((prev) => [data.hire, ...prev]);
        }
      } else {
        // Fallback local hire state update
        const newHire: HireData = {
          id: `hire-${Date.now()}`,
          jobId: `job-bsc-${Date.now()}`,
          agentId: payload.agentId,
          buyer: walletAddress,
          buyerAddress: walletAddress,
          chainId: 97,
          catalog: payload.catalog,
          rail: payload.rail,
          state: 'funded',
          budgetU: payload.budgetU,
          txs: [payload.txHash],
          lastAction: 'Escrow funded on BSC Testnet',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setHires((prev) => [newHire, ...prev]);
      }

      // Deduct budget
      setWalletBalanceU((prev) => Math.max(0, prev - Number(payload.budgetU)));

      // Switch to Agent House to witness active chamber!
      setFocusedChamber(payload.catalog as CareerCategory);
      setCurrentView('agents');
    } catch (err) {
      console.error('Hire error:', err);
    }
  };

  // Sync state transition for an agent job in the house
  const handleSyncJobState = async (hireId: string, newState: string, lastAction?: string) => {
    try {
      await fetch(`/api/hires/${hireId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState, lastAction }),
      });

      setHires((prev) =>
        prev.map((h) =>
          h.id === hireId
            ? { ...h, state: newState as any, lastAction: lastAction || h.lastAction }
            : h
        )
      );

      // If job resolved to paid, update health factor or give alpha
      if (newState === 'paid') {
        setWalletContext((prev) => ({
          ...prev,
          healthFactor: 1.48, // Loan saved!
          hasEmergencyShortfall: false,
          shortfallUSD: 0,
        }));
      }
    } catch (err) {
      console.error('Sync job error', err);
    }
  };

  const handleSelectHiredSlot = (hire: HireData) => {
    setFocusedChamber((hire.catalog || 'monitoring') as CareerCategory);
    setCurrentView('agents');
  };

  const handleConnectWallet = () => {
    setWalletAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
  };

  const handleDisconnectWallet = () => {
    setWalletAddress('');
  };

  const handleToggleNetwork = () => {
    setNetwork((prev) => (prev === 'bscTestnet' ? 'bscMainnet' : 'bscTestnet'));
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
        onNavigate={(view) => setCurrentView(view)}
        network={network}
        onToggleNetwork={handleToggleNetwork}
      />

      {/* Main Workspace Body: Left Nav + Viewport */}
      <div className="flex flex-1 overflow-hidden relative">
        <LeftNav currentView={currentView} onNavigate={(view) => setCurrentView(view)} />

        <main className="flex-1 overflow-y-auto relative bg-[#F4F0EA] editorial-grid">
          {currentView === 'story' && (
            <StoryBeatController
              onCompleteStory={() => setCurrentView('marketplace')}
              onConnectWallet={handleConnectWallet}
              walletAddress={walletAddress}
            />
          )}

          {currentView === 'town' && (
            <TownMap
              onNavigate={(view) => setCurrentView(view)}
              activeJobsCount={activeJobsCount}
            />
          )}

          {currentView === 'marketplace' && (
            <MarketplaceView
              agents={agents}
              walletContext={walletContext}
              buyerAddress={walletAddress}
              onHireAgent={handleHireAgent}
              network={network}
            />
          )}

          {currentView === 'agents' && (
            <AgentHouse
              hires={hires}
              agents={agents}
              onNavigateMarket={() => setCurrentView('marketplace')}
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
                setCurrentView('agents');
              }}
            />
          )}

          {currentView === 'profits' && (
            <ProfitsDashboard
              hires={hires}
              onNavigateMarket={(cat) => {
                setCurrentView('marketplace');
              }}
              buyerAddress={walletAddress}
            />
          )}

          {currentView === 'demo' && (
            <AutoDemoRunner onNavigate={(view) => setCurrentView(view)} />
          )}
        </main>
      </div>

      {/* Bottom Action Bar: 6 Slots */}
      <BottomActionBar
        hires={hires}
        agents={agents}
        onSelectHiredSlot={handleSelectHiredSlot}
        onNavigate={(view) => setCurrentView(view)}
      />
    </div>
  );
}
