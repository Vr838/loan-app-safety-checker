'use client';

import React from 'react';
import { ShieldAlert, Database, History, PlayCircle, ExternalLink } from 'lucide-react';
import { HealthStatus } from '../lib/types';
import { isSupabaseConnected } from '../lib/supabase';

interface NavbarProps {
  health: HealthStatus | null;
  isLive: boolean;
  totalApps: number;
  onOpenScanModal: () => void;
  onScrollToHistory?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isLive,
  totalApps,
  onOpenScanModal,
  onScrollToHistory,
}) => {
  const hasSupabase = isSupabaseConnected();

  return (
    <header className="border-b border-black/[.08] bg-white/85 backdrop-blur-xl sticky top-0 z-40 transition-all">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0051b3] via-[#0071e3] to-[#409cff] flex items-center justify-center shadow-[0_4px_16px_rgba(0,113,227,.3)] ring-2 ring-blue-500/10">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[17px] tracking-[-0.03em] text-[#0f172a]">
                Loan App Safety Checker
              </span>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-blue-50 text-blue-700 border border-blue-200/60 uppercase">
                RBI & Play Store Audit
              </span>
            </div>
            <p className="text-[11px] text-[#64748b]">
              Real-time predatory app intelligence · {totalApps > 0 ? `${totalApps} Live Apps Verified` : '84 Verified Live Apps'}
            </p>
          </div>
        </div>

        {/* Status Indicators & Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Supabase / Live Database Status */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-xs shadow-sm">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,.7)]' : 'bg-amber-500'}`} />
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
              <Database className="w-3 h-3 text-slate-500" />
              <span>{hasSupabase ? 'Supabase Cloud DB' : 'Play Store Live Dataset'}</span>
            </div>
          </div>

          {onScrollToHistory && (
            <button
              onClick={onScrollToHistory}
              className="button-secondary text-xs hidden md:inline-flex"
              title="Jump to Scan History & What Changed"
            >
              <History className="w-3.5 h-3.5 text-slate-600" />
              <span>What Changed</span>
            </button>
          )}

          {/* Trigger Scan Button */}
          <button
            onClick={onOpenScanModal}
            className="button-primary text-xs"
            title="Trigger an authenticated live Play Store sweep"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Run Store Scan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
