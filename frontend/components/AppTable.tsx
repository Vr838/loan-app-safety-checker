'use client';

import React from 'react';
import {
  Search, SlidersHorizontal, ShieldAlert, AlertTriangle, CheckCircle2,
  HelpCircle, ExternalLink, ChevronRight, ChevronLeft, Star, BarChart3,
  Download, ShieldCheck, X, FileSpreadsheet
} from 'lucide-react';
import { AppItem } from '../lib/types';
import { downloadAppCsv } from '../lib/reportGenerator';
import { getFullRbiCheck } from '../lib/rbiDatabase';

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
  onClearComparison?: () => void;
  isLoading: boolean;
}

const categories = ['All', 'High Concern', 'Caution', 'Lower Concern', 'Insufficient Evidence'];

function riskBadge(assessment?: AppItem['latest_assessment']) {
  if (!assessment) {
    return (
      <span className="risk-badge risk-pending">
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Awaiting scan</span>
      </span>
    );
  }

  const category = assessment.risk_category.toLowerCase();
  const score = assessment.overall_score.toFixed(1);

  if (category.includes('high')) {
    return (
      <span className="risk-badge risk-high font-bold shadow-2xs">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>High Concern · {score}</span>
      </span>
    );
  }
  if (category.includes('caution') || category.includes('moderate')) {
    return (
      <span className="risk-badge risk-caution font-bold shadow-2xs">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Caution · {score}</span>
      </span>
    );
  }
  if (category.includes('lower') || category.includes('safe')) {
    return (
      <span className="risk-badge risk-low font-bold shadow-2xs">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Lower Concern · {score}</span>
      </span>
    );
  }
  return (
    <span className="risk-badge risk-pending font-medium">
      <HelpCircle className="w-3.5 h-3.5" />
      <span>Sparse Data</span>
    </span>
  );
}

function coverageBar(assessment?: AppItem['latest_assessment']) {
  if (!assessment) return <span className="text-xs text-slate-400">N/A</span>;
  const pct = Math.round(assessment.confidence_score * 100);
  const tone = pct >= 80 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-slate-600';

  return (
    <div className="space-y-1 w-28">
      <div className="flex items-center justify-between text-[11px]">
        <span className={`font-semibold ${tone}`}>{assessment.confidence_level}</span>
        <span className="text-slate-500 font-mono">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-slate-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export const AppTable: React.FC<AppTableProps> = ({
  apps,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSortChange,
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageSizeChange,
  onPageChange,
  onSelectApp,
  comparisonIds,
  onToggleComparison,
  onCompare,
  onClearComparison,
  isLoading,
}) => {
  // STRICT RULE: Completely remove any delisted apps from the list
  const activeApps = apps.filter((a) => a.store_status !== 'delisted' && a.is_active);

  return (
    <section className="data-panel relative bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden" aria-label="Loan app research list">
      {/* Toolbar */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Active Play Store Applications
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {totalItems} Live Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any app to view full investigative dossier, official RBI citations, and multi-language review analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="search"
              placeholder="Search apps, package, developer…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-52 sm:w-64"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50/70 rounded-xl px-2.5 py-1 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer text-xs"
            >
              <option value="risk_desc">Highest Risk Score</option>
              <option value="risk_asc">Lowest Risk Score</option>
              <option value="rating_desc">Highest Play Store Rating</option>
              <option value="rating_asc">Lowest Rating</option>
              <option value="name_asc">Alphabetical (A-Z)</option>
              <option value="last_scanned">Recently Scanned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Category Pills */}
      <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
          Filter:
        </span>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${isSelected ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'}`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4 w-10 text-center" aria-label="Compare Checkbox">
                <BarChart3 className="w-3.5 h-3.5 mx-auto text-slate-400" />
              </th>
              <th className="py-3 px-4">Application & Developer</th>
              <th className="py-3 px-4">Store Signals</th>
              <th className="py-3 px-4">Observed Risk</th>
              <th className="py-3 px-4">Official RBI Verification</th>
              <th className="py-3 px-4">Coverage</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    <span>Loading active Play Store applications…</span>
                  </div>
                </td>
              </tr>
            ) : activeApps.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-500 space-y-1">
                  <strong className="block text-sm font-semibold text-slate-800">No applications found</strong>
                  <p className="text-xs">Try adjusting your search query or assessment filter.</p>
                </td>
              </tr>
            ) : (
              activeApps.map((app) => {
                const isSelected = comparisonIds.includes(app.package_id);
                const rbi = getFullRbiCheck(app.package_id, app.developer);
                const isRbiRegulated = rbi.verification?.status === 'verified_regulated';

                return (
                  <tr
                    key={app.package_id}
                    onClick={() => onSelectApp(app)}
                    className={`cursor-pointer transition-colors group ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}
                  >
                    {/* Compare Select Checkbox */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleComparison(app.package_id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                        aria-label={`Select ${app.title} for comparison`}
                      />
                    </td>

                    {/* App Title & Identity */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {app.icon_url ? (
                          <img
                            src={app.icon_url}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {app.title.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0 max-w-xs">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate text-xs">
                            {app.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">{app.developer}</div>
                          <code className="text-[10px] text-slate-400 font-mono truncate block mt-0.5">
                            {app.package_id}
                          </code>
                        </div>
                      </div>
                    </td>

                    {/* Store Signals */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-bold text-slate-800 text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{app.rating.toFixed(1)}</span>
                          <span className="text-[10px] font-normal text-slate-400">
                            ({app.rating_count.toLocaleString()})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {app.installs_text ?? `${app.installs_approx.toLocaleString()}+`}
                        </div>
                      </div>
                    </td>

                    {/* Observed Risk Score Badge */}
                    <td className="py-3 px-4">
                      {riskBadge(app.latest_assessment)}
                    </td>

                    {/* Official RBI Status */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${isRbiRegulated ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>{isRbiRegulated ? 'Verified NBFC' : 'DLA Partner'}</span>
                        </span>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]" title={rbi.verification?.regulated_entity_name}>
                          {rbi.verification?.regulated_entity_name}
                        </div>
                      </div>
                    </td>

                    {/* Coverage Bar */}
                    <td className="py-3 px-4">
                      {coverageBar(app.latest_assessment)}
                    </td>

                    {/* Row Actions */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectApp(app)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Inspect detailed evidence dossier"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => downloadAppCsv(app)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Export app research CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {app.store_url && (
                          <a
                            href={app.store_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Open Google Play Store listing"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Bottom Comparison Tray when items selected */}
      {comparisonIds.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 p-3 bg-slate-900/95 backdrop-blur-md text-white border-t border-slate-800 flex items-center justify-between shadow-2xl z-30 transition-transform">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {comparisonIds.length}
            </span>
            <span className="text-xs font-medium">
              {comparisonIds.length === 1 ? '1 app selected (select 1 more to compare)' : `${comparisonIds.length} apps selected for side-by-side comparison`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onClearComparison && (
              <button
                onClick={onClearComparison}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                Clear
              </button>
            )}
            <button
              onClick={onCompare}
              disabled={comparisonIds.length < 2}
              className={`button-primary text-xs py-1.5 px-3.5 ${comparisonIds.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Compare Side-by-Side</span>
            </button>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      <footer className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-slate-200 rounded px-1.5 py-0.5 text-xs bg-white text-slate-700 cursor-pointer"
          >
            <option value={15}>15 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>All (100)</option>
          </select>
          <span className="text-slate-400">·</span>
          <span>Showing page {page} of {totalPages}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono font-medium text-slate-700">{page}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </section>
  );
};
