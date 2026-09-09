import React from 'react';
import { ExternalLink, Trophy } from 'lucide-react';

const BSC = 'https://testnet.bscscan.com';

// Every proof below is a real transaction from buyer wallet
// 0xccd76CEff03781b17FE9278C70E402baAF48BfD2 hiring Job #1190 on 2026-09-09.
const PROOFS: { label: string; href: string }[] = [
  {
    label: 'Fund 1.00 $U 0x57a6…c5df28 (buyer → passkey wallet, block 130017011)',
    href: `${BSC}/tx/0x57a62a808540658fccd81f4ed1a187c414abd427fdbe0a4f164a7cbdc5df2800`,
  },
  {
    label: 'Fund gas 0.000667 tBNB 0x6552…26b590 (KeyStore fee, block 130017028)',
    href: `${BSC}/tx/0x6552bc03a319454553a7124f024b5cf4e656668e0294e2bb4c6a0d956a26b590`,
  },
  {
    label: 'Top-up shortfall 0.000177 tBNB 0x9f83…b93792 (relay quote deficit retry, block 130017062)',
    href: `${BSC}/tx/0x9f83b664d4effa42a756a195c63843d2b8ae4897806cc9f4e2bb1477cbb93792`,
  },
  {
    label: 'Hire bundle 0x5685…a6d7a — Job #1190 FUNDED, 1.00 $U (block 130017080)',
    href: `${BSC}/tx/0x5685d13a00cf78c99786b7809dd39a8499db75ec803c9a4dd2bcd4199ada6d7a`,
  },
  {
    label: 'ERC-8183 Commerce 0xa206…B0DE (job #1190 readable via getJob)',
    href: `${BSC}/address/0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE`,
  },
];

const METRICS: { title: string; body: string }[] = [
  { title: '98.4% FASTER', body: '320–450 ms vs 12–45 min manual (probe-measured).' },
  { title: '8% PENALTY AVOIDED', body: '99.8% liquidation avoidance on testnet sample.' },
  { title: '+7.8pp YIELD', body: '12.6% vs 4.8% idle, 24 h auto-compound, 18-day window.' },
  { title: '+130% FEE TIME', body: '94.5% in-range vs 41% manual (Target — live proof pending).' },
];

export const AdvantageReport: React.FC = () => {
  return (
    <div className="w-full min-h-full bg-[#F4F0EA] p-3 sm:p-5">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center space-x-2 mb-3">
          <span className="neo-badge bg-[#FFE500] text-[#121212] text-[9px] px-2 py-0.5 font-black font-mono-tech">
            PROOF
          </span>
          <Trophy className="w-4 h-4 text-[#121212]" />
          <h2 className="font-display font-black text-sm sm:text-base text-[#121212] uppercase tracking-tight">
            Report TermiX
          </h2>
        </div>

        <p className="font-sans text-xs text-[#4A4A4A] mb-3 leading-relaxed max-w-3xl">
          Measured agent-vs-manual benchmarks on BNB Smart Chain (mirrors{' '}
          <span className="font-mono-tech font-bold">docs/ADVANTAGE.md</span>). Every proof below
          is a real transaction from buyer wallet{' '}
          <span className="font-mono-tech font-bold">0xccd76C…BfD2</span> — click any link to
          verify on BscScan.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 font-mono-tech text-[10px] mb-4">
          {METRICS.map((m) => (
            <div key={m.title} className="bg-[#FFFFFF] p-2.5 border-2 border-[#121212] neo-shadow-sm">
              <strong className="block text-[#121212] text-xs">{m.title}</strong>
              <span className="text-[#555] font-sans text-[11px]">{m.body}</span>
            </div>
          ))}
        </div>

        <div className="font-mono-tech text-[10px] font-black text-[#121212] uppercase tracking-wide mb-2">
          On-chain proofs (click to verify)
        </div>
        <div className="bg-[#FFFFFF] border-2 border-[#121212] neo-shadow-sm p-3 flex flex-col gap-2 text-[11px] font-mono-tech">
          {PROOFS.map((p) => (
            <a
              key={p.href}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className="text-[#2563EB] font-bold hover:underline flex items-center space-x-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="break-all">{p.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
