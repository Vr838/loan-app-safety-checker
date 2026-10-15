'use client';

import React from 'react';
import {
  Search,
  SlidersHorizontal,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Star,
  Download,
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
  onPageChange: (newPage: number) => void;
  onSelectApp: (app: AppItem) => void;
  isLoading: boolean;
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
  onPageChange,
  onSelectApp,
  isLoading,
}) => {
  const categories = ['All', 'High concern', 'Caution', 'Lower concern', 'Insufficient evidence'];

  const getRiskBadge = (assessment?: AppItem['latest_assessment']) => {
    if (!assessment) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Pending Scan</span>
        </span>
      );
    }

    const { risk_category, overall_score } = assessment;

    switch (risk_category) {
      case 'High concern':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-semibold shadow-sm shadow-rose-950/50">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>High Concern ({overall_score})</span>
          </span>
        );
      case 'Caution':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-800/80 text-amber-300 text-xs font-semibold shadow-sm shadow-amber-950/50">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Caution ({overall_score})</span>
          </span>
        );
      case 'Lower concern':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-semibold shadow-sm shadow-emerald-950/50">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lower Concern ({overall_score})</span>
          </span>
        );
      case 'Insufficient evidence':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-sky-950/80 border border-sky-800/80 text-sky-300 text-xs font-semibold shadow-sm shadow-sky-950/50">
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>Insufficient Evidence</span>
          </span>
        );
    }
  };

  const getConfidenceBadge = (assessment?: AppItem['latest_assessment']) => {
    if (!assessment) return null;
    const { confidence_level, confidence_score } = assessment;
    let colorClass = 'text-slate-400';
    if (confidence_level === 'High') colorClass = 'text-emerald-400 font-medium';
    else if (confidence_level === 'Medium') colorClass = 'text-amber-400 font-medium';
    else if (confidence_level === 'Low') colorClass = 'text-orange-400 font-medium';
    else if (confidence_level === 'Insufficient') colorClass = 'text-sky-400 font-medium';

    return (
      <div className="flex flex-col text-right">
        <span className={`text-xs ${colorClass}`}>{confidence_level} Confidence</span>
        <span className="text-[10px] text-slate-500 font-mono">Sufficiency: {(confidence_score * 100).toFixed(0)}%</span>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-900/60">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, developer, or package ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center space-x-2 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="risk_desc">Highest Risk First</option>
            <option value="risk_asc">Lowest Risk First</option>
            <option value="rating_desc">Highest Rating</option>
            <option value="rating_asc">Lowest Rating</option>
            <option value="name_asc">Application Name (A-Z)</option>
            <option value="last_scanned">Recently Scanned</option>
          </select>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center space-x-1.5 overflow-x-auto">
        <span className="text-xs text-slate-400 mr-2 shrink-0">Filter:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Application & Developer</th>
              <th className="py-3 px-4">Store Metrics</th>
              <th className="py-3 px-4">Risk Classification</th>
              <th className="py-3 px-4 text-right">Evidence Sufficiency</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p>Loading application catalog...</p>
                </td>
              </tr>
            ) : apps.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <p className="text-sm font-medium text-slate-400 mb-1">No matching applications found</p>
                  <p className="text-xs text-slate-500">Try adjusting your search keywords or category filters.</p>
                </td>
              </tr>
            ) : (
              apps.map((app) => (
                <tr
                  key={app.package_id}
                  onClick={() => onSelectApp(app)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                >
                  {/* Application Info */}
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      {app.icon_url ? (
                        <img
                          src={app.icon_url}
                          alt={app.title}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-800 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-bold shrink-0">
                          {app.title.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors truncate max-w-xs sm:max-w-md">
                          {app.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{app.developer}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{app.package_id}</div>
                      </div>
                    </div>
                  </td>

                  {/* Store Metrics */}
                  <td className="py-3 px-4 text-slate-300">
                    <div className="flex items-center space-x-1 text-amber-400 font-medium">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{app.rating.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400">({app.rating_count.toLocaleString()})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Download className="w-3 h-3" />
                      <span>{app.installs_text || '10k+'}</span>
                    </div>
                  </td>

                  {/* Risk Assessment */}
                  <td className="py-3 px-4">{getRiskBadge(app.latest_assessment)}</td>

                  {/* Confidence / Sufficiency */}
                  <td className="py-3 px-4">{getConfidenceBadge(app.latest_assessment)}</td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectApp(app);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-medium transition-colors inline-flex items-center space-x-1 shadow-sm"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing <strong>{apps.length}</strong> of <strong>{totalItems}</strong> applications
        </div>
        <div className="flex items-center space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong>
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
