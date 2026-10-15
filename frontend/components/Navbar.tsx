'use client';

import React from 'react';
import { ShieldCheck, Activity, Terminal, AlertTriangle, ExternalLink } from 'lucide-react';
import { HealthStatus } from '../lib/types';

interface NavbarProps {
  health: HealthStatus | null;
  isLive: boolean;
  onOpenScanModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ health, isLive, onOpenScanModal }) => {
  return (
    <header className="border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">LoanApp<span className="text-indigo-400">Guard</span></span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                v1.0 Heuristic
              </span>
            </div>
            <p className="text-xs text-slate-400">Financial Intelligence & Digital Lending Risk Analyzer</p>
          </div>
        </div>

        {/* Status Indicators & Actions */}
        <div className="flex items-center space-x-4">
          {/* Live Status Badge */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-medium">
              {isLive ? 'API Connected' : 'Demo Dataset Active'}
            </span>
          </div>

          {/* Trigger Scan Button */}
          <button
            onClick={onOpenScanModal}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Authorized Scan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
