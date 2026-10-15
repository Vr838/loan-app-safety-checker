'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, HelpCircle, Layers, Clock, Database } from 'lucide-react';
import { AppItem, ScanRun } from '../lib/types';

interface OverviewMetricsProps {
  apps: AppItem[];
  latestScan: ScanRun | null;
  isDemo: boolean;
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({ apps, latestScan, isDemo }) => {
  const total = apps.length;
  const highConcern = apps.filter((a) => a.latest_assessment?.risk_category === 'High concern').length;
  const caution = apps.filter((a) => a.latest_assessment?.risk_category === 'Caution').length;
  const lowerConcern = apps.filter((a) => a.latest_assessment?.risk_category === 'Lower concern').length;
  const insufficient = apps.filter((a) => a.latest_assessment?.risk_category === 'Insufficient evidence').length;

  return (
    <div className="space-y-4">
      {/* Demo Notice Banner if active */}
      {isDemo && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Demo Evaluation Mode:</strong> Showing verified pre-seeded benchmark apps. Real-time background backend collector connects at{' '}
              <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-100 font-mono">http://localhost:8000</code>.
            </span>
          </div>
          <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-900/80 px-2 py-0.5 rounded border border-amber-700">
            Pre-Packaged Sample
          </span>
        </div>
      )}

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Apps */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Catalog Apps</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-[11px] text-slate-400 mt-1">Deduplicated Packages</div>
        </div>

        {/* High Concern */}
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-300 text-xs mb-1">
            <span className="font-semibold">High Concern</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{highConcern}</div>
          <div className="text-[11px] text-rose-400/80 mt-1">Severe Risk Signals</div>
        </div>

        {/* Caution */}
        <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
            <span className="font-semibold">Caution</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{caution}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">Elevated Heuristic Flags</div>
        </div>

        {/* Lower Concern */}
        <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-300 text-xs mb-1">
            <span className="font-semibold">Lower Concern</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{lowerConcern}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">Verified Lenders & Clear</div>
        </div>

        {/* Insufficient Evidence */}
        <div className="bg-sky-950/20 border border-sky-900/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-sky-300 text-xs mb-1">
            <span className="font-semibold">Insufficient Data</span>
            <HelpCircle className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400">{insufficient}</div>
          <div className="text-[11px] text-sky-400/80 mt-1">Sparse Review Sample</div>
        </div>

        {/* Last Scan Status */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Last Scan Run</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm font-bold text-slate-200 truncate">
            {latestScan?.status ? latestScan.status.toUpperCase() : 'COMPLETED'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {latestScan?.started_at ? new Date(latestScan.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
          </div>
        </div>
      </div>
    </div>
  );
};
