'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { AppItem, ScanRun } from '../lib/types';

interface OverviewMetricsProps {
  apps: AppItem[];
  latestScan: ScanRun | null;
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({ apps, latestScan }) => {
  const total = apps.length;
  const highConcern = apps.filter((a) => a.latest_assessment?.risk_category === 'High concern').length;
  const caution = apps.filter((a) => a.latest_assessment?.risk_category === 'Caution').length;
  const lowerConcern = apps.filter((a) => a.latest_assessment?.risk_category === 'Lower concern').length;
  const insufficient = apps.filter((a) => a.latest_assessment?.risk_category === 'Insufficient evidence').length;

  return (
    <section className="summary-panel" aria-label="Scan summary">
      <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-black/[.08]">
        {/* Total Apps */}
        <div className="summary-item">
          <div className="summary-label">Apps checked</div>
          <div className="summary-value">{total}</div>
          <div className="summary-caption">Distinct Play Store listings</div>
        </div>

        {/* High Concern */}
        <div className="summary-item">
          <div className="flex items-center gap-1.5 summary-label text-[#a20b1b]">
            <ShieldAlert className="w-3.5 h-3.5" /><span>High concern</span>
          </div>
          <div className="summary-value text-[#d70015]">{highConcern}</div>
          <div className="summary-caption">Strong signals found</div>
        </div>

        {/* Caution */}
        <div className="summary-item">
          <div className="flex items-center gap-1.5 summary-label text-[#8a4b00]">
            <AlertTriangle className="w-3.5 h-3.5" /><span>Caution</span>
          </div>
          <div className="summary-value text-[#ad5f00]">{caution}</div>
          <div className="summary-caption">Review before use</div>
        </div>

        {/* Lower Concern */}
        <div className="summary-item">
          <div className="flex items-center gap-1.5 summary-label text-[#176b36]">
            <CheckCircle2 className="w-3.5 h-3.5" /><span>Lower concern</span>
          </div>
          <div className="summary-value text-[#16803c]">{lowerConcern}</div>
          <div className="summary-caption">Few matching signals observed</div>
        </div>

        {/* Insufficient Evidence */}
        <div className="summary-item">
          <div className="flex items-center gap-1.5 summary-label text-[#005b99]">
            <HelpCircle className="w-3.5 h-3.5" /><span>Needs more data</span>
          </div>
          <div className="summary-value text-[#0071e3]">{insufficient}</div>
          <div className="summary-caption">Sparse public evidence</div>
        </div>
      </div>
      <p className="summary-footnote">
        Last live scan: {latestScan?.started_at ? new Date(latestScan.started_at).toLocaleString() : 'not run yet'}
        {latestScan?.completed_at ? ` · ${latestScan.apps_new_count} new app(s), ${latestScan.apps_refreshed_count} refreshed` : ''}
      </p>
    </section>
  );
};
