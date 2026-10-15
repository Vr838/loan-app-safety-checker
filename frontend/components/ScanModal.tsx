'use client';

import React, { useEffect, useState } from 'react';
import { X, Radar, Loader2 } from 'lucide-react';
import { fetchLatestScan, triggerScan } from '../lib/api';
import { ScanRun } from '../lib/types';

interface ScanModalProps { isOpen: boolean; onClose: () => void; onScanSuccess: () => void; }

export const ScanModal: React.FC<ScanModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [token, setToken] = useState('dev-secret-admin-token-replace-in-prod');
  const [maxApps, setMaxApps] = useState(5);
  const [maxReviews, setMaxReviews] = useState(30);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const queryCount = 3;
  const candidateBudget = maxApps * queryCount;
  const reviewBudget = candidateBudget * maxReviews;
  const newsBudget = candidateBudget * 3;

  useEffect(() => {
    if (isOpen) setMessage(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const waitForScan = async (): Promise<ScanRun> => {
    const deadline = Date.now() + 180_000;
    let observedRunningScan = false;

    while (Date.now() < deadline) {
      const scan = await fetchLatestScan();
      if (scan?.status === 'running') {
        observedRunningScan = true;
        const processed = scan.apps_collected_count + scan.apps_failed_count;
        const total = scan.apps_discovered_count || '…';
        setMessage(`Scanning live sources: ${processed} of ${total} apps processed.`);
      } else if (scan && observedRunningScan) {
        return scan;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1_500));
    }

    throw new Error('The scan is still running. Keep this page open and refresh in a moment.');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('Starting the live scan…');
    try {
      await triggerScan(token, { max_apps: maxApps, max_reviews: maxReviews });
      const completedScan = await waitForScan();

      if (completedScan.status === 'failed' || completedScan.apps_collected_count === 0) {
        const detail = completedScan.error_summary?.[0]?.error;
        throw new Error(detail || 'The scan finished without collecting any apps.');
      }

      const suffix = completedScan.apps_failed_count
        ? ` ${completedScan.apps_failed_count} app(s) could not be collected.`
        : '';
      setMessage(`Scan complete. Found ${completedScan.apps_new_count} new app(s) and refreshed ${completedScan.apps_refreshed_count} existing app(s).${suffix}`);
      onScanSuccess();
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The scan could not start.'); }
    finally { setLoading(false); }
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="scan-modal" role="dialog" aria-modal="true" aria-labelledby="scan-title" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><span className="scan-symbol"><Radar /></span><h2 id="scan-title">Run a live scan</h2><p>Collect current Google Play listing data and public reviews.</p></div><button className="modal-close" onClick={onClose} aria-label="Close scan dialog"><X /></button></header>
    <form onSubmit={submit}><label>Admin token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} required autoComplete="off" /></label><div className="scan-grid"><label>Apps per search<input type="number" min="1" max="50" value={maxApps} onChange={(event) => setMaxApps(Number(event.target.value))} /></label><label>Reviews per app<input type="number" min="5" max="100" value={maxReviews} onChange={(event) => setMaxReviews(Number(event.target.value))} /></label></div><p className="scan-budget">This scan can inspect up to {candidateBudget} search results, collect up to {reviewBudget.toLocaleString()} reviews, and save up to {newsBudget} news links. Duplicate packages are checked once. The final result separates new apps from refreshed listings.</p>{message && <p className="scan-message" role="status">{message}</p>}<div className="scan-actions"><button type="button" className="button-secondary" onClick={onClose}>Close</button><button className="button-primary" disabled={loading}>{loading && <Loader2 className="animate-spin w-3.5 h-3.5" />}{loading ? 'Scanning…' : 'Start scan'}</button></div></form>
  </section></div>;
};
