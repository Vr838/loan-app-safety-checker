'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck, Zap } from 'lucide-react';
import { AppItem, ScanRun } from '../lib/types';

interface OverviewMetricsProps {
  apps: AppItem[];
  latestScan: ScanRun | null;
  onFilterCategory?: (cat: string) => void;
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({ apps, latestScan, onFilterCategory }) => {
  const total = apps.length;

  const countFor = (keyword: string) =>
    apps.filter((a) => {
      const cat = (a.latest_assessment?.risk_category ?? '').toLowerCase();
      return cat.includes(keyword);
    }).length;

  const highConcern = countFor('high');
  const caution = countFor('caution') + countFor('moderate');
  const lowerConcern = countFor('lower') + countFor('safe');
  const insufficient = countFor('insufficient');

  // RBI verified proportion
  const rbiVerifiedCount = apps.filter(
    (a) => a.rbi_verification?.status === 'verified_regulated' || a.rbi_verification?.status === 'registered_dla'
  ).length;

  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(0) : '0');

  return (
    <section className="summary-panel shadow-sm border border-slate-200/80 rounded-2xl bg-white overflow-hidden" aria-label="Scan summary">
      <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-slate-100">
        {/* Total Apps Checked */}
        <div className="summary-item group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => onFilterCategory?.('All')}>
          <div className="flex items-center justify-between">
            <span className="summary-label">Live store apps</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Active 200</span>
          </div>
          <div className="summary-value text-slate-900">{total}</div>
          <div className="summary-caption flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{rbiVerifiedCount} Regulated / DLA linked</span>
          </div>
        </div>

        {/* Lower Concern */}
        <div className="summary-item group hover:bg-emerald-50/30 transition-colors cursor-pointer" onClick={() => onFilterCategory?.('Lower Concern')}>
          <div className="flex items-center gap-1.5 summary-label text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Lower concern</span>
          </div>
          <div className="summary-value text-emerald-600 flex items-baseline gap-2">
            <span>{lowerConcern}</span>
            <span className="text-xs font-normal text-slate-400">({pct(lowerConcern)}%)</span>
          </div>
          <div className="summary-caption text-slate-500">Few risk triggers found</div>
        </div>

        {/* Caution */}
        <div className="summary-item group hover:bg-amber-50/30 transition-colors cursor-pointer" onClick={() => onFilterCategory?.('Caution')}>
          <div className="flex items-center gap-1.5 summary-label text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Caution</span>
          </div>
          <div className="summary-value text-amber-600 flex items-baseline gap-2">
            <span>{caution}</span>
            <span className="text-xs font-normal text-slate-400">({pct(caution)}%)</span>
          </div>
          <div className="summary-caption text-slate-500">Fee & tenure complaints</div>
        </div>

        {/* High Concern */}
        <div className="summary-item group hover:bg-rose-50/30 transition-colors cursor-pointer" onClick={() => onFilterCategory?.('High Concern')}>
          <div className="flex items-center gap-1.5 summary-label text-rose-700">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>High concern</span>
          </div>
          <div className="summary-value text-rose-600 flex items-baseline gap-2">
            <span>{highConcern}</span>
            <span className="text-xs font-normal text-slate-400">({pct(highConcern)}%)</span>
          </div>
          <div className="summary-caption text-slate-500">Harassment / abuse signals</div>
        </div>

        {/* Insufficient Evidence */}
        <div className="summary-item group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => onFilterCategory?.('Insufficient Evidence')}>
          <div className="flex items-center gap-1.5 summary-label text-slate-600">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Sparse evidence</span>
          </div>
          <div className="summary-value text-slate-600 flex items-baseline gap-2">
            <span>{insufficient}</span>
            <span className="text-xs font-normal text-slate-400">({pct(insufficient)}%)</span>
          </div>
          <div className="summary-caption text-slate-500">Low review depth (&lt;15)</div>
        </div>
      </div>

      {/* Visual Risk Distribution Bar */}
      {total > 0 && (
        <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center gap-3">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Risk Profile:</span>
          <div className="h-2 flex-1 rounded-full overflow-hidden flex bg-slate-200">
            <div style={{ width: `${pct(lowerConcern)}%` }} className="bg-emerald-500" title={`Lower concern: ${lowerConcern}`} />
            <div style={{ width: `${pct(caution)}%` }} className="bg-amber-500" title={`Caution: ${caution}`} />
            <div style={{ width: `${pct(highConcern)}%` }} className="bg-rose-500" title={`High concern: ${highConcern}`} />
            <div style={{ width: `${pct(insufficient)}%` }} className="bg-slate-300" title={`Sparse: ${insufficient}`} />
          </div>
          <div className="text-[11px] text-slate-500 shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>{latestScan ? `${latestScan.apps_new_count} new in last scan` : 'Real-time sync'}</span>
          </div>
        </div>
      )}

      {/* Footnote */}
      <div className="summary-footnote bg-white border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500 flex flex-wrap justify-between items-center gap-2">
        <div>
          Last Store Audit: <strong>{latestScan?.started_at ? new Date(latestScan.started_at).toLocaleString() : 'Recent'}</strong>
          {latestScan?.collector_version ? ` · Engine ${latestScan.collector_version}` : ''}
        </div>
        <div className="text-[11px] text-slate-400">
          Cross-referenced with RBI Register of Non-Banking Financial Companies (DNBS)
        </div>
      </div>
    </section>
  );
};
