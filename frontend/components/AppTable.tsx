'use client';

import React from 'react';
import {
  Search, SlidersHorizontal, ShieldAlert, AlertTriangle, CheckCircle2,
  HelpCircle, ExternalLink, ChevronRight, ChevronLeft, Star, BarChart3,
} from 'lucide-react';
import { AppItem } from '../lib/types';

interface AppTableProps {
  apps: AppItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageSizeChange: (newSize: number) => void;
  onPageChange: (newPage: number) => void;
  onSelectApp: (app: AppItem) => void;
  comparisonIds: string[];
  onToggleComparison: (packageId: string) => void;
  onCompare: () => void;
  isLoading: boolean;
}

const categories = ['All', 'High Concern', 'Caution', 'Moderate', 'Lower Concern', 'Insufficient Evidence'];

function riskBadge(assessment?: AppItem['latest_assessment']) {
  if (!assessment) return <span className="risk-badge risk-pending"><HelpCircle />Awaiting scan</span>;
  const category = assessment.risk_category.toLowerCase();
  if (category.includes('high')) return <span className="risk-badge risk-high"><ShieldAlert />High concern · {assessment.overall_score}</span>;
  if (category.includes('caution') || category.includes('moderate')) return <span className="risk-badge risk-caution"><AlertTriangle />{assessment.risk_category} · {assessment.overall_score}</span>;
  if (category.includes('lower') || category.includes('safe')) return <span className="risk-badge risk-low"><CheckCircle2 />Lower concern · {assessment.overall_score}</span>;
  return <span className="risk-badge risk-pending"><HelpCircle />Needs more data</span>;
}

function confidence(assessment?: AppItem['latest_assessment']) {
  if (!assessment) return <span className="confidence-label">Not available</span>;
  const tone = assessment.confidence_level === 'High' ? 'confidence-high' : assessment.confidence_level === 'Medium' ? 'confidence-medium' : 'confidence-low';
  return <div className="space-y-0.5"><span className={`confidence-label ${tone}`}>{assessment.confidence_level}</span><span className="block text-[11px] text-[#86868b]">{Math.round(assessment.confidence_score * 100)}% coverage</span></div>;
}

export const AppTable: React.FC<AppTableProps> = ({
  apps, searchQuery, onSearchChange, selectedCategory, onSelectCategory, sortBy,
  onSortChange, page, totalPages, totalItems, pageSize, onPageSizeChange,
  onPageChange, onSelectApp, comparisonIds, onToggleComparison, onCompare, isLoading,
}) => (
  <section className="data-panel" aria-label="Loan app research list">
    <div className="data-toolbar">
      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Apps in the latest scan</h2>
        <p className="mt-0.5 text-xs text-[#6e6e73]">Open any app to examine its public evidence.</p>
      </div>
      <label className="search-field">
        <Search className="w-4 h-4" />
        <input type="search" placeholder="Search apps" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
      </label>
      <label className="sort-field">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="sr-only">Sort apps</span>
        <select value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
          <option value="risk_desc">Highest score</option>
          <option value="risk_asc">Lowest score</option>
          <option value="rating_desc">Highest rating</option>
          <option value="rating_asc">Lowest rating</option>
          <option value="name_asc">Name</option>
          <option value="last_scanned">Recently scanned</option>
        </select>
      </label>
      <button className="button-secondary compare-trigger" disabled={comparisonIds.length < 2} onClick={onCompare}><BarChart3 />Compare {comparisonIds.length || ''}</button>
    </div>

    <div className="filter-row" aria-label="Filter apps by assessment">
      {categories.map((category) => <button key={category} onClick={() => onSelectCategory(category)} className={selectedCategory === category ? 'filter-chip is-active' : 'filter-chip'}>{category === 'Lower Concern' ? 'Lower concern' : category === 'Insufficient Evidence' ? 'Needs more data' : category}</button>)}
    </div>

    <div className="overflow-x-auto">
      <table className="app-table">
        <thead><tr><th aria-label="Select for comparison" /><th>App</th><th>Store</th><th>Observed signals</th><th>Data coverage</th><th aria-label="Open details" /></tr></thead>
        <tbody>
          {isLoading ? <tr><td colSpan={6} className="table-message"><span className="loading-dot" />Loading live data…</td></tr>
            : apps.length === 0 ? <tr><td colSpan={6} className="table-message"><strong>No apps match these filters.</strong><br /><span>Try a different search or assessment filter.</span></td></tr>
            : apps.map((app) => <tr key={app.package_id} onClick={() => onSelectApp(app)}>
              <td><input className="compare-checkbox" type="checkbox" checked={comparisonIds.includes(app.package_id)} onClick={(event) => event.stopPropagation()} onChange={() => onToggleComparison(app.package_id)} aria-label={`Select ${app.title} for comparison`} /></td>
              <td>
                <div className="app-identity">
                  {app.icon_url ? <img src={app.icon_url} alt="" className="app-icon" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span className="app-fallback">{app.title.slice(0, 1)}</span>}
                  <div className="min-w-0">
                    <div className="app-name">{app.title}</div>
                    <div className="app-developer">{app.developer}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="app-package">{app.package_id}</span>
                      {app.store_status === 'delisted' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">Delisted (404)</span>
                      ) : app.store_url ? (
                        <a href={app.store_url} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-0.5" title="Verified 200 OK on Google Play">
                          <ExternalLink className="w-2.5 h-2.5" /> Play Store (200 OK)
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </td>
              <td><div className="rating"><Star />{app.rating.toFixed(1)} <span>({app.rating_count.toLocaleString()})</span></div><div className="store-meta">{app.installs_text || 'Install count unavailable'}</div></td>
              <td><div className="space-y-2">{riskBadge(app.latest_assessment)}<p className="signal-rationale">{app.safety_reason || app.latest_assessment?.evidence_sufficiency_rationale || 'No assessment has been recorded.'}</p></div></td>
              <td>{confidence(app.latest_assessment)}</td>
              <td>
                <div className="row-actions">
                  <button className="inspect-button" onClick={(event) => { event.stopPropagation(); onSelectApp(app); }}>View <ChevronRight /></button>
                  {app.store_status === 'delisted' ? (
                    <span className="text-[10px] text-rose-600 font-medium px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200">Delisted (404)</span>
                  ) : app.store_url ? (
                    <a href={app.store_url} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} aria-label={`Open ${app.title} on Google Play`} className="store-link" title="Verified 200 OK on Google Play">
                      <ExternalLink />
                    </a>
                  ) : null}
                </div>
              </td>
            </tr>)}
        </tbody>
      </table>
    </div>

    <div className="data-footer">
      <span>Showing {apps.length} of {totalItems} apps</span>
      <div className="flex items-center gap-3"><label className="per-page">Per page <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label><div className="pagination"><button disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page"><ChevronLeft /></button><span>{page} / {totalPages || 1}</span><button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page"><ChevronRight /></button></div></div>
    </div>
  </section>
);
