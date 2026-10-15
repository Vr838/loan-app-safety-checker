'use client';

import React from 'react';
import { Clock3, RefreshCw } from 'lucide-react';
import { ScanRun } from '../lib/types';

export function ScanHistory({ scans, loading }: { scans: ScanRun[]; loading: boolean }) {
  return (
    <section className="history-panel" aria-label="Recent scan history">
      <div className="history-heading"><div><p className="eyebrow">Data freshness</p><h2>Recent scans</h2></div><Clock3 /></div>
      {loading ? <p className="history-empty"><RefreshCw className="animate-spin" />Loading scan history</p>
        : scans.length === 0 ? <p className="history-empty">No scan has been recorded yet.</p>
          : <div className="history-list">{scans.map((scan) => {
            const status = scan.status === 'completed' ? 'Completed' : scan.status === 'partial' ? 'Partial' : scan.status === 'failed' ? 'Failed' : 'Running';
            return <article key={scan.scan_uuid} className="history-row">
              <div><strong>{status}</strong><span>{new Date(scan.started_at).toLocaleString()}</span></div>
              <div className="history-counts"><span>{scan.apps_new_count} new</span><span>{scan.apps_refreshed_count} refreshed</span><span>{scan.apps_failed_count} failed</span></div>
            </article>;
          })}</div>}
    </section>
  );
}
