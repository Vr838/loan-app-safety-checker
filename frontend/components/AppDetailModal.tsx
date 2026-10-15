'use client';

import React, { useEffect } from 'react';
import { X, ExternalLink, ShieldAlert, CheckCircle2, HelpCircle, FileText, Building2, Info } from 'lucide-react';
import { AppItem } from '../lib/types';

interface AppDetailModalProps { app: AppItem | null; onClose: () => void; }

export const AppDetailModal: React.FC<AppDetailModalProps> = ({ app, onClose }) => {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  if (!app) return null;
  const assessment = app.latest_assessment;
  const category = assessment?.risk_category || 'Needs more data';
  const lower = category.toLowerCase();
  const tone = lower.includes('high') ? 'detail-risk-high' : lower.includes('caution') || lower.includes('moderate') ? 'detail-risk-caution' : lower.includes('lower') ? 'detail-risk-low' : 'detail-risk-pending';
  const RiskIcon = lower.includes('high') ? ShieldAlert : lower.includes('lower') ? CheckCircle2 : HelpCircle;
  const themes = Object.entries(assessment?.complaint_theme_distribution || {}).filter(([, count]) => count > 0);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="app-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="detail-header">
          <div className="flex min-w-0 items-start gap-3">
            {app.icon_url ? <img src={app.icon_url} alt="" className="detail-icon" /> : <span className="detail-icon detail-fallback">{app.title.slice(0, 1)}</span>}
            <div className="min-w-0"><h2 id="app-detail-title">{app.title}</h2><p><Building2 />{app.developer}</p><p className="detail-package">{app.package_id}</p></div>
          </div>
          <button onClick={onClose} className="modal-close" aria-label="Close app details"><X /></button>
        </header>

        <div className="detail-body">
          <div className="detail-overview">
            <div className={`detail-score ${tone}`}><div className="detail-score-title"><RiskIcon />Observed risk score</div><div className="detail-score-number">{assessment?.overall_score ?? 'Not available'}<small>/ 100</small></div><strong>{category}</strong><p>{assessment?.evidence_sufficiency_rationale || 'There is not enough current data to assess this app.'}</p></div>
            <div className="detail-coverage"><span>Data coverage</span><strong>{assessment ? `${Math.round(assessment.confidence_score * 100)}%` : 'Not available'}</strong><p>{assessment?.confidence_level || 'Insufficient'} confidence from sampled reviews, listing details, and available evidence.</p></div>
          </div>

          {app.safety_reason && <div className="detail-callout"><Info /><p>{app.safety_reason}</p></div>}

          {assessment?.negative_indicators?.length ? <DetailList title="Signals found" items={assessment.negative_indicators} tone="negative" /> : <EmptyEvidence title="Signals found" text="No matching complaint themes were found in this sampled data." />}
          {assessment?.positive_indicators?.length ? <DetailList title="Context in the listing" items={assessment.positive_indicators} tone="positive" /> : null}
          {themes.length ? <section className="detail-section"><h3>Review themes</h3><div className="theme-list">{themes.map(([theme, count]) => <span key={theme}>{theme.replaceAll('_', ' ')} <b>{count}</b></span>)}</div></section> : null}
          {app.evidence_items?.length ? <section className="detail-section"><h3>Linked sources</h3><div className="evidence-list">{app.evidence_items.map((item) => <article key={item.id}><div><strong>{item.source_title}</strong><span>{item.source_type}</span></div><p>{item.claim_supported}</p>{item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer">Open source <ExternalLink /></a>}</article>)}</div></section> : null}
        </div>

        <footer className="detail-footer"><span>Last checked {new Date(app.last_scanned_at).toLocaleString()}</span><div className="flex gap-2">{app.store_url && <a href={app.store_url} target="_blank" rel="noopener noreferrer" className="detail-link">Google Play <ExternalLink /></a>}<button onClick={onClose} className="button-secondary">Close</button></div></footer>
      </section>
    </div>
  );
};

function DetailList({ title, items, tone }: { title: string; items: NonNullable<AppItem['latest_assessment']>['negative_indicators']; tone: 'negative' | 'positive' }) {
  return <section className="detail-section"><h3>{title}</h3><div className="indicator-list">{items.map((item, index) => <article className={tone} key={`${item.rule_id}-${index}`}><div><strong>{item.finding}</strong><span>{item.rule_id} · {item.contribution > 0 ? '+' : ''}{item.contribution}</span></div>{item.citation_excerpt && <p>{item.citation_excerpt}</p>}{item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer">Open source <ExternalLink /></a>}</article>)}</div></section>;
}

function EmptyEvidence({ title, text }: { title: string; text: string }) { return <section className="detail-section"><h3>{title}</h3><p className="detail-empty">{text}</p></section>; }
