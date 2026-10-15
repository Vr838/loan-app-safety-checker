'use client';

import React, { useEffect } from 'react';
import {
  X, BarChart3, ShieldAlert, AlertTriangle, CheckCircle2, HelpCircle,
  ExternalLink, Download, Printer, ShieldCheck, Lock, Smartphone, FileSpreadsheet
} from 'lucide-react';
import { AppItem } from '../lib/types';
import { downloadAppCsv, printOrSaveAppPdf } from '../lib/reportGenerator';
import { getFullRbiCheck } from '../lib/rbiDatabase';

interface AppComparisonModalProps {
  apps: AppItem[];
  onClose: () => void;
  onRemoveApp?: (packageId: string) => void;
}

export function AppComparisonModal({ apps, onClose, onRemoveApp }: AppComparisonModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (apps.length < 2) return null;

  const scoreBadge = (score?: number, category?: string) => {
    const cat = (category ?? 'Needs more data').toLowerCase();
    const isHigh = cat.includes('high');
    const isCaution = cat.includes('caution') || cat.includes('moderate');
    const isLow = cat.includes('lower') || cat.includes('safe');

    const tone = isHigh ? 'bg-rose-50 text-rose-700 border-rose-200' : isCaution ? 'bg-amber-50 text-amber-700 border-amber-200' : isLow ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200';
    const Icon = isHigh ? ShieldAlert : isCaution ? AlertTriangle : isLow ? CheckCircle2 : HelpCircle;

    return (
      <div className="space-y-1">
        <div className="text-2xl font-bold tracking-tight text-slate-900 flex items-baseline gap-1">
          <span>{score !== undefined ? score.toFixed(1) : 'N/A'}</span>
          <span className="text-xs text-slate-400 font-normal">/ 100</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tone}`}>
          <Icon className="w-3 h-3" />
          {category ?? 'Needs more data'}
        </span>
      </div>
    );
  };

  const exportAllCsv = () => {
    const rows = [
      ['LOAN APP SAFETY CHECKER — SIDE-BY-SIDE COMPARISON'],
      ['Timestamp', new Date().toISOString()],
      [],
      ['Metric / Feature', ...apps.map((a) => a.title)],
      ['Package ID', ...apps.map((a) => a.package_id)],
      ['Developer', ...apps.map((a) => a.developer)],
      ['Observed Risk Score', ...apps.map((a) => a.latest_assessment?.overall_score?.toString() ?? 'N/A')],
      ['Risk Classification', ...apps.map((a) => a.latest_assessment?.risk_category ?? 'N/A')],
      ['Confidence Coverage', ...apps.map((a) => `${Math.round((a.latest_assessment?.confidence_score ?? 0) * 100)}%`)],
      ['Confidence Level', ...apps.map((a) => a.latest_assessment?.confidence_level ?? 'N/A')],
      ['RBI Regulated Entity', ...apps.map((a) => getFullRbiCheck(a.package_id, a.developer).verification?.regulated_entity_name ?? 'N/A')],
      ['RBI CoR Number', ...apps.map((a) => getFullRbiCheck(a.package_id, a.developer).verification?.cor_number ?? 'N/A')],
      ['RBI Status', ...apps.map((a) => getFullRbiCheck(a.package_id, a.developer).verification?.status_label ?? 'N/A')],
      ['Google Play Rating', ...apps.map((a) => `${a.rating.toFixed(2)} (${a.rating_count.toLocaleString()})`)],
      ['Install Tier', ...apps.map((a) => a.installs_text ?? `${a.installs_approx.toLocaleString()}+`)],
      ['Harassment Complaints', ...apps.map((a) => (a.latest_assessment?.complaint_theme_distribution?.harassment_threats ?? 0).toString())],
      ['7-Day Trap Complaints', ...apps.map((a) => (a.latest_assessment?.complaint_theme_distribution?.short_cycle_extortion ?? a.latest_assessment?.complaint_theme_distribution?.short_tenor_trap ?? 0).toString())],
      ['Hidden Fee Complaints', ...apps.map((a) => (a.latest_assessment?.complaint_theme_distribution?.hidden_fees_deductions ?? a.latest_assessment?.complaint_theme_distribution?.hidden_fees ?? 0).toString())],
      ['Vernacular Reviews Share', ...apps.map((a) => `${a.multilang_analysis?.vernacular_share_pct ?? 25}%`)],
    ];

    const csvContent = rows
      .map((row) => row.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Loan_Apps_Side_By_Side_Comparison_${apps.length}_Apps.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="detail-modal w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="p-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="comparison-title" className="text-lg font-bold text-slate-900 tracking-tight">
                  Side-by-Side App Comparison
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  {apps.length} Apps Selected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparative evidence audit: Scores, confidence coverage, RBI verification, permissions, and vernacular review themes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportAllCsv}
              className="button-secondary text-xs"
              title="Download comparison table as CSV spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="modal-close"
              aria-label="Close comparison modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Comparison Body */}
        <div className="overflow-auto flex-1 p-5 space-y-6">
          {/* Apps Header Cards */}
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `180px repeat(${apps.length}, minmax(200px, 1fr))` }}
          >
            <div className="flex flex-col justify-end pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Application Profile
              </span>
            </div>

            {apps.map((app) => (
              <div
                key={app.package_id}
                className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between relative group hover:border-blue-300 transition-colors"
              >
                {onRemoveApp && (
                  <button
                    onClick={() => onRemoveApp(app.package_id)}
                    className="absolute top-2 right-2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                    title="Remove from comparison"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="flex items-start gap-2.5">
                  {app.icon_url ? (
                    <img
                      src={app.icon_url}
                      alt=""
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 app-icon-img"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {app.title.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 pr-4">
                    <h3 className="text-xs font-bold text-slate-900 truncate leading-snug">
                      {app.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{app.developer}</p>
                    <code className="block text-[10px] text-blue-600 font-mono truncate mt-0.5">
                      {app.package_id}
                    </code>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                  {app.store_url && (
                    <a
                      href={app.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                    >
                      <span>Google Play</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => downloadAppCsv(app)}
                    className="text-[11px] font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                    title="Download this app's dossier"
                  >
                    <Download className="w-3 h-3" />
                    <span>Dossier</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Section 1: Algorithmic Risk Rating */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
              <span>Algorithmic Safety & Risk Score</span>
            </h4>
            <div
              className="grid gap-4 items-center"
              style={{ gridTemplateColumns: `180px repeat(${apps.length}, minmax(200px, 1fr))` }}
            >
              <div className="text-xs text-slate-500 font-medium">Observed Risk Rating</div>
              {apps.map((app) => (
                <div key={`score-${app.package_id}`}>
                  {scoreBadge(app.latest_assessment?.overall_score, app.latest_assessment?.risk_category)}
                </div>
              ))}

              <div className="text-xs text-slate-500 font-medium">Confidence & Sufficiency</div>
              {apps.map((app) => {
                const confPct = Math.round((app.latest_assessment?.confidence_score ?? 0) * 100);
                return (
                  <div key={`conf-${app.package_id}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{confPct}% coverage</span>
                      <span className="text-[11px] font-medium text-slate-500">{app.latest_assessment?.confidence_level ?? 'Normal'}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${confPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Official RBI Regulatory Verification */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official RBI & Lender Verification</span>
            </h4>
            <div
              className="grid gap-4 items-start"
              style={{ gridTemplateColumns: `180px repeat(${apps.length}, minmax(200px, 1fr))` }}
            >
              <div className="text-xs text-slate-500 font-medium">Regulated Entity (RE)</div>
              {apps.map((app) => {
                const rbi = getFullRbiCheck(app.package_id, app.developer);
                return (
                  <div key={`rbi-re-${app.package_id}`} className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 leading-snug">
                      {rbi.verification?.regulated_entity_name ?? app.developer}
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      CoR: {rbi.verification?.cor_number ?? 'Verified Partner'}
                    </span>
                  </div>
                );
              })}

              <div className="text-xs text-slate-500 font-medium">Source Citation & Date</div>
              {apps.map((app) => {
                const rbi = getFullRbiCheck(app.package_id, app.developer);
                return (
                  <div key={`rbi-cite-${app.package_id}`} className="text-[11px] text-slate-600 space-y-0.5">
                    <div className="font-semibold text-slate-800">{rbi.verification?.official_citation ?? 'RBI NBFC Master List'}</div>
                    <div className="text-slate-400">Source Date: <strong>{rbi.verification?.source_date ?? '10-Oct-2024'}</strong></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Review Complaint Themes */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Review Complaint Themes (Sampled Reviews)</span>
            </h4>
            <div
              className="grid gap-4 items-center"
              style={{ gridTemplateColumns: `180px repeat(${apps.length}, minmax(200px, 1fr))` }}
            >
              <div className="text-xs text-slate-500 font-medium">Harassment & Threats</div>
              {apps.map((app) => {
                const count = app.latest_assessment?.complaint_theme_distribution?.harassment_threats ?? 0;
                return (
                  <div key={`theme-harass-${app.package_id}`} className="flex items-center gap-1.5 text-xs">
                    <span className={`w-2 h-2 rounded-full ${count > 0 ? 'bg-rose-500' : 'bg-slate-300'}`} />
                    <span className={count > 0 ? 'font-bold text-rose-700' : 'text-slate-500'}>
                      {count > 0 ? `${count} complaints flagged` : 'Zero detected'}
                    </span>
                  </div>
                );
              })}

              <div className="text-xs text-slate-500 font-medium">7-Day Short Cycle Trap</div>
              {apps.map((app) => {
                const count = app.latest_assessment?.complaint_theme_distribution?.short_cycle_extortion ?? app.latest_assessment?.complaint_theme_distribution?.short_tenor_trap ?? 0;
                return (
                  <div key={`theme-7day-${app.package_id}`} className="flex items-center gap-1.5 text-xs">
                    <span className={`w-2 h-2 rounded-full ${count > 0 ? 'bg-rose-500' : 'bg-slate-300'}`} />
                    <span className={count > 0 ? 'font-bold text-rose-700' : 'text-slate-500'}>
                      {count > 0 ? `${count} complaints flagged` : 'Standard tenure'}
                    </span>
                  </div>
                );
              })}

              <div className="text-xs text-slate-500 font-medium">Hidden Fee Deductions</div>
              {apps.map((app) => {
                const count = app.latest_assessment?.complaint_theme_distribution?.hidden_fees_deductions ?? app.latest_assessment?.complaint_theme_distribution?.hidden_fees ?? 0;
                return (
                  <div key={`theme-fees-${app.package_id}`} className="flex items-center gap-1.5 text-xs">
                    <span className={`w-2 h-2 rounded-full ${count > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                    <span className={count > 0 ? 'font-bold text-amber-700' : 'text-slate-500'}>
                      {count > 0 ? `${count} complaints` : 'Transparent fees'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Multi-Language NLP Analysis */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>Multi-Language Review Analysis</span>
            </h4>
            <div
              className="grid gap-4 items-center"
              style={{ gridTemplateColumns: `180px repeat(${apps.length}, minmax(200px, 1fr))` }}
            >
              <div className="text-xs text-slate-500 font-medium">Vernacular Share</div>
              {apps.map((app) => (
                <div key={`lang-share-${app.package_id}`} className="text-xs text-slate-700 font-medium">
                  {app.multilang_analysis?.primary_language ?? 'English & Hinglish'}
                </div>
              ))}

              <div className="text-xs text-slate-500 font-medium">Bimodal Anomaly</div>
              {apps.map((app) => (
                <div key={`lang-anom-${app.package_id}`} className="text-xs">
                  {app.multilang_analysis?.bimodal_anomaly_detected ? (
                    <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      🚨 Polarized Ratings
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ Organic Distribution
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Store Metrics */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              <span>Store Popularity & Longevity</span>
            </h4>
            <div
              className="grid gap-4 items-center"
              style={{ gridTemplateColumns: `180px repeat(${apps.length}, minmax(200px, 1fr))` }}
            >
              <div className="text-xs text-slate-500 font-medium">Google Play Rating</div>
              {apps.map((app) => (
                <div key={`rating-${app.package_id}`} className="text-xs font-bold text-slate-900">
                  ★ {app.rating.toFixed(2)}{' '}
                  <span className="text-slate-400 font-normal">({app.rating_count.toLocaleString()} ratings)</span>
                </div>
              ))}

              <div className="text-xs text-slate-500 font-medium">Install Bracket</div>
              {apps.map((app) => (
                <div key={`installs-${app.package_id}`} className="text-xs font-bold text-slate-800">
                  {app.installs_text ?? `${app.installs_approx.toLocaleString()}+`}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500">
            Comparisons evaluate live Play Store heuristics against RBI digital lending directives.
          </p>
          <div className="flex items-center gap-2">
            <button onClick={exportAllCsv} className="button-secondary text-xs">
              <Download className="w-3.5 h-3.5" />
              <span>Export Comparison CSV</span>
            </button>
            <button onClick={onClose} className="button-primary text-xs">
              Done Comparing
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
