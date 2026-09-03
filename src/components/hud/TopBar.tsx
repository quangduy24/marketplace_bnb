import React from 'react';
import { AlertTriangle, Briefcase, Wallet, Zap, ShieldAlert, Cpu, ShieldCheck, BadgeCheck } from 'lucide-react';
import { AppView, WalletContextState } from '../../types.ts';
import { LansLogo } from '../common/LansLogo.tsx';

interface TopBarProps {
  currentView: AppView;
  activeJobsCount: number;
  walletAddress?: string;
  walletBalanceU: number;
  walletBalanceBnb: number;
  contextState: WalletContextState;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  walletVerified?: boolean;
  isVerifying?: boolean;
  onVerifyWallet?: () => void;
  onNavigate: (view: AppView) => void;
  network: 'bscTestnet' | 'bscMainnet';
  onToggleNetwork: () => void;
}

const LOCATION_NAMES: Record<AppView, { title: string; tag: string }> = {
  story: { title: 'Origin Story', tag: 'LORE.01' },
  town: { title: 'Town Plaza', tag: 'ZONE.00' },
  marketplace: { title: 'Bazaar of 4 Stalls', tag: 'MKT.01' },
  agents: { title: 'Agent Sanctuary', tag: 'WORK.02' },
  history: { title: 'History', tag: 'HIS.03' },
  profits: { title: 'Treasury & Profits', tag: 'FIN.04' },
  demo: { title: 'Automated Demo', tag: 'TEST.05' },
};

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  activeJobsCount,
  walletAddress,
  walletBalanceU,
  walletBalanceBnb,
  contextState,
  onConnectWallet,
  onDisconnectWallet,
  walletVerified,
  isVerifying,
  onVerifyWallet,
  onNavigate,
  network,
  onToggleNetwork,
}) => {
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  const loc = LOCATION_NAMES[currentView] || { title: 'Town', tag: 'SEC.00' };

  return (
    <header className="w-full bg-[#FFFFFF] border-b-[2.5px] border-[#121212] px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between shadow-[0_3px_0px_rgba(18,18,18,0.06)] z-40 relative">
      {/* Top Ticker Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#FFE500]" />

      {/* Left: Brand & Location Spec */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={() => onNavigate('town')}
          className="flex items-center space-x-3 group focus:outline-none text-left"
          title="Return to Town Plaza"
        >
          <LansLogo size="md" showSubtitle={false} className="xl:hidden" />
          <LansLogo size="md" showSubtitle={true} className="hidden xl:flex" />

          <div className="hidden sm:flex items-center border-l-2 border-[#121212] pl-3 py-0.5 space-x-2">
            <span className="neo-badge bg-[#F4F0EA] text-[#121212] text-[9px] px-1.5 py-0.5">
              {loc.tag}
            </span>
            <span className="font-display font-bold text-xs sm:text-sm text-[#121212] tracking-tight">
              {loc.title}
            </span>
          </div>
        </button>
      </div>

      {/* Middle: Live Telemetry & Risk Indicators */}
      <div className="flex items-center space-x-2 sm:space-x-3 my-1 sm:my-0">
        {/* Active Jobs Pill */}
        <button
          onClick={() => onNavigate('agents')}
          className="neo-btn bg-[#00F59B] text-[#121212] px-3 py-1.5 rounded-none flex items-center space-x-1.5 font-mono-tech text-xs font-bold"
          title="Inspect Active Autonomous Work Chambers"
        >
          <Cpu className="w-3.5 h-3.5 text-[#121212]" />
          <span className="text-[10px] tracking-wider uppercase">JOBS:</span>
          <span className="bg-[#121212] text-[#00F59B] px-1.5 py-0.2 text-[10px] font-bold">
            {activeJobsCount}
          </span>
        </button>

        {/* Risk / Health Factor Pill */}
        <button
          onClick={() => onNavigate('marketplace')}
          className={`neo-btn px-3 py-1.5 rounded-none flex items-center space-x-1.5 font-mono-tech text-xs font-bold ${
            contextState.hasEmergencyShortfall || contextState.healthFactor < 1.15
              ? 'bg-[#FF4365] text-white animate-pulse'
              : 'bg-[#FAF7F0] text-[#121212]'
          }`}
          title={
            contextState.hasEmergencyShortfall
              ? 'Critical liquidation risk! Click to deploy shield agent'
              : 'Portfolio collateral is monitored'
          }
        >
          {contextState.hasEmergencyShortfall ? (
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-[#FF7828]" />
          )}
          <span className="text-[10px] tracking-wider uppercase">
            {contextState.hasEmergencyShortfall ? 'DEFENSE:' : 'HEALTH:'}
          </span>
          <span
            className={`px-1.5 py-0.2 text-[10px] font-bold ${
              contextState.hasEmergencyShortfall
                ? 'bg-white text-[#FF4365]'
                : 'bg-[#121212] text-[#FFE500]'
            }`}
          >
            {contextState.healthFactor.toFixed(2)} HF
          </span>
        </button>
      </div>

      {/* Right: Balances + Network + Web3 Connection */}
      <div className="flex items-center space-x-2 sm:space-x-2.5">
        {/* Network Toggle Button */}
        <button
          onClick={onToggleNetwork}
          title="Toggle between BSC Testnet and BSC Mainnet"
          className="neo-btn bg-[#FAF7F0] text-[#121212] px-2.5 py-1 text-[11px] font-mono-tech font-bold hidden md:flex items-center space-x-1.5"
        >
          <span
            className={`w-2 h-2 rounded-full border border-[#121212] ${
              network === 'bscTestnet' ? 'bg-[#FFE500]' : 'bg-[#00F59B]'
            }`}
          />
          <span className="uppercase tracking-wider">
            {network === 'bscTestnet' ? 'BSC Testnet' : 'BSC Mainnet'}
          </span>
        </button>

        {/* Balance Spec Ticker */}
        <div className="hidden sm:flex items-center space-x-2 bg-[#F4F0EA] border-2 border-[#121212] px-2.5 py-1 font-mono-tech text-xs neo-shadow-sm">
          <div className="flex items-center space-x-1 font-bold">
            <span className="text-[#2563EB]">$U</span>
            <span>{walletBalanceU.toFixed(1)}</span>
          </div>
          <span className="text-[#A0A0A0]">/</span>
          <div className="flex items-center space-x-1 font-bold">
            <span className="text-[#FF7828]">BNB</span>
            <span>{walletBalanceBnb.toFixed(2)}</span>
          </div>
        </div>

        {/* Web3 Connect / Disconnect Tactile Button */}
        {shortAddress ? (
          <div className="flex items-center space-x-1.5">
            {walletVerified ? (
              <span
                className="neo-badge bg-[#00F59B] text-[#121212] text-[8px] px-1.5 py-0.5 font-mono-tech font-black border border-[#121212] hidden sm:flex items-center space-x-0.5"
                title="Wallet identity verified via free signature"
              >
                <BadgeCheck className="w-3 h-3" />
                <span>VERIFIED</span>
              </span>
            ) : (
              <button
                onClick={onVerifyWallet}
                disabled={isVerifying}
                title={
                  isVerifying
                    ? 'Waiting for your signature confirmation in the wallet...'
                    : 'Identity not verified — click to sign the free message again'
                }
                className="neo-badge bg-[#FAF7F0] text-[#8A8A8A] text-[8px] px-1.5 py-0.5 font-mono-tech font-black border border-[#121212] hidden sm:flex items-center space-x-0.5 cursor-pointer disabled:cursor-wait"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>{isVerifying ? 'VERIFYING...' : 'UNVERIFIED'}</span>
              </button>
            )}
            <button
              onClick={onDisconnectWallet}
              title="Click to disconnect wallet"
              className="neo-btn bg-[#00F59B] text-[#121212] font-mono-tech text-xs font-bold px-3 py-1.5 flex items-center space-x-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{shortAddress}</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onConnectWallet}
            className="neo-btn bg-[#FFE500] text-[#121212] font-display font-extrabold text-xs px-3.5 py-1.5 flex items-center space-x-1.5 tracking-wider"
          >
            <Zap className="w-3.5 h-3.5 fill-[#121212]" />
            <span>CONNECT</span>
          </button>
        )}
      </div>
    </header>
  );
};
