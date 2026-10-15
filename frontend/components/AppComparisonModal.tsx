'use client';

import React from 'react';
import { BarChart3, X } from 'lucide-react';
import { AppItem } from '../lib/types';

export function AppComparisonModal({ apps, onClose }: { apps: AppItem[]; onClose: () => void }) {
  if (apps.length < 2) return null;
  const rows: Array<[string, (app: AppItem) => string]> = [
    ['Observed score', (app) => app.latest_assessment ? `${app.latest_assessment.overall_score.toFixed(1)} / 100` : 'Not available'],
    ['Assessment', (app) => app.latest_assessment?.risk_category || 'Needs more data'],
    ['Confidence', (app) => app.latest_assessment ? `${Math.round(app.latest_assessment.confidence_score * 100)}%` : 'Not available'],
    ['Google Play rating', (app) => `${app.rating.toFixed(1)} (${app.rating_count.toLocaleString()})`],
    ['Installs', (app) => app.installs_text || 'Unavailable'],
    ['Developer', (app) => app.developer],
    ['Last scanned', (app) => new Date(app.last_scanned_at).toLocaleDateString()],
  ];

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="comparison-modal" role="dialog" aria-modal="true" aria-labelledby="comparison-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="detail-header"><div><span className="scan-symbol"><BarChart3 /></span><h2 id="comparison-title">Compare apps</h2><p>Compare current live research signals side by side.</p></div><button className="modal-close" onClick={onClose} aria-label="Close comparison"><X /></button></header>
      <div className="comparison-body"><div className="comparison-grid" style={{ gridTemplateColumns: `150px repeat(${apps.length}, minmax(160px, 1fr))` }}>
        <div className="comparison-label">Field</div>{apps.map((app) => <div className="comparison-app" key={app.package_id}><strong>{app.title}</strong><span>{app.package_id}</span></div>)}
        {rows.flatMap(([label, value]) => [<div className="comparison-label" key={`${label}-label`}>{label}</div>, ...apps.map((app) => <div key={`${label}-${app.package_id}`}>{value(app)}</div>)])}
      </div></div>
      <footer className="detail-footer"><span>Comparison uses the latest stored assessment for each app.</span><button onClick={onClose} className="button-secondary">Close</button></footer>
    </section>
  </div>;
}
