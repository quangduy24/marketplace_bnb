import React from 'react';
import { Wallet, ExternalLink, X } from 'lucide-react';
import { WalletOption } from '../../lib/wallet.ts';

interface WalletPickerModalProps {
  wallets: WalletOption[];
  onSelect: (wallet: WalletOption) => void;
  onClose: () => void;
}

export const WalletPickerModal: React.FC<WalletPickerModalProps> = ({ wallets, onSelect, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[95] select-none"
      onClick={onClose}
    >
      <div
        className="neo-card bg-[#FFFFFF] w-full max-w-md p-4 sm:p-5 neo-shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#121212] pb-3 mb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-[#FFE500] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#121212]" />
            </div>
            <div>
              <h2 className="font-display font-black text-sm text-[#121212] uppercase tracking-tight">
                Select Web3 Wallet
              </h2>
              <span className="font-mono-tech text-[9px] text-[#6A6A6A] uppercase tracking-wider">
                BNB Chain (BSC) supported
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="neo-btn w-7 h-7 bg-[#121212] text-white flex items-center justify-center font-bold text-xs hover:bg-[#FF4365]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="p-4 bg-[#FAF7F0] border-2 border-[#121212] text-center space-y-2">
            <p className="font-mono-tech text-xs font-bold text-[#121212]">
              No wallet detected in this browser.
            </p>
            <p className="font-sans text-xs text-[#6A6A6A] leading-relaxed">
              Install a Binance Chain compatible wallet extension — MetaMask, Trust Wallet, or
              Binance Wallet — then reload this page.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                className="text-[#2563EB] font-bold text-xs underline flex items-center gap-1"
              >
                MetaMask <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://trustwallet.com/download"
                target="_blank"
                rel="noreferrer"
                className="text-[#2563EB] font-bold text-xs underline flex items-center gap-1"
              >
                Trust Wallet <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://www.binance.com/en/download"
                target="_blank"
                rel="noreferrer"
                className="text-[#2563EB] font-bold text-xs underline flex items-center gap-1"
              >
                Binance Wallet <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {wallets.map((w) => (
              <button
                key={w.id}
                onClick={() => onSelect(w)}
                className="w-full flex items-center justify-between gap-3 bg-[#FAF7F0] hover:bg-[#FFE500] border-2 border-[#121212] p-3 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 bg-[#FFFFFF] border-2 border-[#121212] neo-shadow-sm flex items-center justify-center overflow-hidden">
                    {w.icon || w.logoPath ? (
                      <img
                        src={w.icon || w.logoPath}
                        alt={w.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          const fallback = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        className="w-8 h-8 object-contain"
                      />
                    ) : null}
                    <span
                      className={`font-display font-black text-lg text-[#121212] ${w.icon || w.logoPath ? 'hidden' : ''}`}
                    >
                      {w.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-black text-xs text-[#121212] truncate">
                      {w.name}
                    </div>
                    {w.description && (
                      <div className="font-mono-tech text-[9px] text-[#6A6A6A] truncate">
                        {w.description}
                      </div>
                    )}
                  </div>
                </div>
                <span className="neo-badge bg-[#00F59B] text-[#121212] text-[8px] px-1.5 py-0.5 font-mono-tech font-black shrink-0">
                  CONNECT
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-[#121212]/20 font-sans text-[10px] text-[#8A8A8A] text-center">
          Your keys never leave your wallet — the app only receives your public address.
        </div>
      </div>
    </div>
  );
};
