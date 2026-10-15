'use client';

import React from 'react';
import { ShieldCheck, Terminal } from 'lucide-react';
import { HealthStatus } from '../lib/types';

interface NavbarProps {
  health: HealthStatus | null;
  isLive: boolean;
  onOpenScanModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ health, isLive, onOpenScanModal }) => {
  return (
    <header className="border-b border-black/[.08] bg-white/72 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-[12px] bg-[#0071e3] flex items-center justify-center shadow-[0_5px_12px_rgba(0,113,227,.2)]">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-[17px] tracking-[-0.02em] text-[#1d1d1f]">LoanApp Guard</span>
            <p className="text-[11px] text-[#6e6e73]">Public lending-app research</p>
          </div>
        </div>

        {/* Status Indicators & Actions */}
        <div className="flex items-center space-x-3">
          {/* Live Status Badge */}
          <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-black/[.04] text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#16803c]' : 'bg-[#ad5f00]'}`} />
            <span className="text-[#515154] font-medium">
              {isLive ? 'Live data' : 'API unavailable'}
            </span>
          </div>

          {/* Trigger Scan Button */}
          <button
            onClick={onOpenScanModal}
            className="button-primary"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Run scan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
