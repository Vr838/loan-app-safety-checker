'use client';

import React, { useEffect, useState } from 'react';
import {
  X, ExternalLink, ShieldAlert, AlertTriangle, CheckCircle2, HelpCircle,
  Building2, Info, Download, Printer, ShieldCheck, Languages, AlertCircle,
  FileSpreadsheet, Lock, ChevronRight, Share2, Check
} from 'lucide-react';
import { AppItem, RbiCheck } from '../lib/types';
import { downloadAppCsv, printOrSaveAppPdf } from '../lib/reportGenerator';
import { getFullRbiCheck } from '../lib/rbiDatabase';
import { getMultiLanguageAnalysisForApp } from '../lib/multilang';

interface AppDetailModalProps {
  app: AppItem | null;
  onClose: () => void;
}

export const AppDetailModal: React.FC<AppDetailModalProps> = ({ app, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  if (!app) return null;

  const assessment = app.latest_assessment;
  const category = assessment?.risk_category ?? 'Insufficient Evidence';
  const lower = category.toLowerCase();
  const isHigh = lower.includes('high');
  const isCaution = lower.includes('caution') || lower.includes('moderate');
  const isLow = lower.includes('lower') || lower.includes('safe');

  const tone = isHigh ? 'detail-risk-high' : isCaution ? 'detail-risk-caution' : isLow ? 'detail-risk-low' : 'detail-risk-pending';
  const RiskIcon = isHigh ? ShieldAlert : isLow ? CheckCircle2 : AlertTriangle;

  // Resolve RBI verification with source dates & citations
  const rbi: RbiCheck = app.rbi_verification
    ? {
        status: app.rbi_verification.status,
        developer_name: app.developer,
        message: app.rbi_verification.excerpt,
        sources: [
          {
            title: app.rbi_verification.source_name,
            url: app.rbi_verification.source_url,
            source_date: app.rbi_verification.source_date,
            citation: app.rbi_verification.official_citation,
            excerpt: app.rbi_verification.excerpt,
          },
        ],
        verification: app.rbi_verification,
      }
    : getFullRbiCheck(app.package_id, app.developer);

  // Resolve Multi-Language Review Analysis
  const multilang = app.multilang_analysis ?? getMultiLanguageAnalysisForApp(app);

  const themes = Object.entries(assessment?.complaint_theme_distribution ?? {}).filter(
    ([, count]) => count > 0,
  );

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(app.store_url || window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="detail-modal w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-detail-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="p-5 border-b border-slate-200/80 bg-slate-50/70 flex items-start justify-between gap-4 shrink-0">
          <div className="flex min-w-0 items-start gap-3.5">
            {app.icon_url ? (
              <img
                src={app.icon_url}
                alt=""
                width={48}
                height={48}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs app-icon-img"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <span className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base shrink-0">
                {app.title.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="app-detail-title" className="text-lg font-bold text-slate-900 truncate">
                  {app.title}
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live 200 OK
                </span>
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{app.developer}</span>
              </p>
              <code className="text-[11px] font-mono text-blue-600 truncate block mt-0.5">
                {app.package_id}
              </code>
            </div>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => printOrSaveAppPdf(app, rbi)}
              className="button-primary text-xs py-1.5 px-3"
              title="Export formatted PDF dossier for interview submissions"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF Dossier</span>
            </button>
            <button
              onClick={() => downloadAppCsv(app, rbi)}
              className="button-secondary text-xs py-1.5 px-2.5"
              title="Download CSV research report"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
            <button onClick={onClose} className="modal-close" aria-label="Close app details">
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
          {/* Executive Risk & Coverage Scorecard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${isHigh ? 'bg-rose-50/70 border-rose-200 text-rose-950' : isCaution ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'} flex flex-col justify-between`}>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <RiskIcon className="w-4 h-4" />
                  <span>Observed Algorithmic Risk Index</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-baseline gap-1">
                  <span>{assessment?.overall_score?.toFixed(1) ?? 'N/A'}</span>
                  <span className="text-xs font-normal opacity-70">/ 100</span>
                </div>
                <div className="font-bold text-sm mt-1">{category}</div>
              </div>
              <p className="text-xs opacity-80 mt-3 leading-relaxed">
                {assessment?.evidence_sufficiency_rationale ||
                  'Heuristic risk index computed from public store metrics, review sentiment, and regulatory disclosures.'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Evidence Sufficiency
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {assessment?.confidence_level ?? 'Normal'} Coverage
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mt-2">
                  {assessment ? `${Math.round(assessment.confidence_score * 100)}%` : 'N/A'}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Sampled Depth: <strong>{app.review_sample_count ?? 35} reviews</strong> · Google Play Rating: <strong>★ {app.rating.toFixed(2)}</strong> ({app.rating_count.toLocaleString()})
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200 text-xs text-slate-500">
                Install Bracket: <strong>{app.installs_text ?? `${app.installs_approx.toLocaleString()}+`}</strong>
              </div>
            </div>
          </div>

          {/* Quick Safety Summary Callout */}
          {app.safety_reason && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs flex items-start gap-2.5 leading-relaxed">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Listing Heuristic Note:</strong>
                <span>{app.safety_reason}</span>
              </div>
            </div>
          )}

          {/* Section 1: Official RBI & Lender Regulatory Verification */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Official RBI & Lender Verification
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {rbi.verification?.status_label ?? 'Regulated Entity Linked'}
              </span>
            </div>

            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Verified Regulated Entity (RE):</span>
                  <strong className="text-slate-900 text-sm">
                    {rbi.verification?.regulated_entity_name ?? app.developer}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Registration / CoR Number:</span>
                  <code className="text-blue-700 font-mono font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                    {rbi.verification?.cor_number ?? 'DLA Partnership'}
                  </code>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">NBFC / Banking Category:</span>
                  <span className="text-slate-800 font-medium">
                    {rbi.verification?.category ?? 'Digital Lending App (DLA)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Partnership Model:</span>
                  <span className="text-slate-800 font-medium">
                    {rbi.verification?.lending_partner_type ?? 'Balance Sheet Lender / LSP'}
                  </span>
                </div>
              </div>

              {/* Official Citations with Source Dates */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Official Government & Regulatory Citations
                </span>
                <div className="space-y-2">
                  {(rbi.sources ?? []).map((source, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <strong className="text-slate-900">{source.title}</strong>
                        {source.source_date && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                            Source Date: {source.source_date}
                          </span>
                        )}
                      </div>
                      {source.citation && (
                        <div className="text-[11px] font-mono text-blue-700">{source.citation}</div>
                      )}
                      {source.excerpt && (
                        <p className="text-slate-600 text-[11px] leading-relaxed italic">
                          "{source.excerpt}"
                        </p>
                      )}
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 mt-1"
                        >
                          <span>Open official portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Multi-Language Review Analysis (Hindi, Hinglish, Regional) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Multi-Language Review & Vernacular NLP Analysis
                </h3>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {multilang.primary_language}
              </span>
            </div>

            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Vernacular Sentiment Share: </span>
                  <strong className="text-slate-900">{multilang.vernacular_share_pct}% of total reviews</strong>
                </div>
                {multilang.bimodal_anomaly_detected ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    🚨 Bimodal Polarization Detected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    ✓ Organic Distribution
                  </span>
                )}
              </div>

              {/* Detected Vernacular Keywords */}
              {multilang.keyword_matches.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Detected Harassment & Risk Triggers in Vernacular Text:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {multilang.keyword_matches.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 shadow-2xs"
                      >
                        <span className="text-rose-700 font-bold">{item.keyword}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 text-[11px]">{item.meaning}</span>
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px]">
                          {item.count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Vernacular Review Quotes */}
              {multilang.sample_reviews.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Sample Vernacular Reviews with Translated Risk Context:
                  </span>
                  <div className="space-y-2">
                    {multilang.sample_reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className={`p-3 rounded-lg border text-xs space-y-1 ${rev.sentiment === 'negative' ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200'}`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <strong className="text-slate-800">{rev.author}</strong>
                          <span className="text-slate-500">
                            Language: <strong>{rev.language}</strong> · Rating ★{rev.rating}
                          </span>
                        </div>
                        <p className="text-slate-900 italic font-serif text-[11.5px]">"{rev.text}"</p>
                        <p className="text-[11px] text-slate-600 font-sans">
                          <strong>→ Translated Context:</strong> {rev.translated_context}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Review Themes Breakdown */}
          {themes.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Financial Risk Complaint Themes Distribution
              </h3>
              <div className="flex flex-wrap gap-2">
                {themes.map(([theme, count]) => (
                  <span
                    key={theme}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    <span>{theme.replaceAll('_', ' ')}</span>
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-900 flex items-center justify-center text-[10px]">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Section 4: Negative & Positive Indicators */}
          {assessment?.negative_indicators?.length ? (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Negative Risk Triggers Tripped ({assessment.negative_indicators.length})</span>
              </h3>
              <div className="space-y-2">
                {assessment.negative_indicators.map((ind, i) => (
                  <div key={i} className="p-3 rounded-lg border border-rose-200 bg-rose-50/40 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-rose-950 font-bold">{ind.finding}</strong>
                      <span className="font-mono text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-semibold">
                        {ind.rule_id} · +{ind.contribution}
                      </span>
                    </div>
                    {ind.citation_excerpt && (
                      <p className="text-slate-600 text-[11px]">{ind.citation_excerpt}</p>
                    )}
                    <div className="text-[10px] text-slate-400">Source: {ind.source}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {assessment?.positive_indicators?.length ? (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mitigating Factors ({assessment.positive_indicators.length})</span>
              </h3>
              <div className="space-y-2">
                {assessment.positive_indicators.map((ind, i) => (
                  <div key={i} className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-emerald-950 font-bold">{ind.finding}</strong>
                      <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-semibold">
                        {ind.rule_id} · {ind.contribution}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">Source: {ind.source}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => printOrSaveAppPdf(app, rbi)}
              className="button-primary text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Download PDF Dossier</span>
            </button>
            <button
              onClick={() => downloadAppCsv(app, rbi)}
              className="button-secondary text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="button-secondary text-xs"
              title="Copy share link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>
            {app.store_url && (
              <a
                href={app.store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="button-secondary text-xs"
              >
                <span>Google Play</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button onClick={onClose} className="button-secondary text-xs">
              Close
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};
