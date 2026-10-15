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

  const highConcern  = countFor('high');
  const caution      = countFor('caution') + countFor('moderate');
  const lowerConcern = countFor('lower') + countFor('safe');
  const insufficient = countFor('insufficient');

  const rbiVerifiedCount = apps.filter(
    (a) => a.rbi_verification?.status === 'verified_regulated' || a.rbi_verification?.status === 'registered_dla'
  ).length;

  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(0) : '0');

  return (
    <section className="metrics-grid" aria-label="Scan summary">
      {/* Total Apps */}
      <div className="metric-card" onClick={() => onFilterCategory?.('All')}>
        <div className="metric-label">
          Live store apps
          <span className="metric-badge">Active 200 OK</span>
        </div>
        <div className="metric-value">{total}</div>
        <div className="metric-caption">
          <ShieldCheck style={{ color: '#16a34a', width: 13, height: 13 }} />
          <span>{rbiVerifiedCount} Regulated / DLA linked</span>
        </div>
      </div>

      {/* Lower Concern */}
      <div className="metric-card metric-lower" onClick={() => onFilterCategory?.('Lower Concern')}>
        <div className="metric-label" style={{ color: '#15803d' }}>
          <CheckCircle2 style={{ width: 13, height: 13 }} />
          Lower concern
        </div>
        <div className="metric-value">
          {lowerConcern}
          <span className="metric-pct">({pct(lowerConcern)}%)</span>
        </div>
        <div className="metric-caption">Few risk triggers found</div>
      </div>

      {/* Caution */}
      <div className="metric-card metric-caution" onClick={() => onFilterCategory?.('Caution')}>
        <div className="metric-label" style={{ color: '#92400e' }}>
          <AlertTriangle style={{ width: 13, height: 13 }} />
          Caution
        </div>
        <div className="metric-value">
          {caution}
          <span className="metric-pct">({pct(caution)}%)</span>
        </div>
        <div className="metric-caption">Fee &amp; tenure complaints</div>
      </div>

      {/* High Concern */}
      <div className="metric-card metric-high" onClick={() => onFilterCategory?.('High Concern')}>
        <div className="metric-label" style={{ color: '#991b1b' }}>
          <ShieldAlert style={{ width: 13, height: 13 }} />
          High concern
        </div>
        <div className="metric-value">
          {highConcern}
          <span className="metric-pct">({pct(highConcern)}%)</span>
        </div>
        <div className="metric-caption">Harassment / abuse signals</div>
      </div>

      {/* Insufficient Evidence */}
      <div className="metric-card" onClick={() => onFilterCategory?.('Insufficient Evidence')}>
        <div className="metric-label" style={{ color: '#475569' }}>
          <HelpCircle style={{ width: 13, height: 13 }} />
          Sparse evidence
        </div>
        <div className="metric-value" style={{ color: '#475569' }}>
          {insufficient}
          <span className="metric-pct">({pct(insufficient)}%)</span>
        </div>
        <div className="metric-caption">Low review depth</div>
      </div>

      {/* Risk Distribution Bar - spans full width */}
      {total > 0 && (
        <div
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 20px',
            borderTop: '1px solid rgba(0,0,0,.07)',
            background: '#fafafa',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', flexShrink: 0 }}>Risk profile:</span>
          <div style={{ flex: 1, height: 6, borderRadius: 999, overflow: 'hidden', display: 'flex', background: '#e2e8f0' }}>
            <div style={{ width: `${pct(lowerConcern)}%`, background: '#16a34a' }} title={`Lower: ${lowerConcern}`} />
            <div style={{ width: `${pct(caution)}%`, background: '#d97706' }} title={`Caution: ${caution}`} />
            <div style={{ width: `${pct(highConcern)}%`, background: '#dc2626' }} title={`High: ${highConcern}`} />
            <div style={{ width: `${pct(insufficient)}%`, background: '#94a3b8' }} title={`Sparse: ${insufficient}`} />
          </div>
          <div style={{ fontSize: 11, color: '#64748b', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap style={{ width: 12, height: 12, color: '#d97706' }} />
            <span>{latestScan ? `+${latestScan.apps_new_count ?? 0} new last scan` : 'Real-time sync'}</span>
          </div>
        </div>
      )}

      {/* Footer footnote */}
      <div
        style={{
          gridColumn: '1 / -1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          padding: '8px 20px',
          borderTop: '1px solid rgba(0,0,0,.07)',
          background: 'white',
          fontSize: 11,
          color: '#64748b',
        }}
      >
        <span>
          Last store audit: <strong>{latestScan?.started_at ? new Date(latestScan.started_at).toLocaleString('en-IN') : 'Recent'}</strong>
          {latestScan?.collector_version ? ` · Engine ${latestScan.collector_version}` : ''}
        </span>
        <span>Cross-referenced: RBI NBFC Master Register (DNBS)</span>
      </div>
    </section>
  );
};
