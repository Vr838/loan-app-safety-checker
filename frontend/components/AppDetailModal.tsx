'use client';

import React from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Shield,
  FileText,
  Clock,
  Info,
  Building2,
  AlertOctagon,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AppItem } from '../lib/types';

interface AppDetailModalProps {
  app: AppItem | null;
  onClose: () => void;
}

export const AppDetailModal: React.FC<AppDetailModalProps> = ({ app, onClose }) => {
  if (!app) return null;

  const assessment = app.latest_assessment;
  const score = assessment?.overall_score || 0;
  const category = assessment?.risk_category || 'Insufficient evidence';
  const confidence = assessment?.confidence_score || 0;
  const confidenceLevel = assessment?.confidence_level || 'Insufficient';

  // Prepare chart data for complaint themes
  const themeDist = assessment?.complaint_theme_distribution || {};
  const themeLabels: Record<string, string> = {
    harassment_threats: 'Harassment & Coercion',
    privacy_contact_abuse: 'Contact / Privacy Abuse',
    short_cycle_extortion: '7-Day Trap Tenures',
    hidden_fees_deductions: 'Hidden Upfront Deductions',
    deceptive_rates: 'Deceptive Interest Rates',
  };

  const chartData = Object.entries(themeDist).map(([key, count]) => ({
    name: themeLabels[key] || key,
    count: count,
  }));

  const getScoreColor = () => {
    if (category === 'High concern') return 'text-rose-400 bg-rose-950/40 border-rose-800';
    if (category === 'Caution') return 'text-amber-400 bg-amber-950/40 border-amber-800';
    if (category === 'Lower concern') return 'text-emerald-400 bg-emerald-950/40 border-emerald-800';
    return 'text-sky-400 bg-sky-950/40 border-sky-800';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-start space-x-4">
            {app.icon_url ? (
              <img
                src={app.icon_url}
                alt={app.title}
                className="w-14 h-14 rounded-xl object-cover border border-slate-700 shadow-md shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xl shrink-0">
                {app.title.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{app.title}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                <span className="flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{app.developer}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500">{app.package_id}</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400 font-medium">★ {app.rating.toFixed(1)} ({app.rating_count.toLocaleString()} ratings)</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Top Score & Sufficiency Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk Gauge Card */}
            <div className={`p-5 rounded-xl border ${getScoreColor()}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold opacity-90">
                  Risk Heuristic Index
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-current">
                  {assessment?.engine_version || 'v1.0.0'}
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-extrabold">{category === 'Insufficient evidence' ? '--' : score}</span>
                <span className="text-sm opacity-80">/ 100</span>
                <span className="ml-auto font-bold text-sm uppercase tracking-wide">
                  {category}
                </span>
              </div>
              <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-current transition-all duration-500"
                  style={{ width: `${category === 'Insufficient evidence' ? 10 : Math.min(100, Math.max(5, score))}%` }}
                />
              </div>
            </div>

            {/* Evidence Sufficiency Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Evidence Sufficiency & Confidence
                </span>
                <span className="text-xs font-semibold text-indigo-400">{confidenceLevel} Level</span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-white">{(confidence * 100).toFixed(0)}%</span>
                <span className="text-xs text-slate-400">Data Coverage</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                {assessment?.evidence_sufficiency_rationale || 'Calculating data sufficiency...'}
              </p>
            </div>
          </div>

          {/* Complaint Themes Visual Breakdown (Recharts) */}
          {chartData.length > 0 && (
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <AlertOctagon className="w-4 h-4 text-amber-400" />
                  <span>Financial Complaint Themes Detected in Reviews</span>
                </h3>
                <span className="text-xs text-slate-500">Sampled review analysis</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 30, bottom: 0 }}>
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={150} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.count >= 5 ? '#f43f5e' : entry.count >= 2 ? '#f59e0b' : '#6366f1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Triggered Negative Indicators List */}
          {assessment?.negative_indicators && assessment.negative_indicators.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-rose-300 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Identified Risk Indicators ({assessment.negative_indicators.length})</span>
              </h3>
              <div className="space-y-2">
                {assessment.negative_indicators.map((ind, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/40 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-rose-200">
                      <span>{ind.finding}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900/50 text-rose-300">
                        {ind.rule_id} (+{ind.contribution})
                      </span>
                    </div>
                    {ind.citation_excerpt && (
                      <p className="text-slate-300 italic pl-2 border-l border-rose-800/80">
                        "{ind.citation_excerpt}"
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Source: {ind.source}</span>
                      {ind.source_url && (
                        <a
                          href={ind.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline flex items-center space-x-1"
                        >
                          <span>Verify Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positive Mitigations List */}
          {assessment?.positive_indicators && assessment.positive_indicators.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-emerald-300 flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Verified Mitigations & Safe Harbor Factors</span>
              </h3>
              <div className="space-y-2">
                {assessment.positive_indicators.map((ind, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-emerald-200">
                      <span>{ind.finding}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300">
                        {ind.rule_id} ({ind.contribution})
                      </span>
                    </div>
                    {ind.citation_excerpt && (
                      <p className="text-slate-300 italic pl-2 border-l border-emerald-800/80">
                        "{ind.citation_excerpt}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verifiable External Evidence Records */}
          {app.evidence_items && app.evidence_items.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Corroborating Evidence Records ({app.evidence_items.length})</span>
              </h3>
              <div className="space-y-2">
                {app.evidence_items.map((ev) => (
                  <div key={ev.id} className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{ev.source_title}</span>
                      <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {ev.source_type}
                      </span>
                    </div>
                    <p className="text-slate-300 font-medium">{ev.claim_supported}</p>
                    <p className="text-slate-400 italic bg-slate-900/60 p-2 rounded">
                      "{ev.excerpt}"
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Retrieved: {new Date(ev.access_timestamp).toLocaleDateString()}</span>
                      {ev.source_url && (
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline flex items-center space-x-1"
                        >
                          <span>Original Document</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Store & Legal Links */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-4">
              <a
                href={app.store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1.5 font-medium"
              >
                <span>Google Play Store Listing</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {app.privacy_policy_url && (
                <a
                  href={app.privacy_policy_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1.5 font-medium"
                >
                  <span>Official Privacy Policy</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <span className="text-slate-500 text-[11px]">
              Last audit: {new Date(app.last_scanned_at).toLocaleString()}
            </span>
          </div>

          {/* Legal / Methodological Caveat */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400 font-semibold">
              <Info className="w-3.5 h-3.5" />
              <span>Research Methodology & Assessment Limitations</span>
            </div>
            <p>
              This heuristic report aggregates observable public reviews and regulatory registries. It does not constitute a legal determination, credit recommendation, or financial advice. Absence of complaints does not prove safety, and review anomalies do not prove fraudulent intent.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close Investigation
          </button>
        </div>
      </div>
    </div>
  );
};
