'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { OverviewMetrics } from '../components/OverviewMetrics';
import { AppTable } from '../components/AppTable';
import { AppDetailModal } from '../components/AppDetailModal';
import { AppComparisonModal } from '../components/AppComparisonModal';
import { ScanModal } from '../components/ScanModal';
import { ScanHistory } from '../components/ScanHistory';
import {
  fetchAppComparison,
  fetchApps,
  fetchAllApps,
  fetchHealth,
  fetchLatestScan,
  fetchScanHistory,
} from '../lib/api';
import { AppItem, HealthStatus, ScanRun } from '../lib/types';
import { ShieldCheck, RefreshCw, Sparkles, ChevronDown, ChevronUp, History } from 'lucide-react';

export default function DashboardPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [allApps, setAllApps] = useState<AppItem[]>([]);
  const [latestScan, setLatestScan] = useState<ScanRun | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRun[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('risk_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals & States
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonApps, setComparisonApps] = useState<AppItem[]>([]);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fullDataset = fetchAllApps();
      setAllApps(fullDataset);

      const [healthRes, scanRes, scansRes, appsRes] = await Promise.all([
        fetchHealth(),
        fetchLatestScan(),
        fetchScanHistory(),
        fetchApps({
          q: searchQuery,
          risk_category: selectedCategory,
          sort_by: sortBy,
          page,
          page_size: pageSize,
        }),
      ]);
      setHealth(healthRes);
      setLatestScan(scanRes);
      setScanHistory(scansRes);
      setApps(appsRes.items);
      setTotalPages(appsRes.total_pages);
      setTotalItems(appsRes.total);
      setIsLive(true);
      setLoadError(null);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setIsLive(false);
      setLoadError(error instanceof Error ? error.message : 'Unable to load live analysis data.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, sortBy, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleComparison = (packageId: string) => {
    setComparisonIds((current) =>
      current.includes(packageId)
        ? current.filter((id) => id !== packageId)
        : current.length < 4
        ? [...current, packageId]
        : current,
    );
  };

  const openComparison = async () => {
    try {
      const appsToCompare = await fetchAppComparison(comparisonIds);
      setSelectedApp(null);
      setIsScanModalOpen(false);
      setComparisonApps(appsToCompare);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load comparison.');
    }
  };

  return (
    <div className="min-h-screen app-shell flex flex-col font-sans bg-[#f8fafc] text-slate-900">
      {/* Clean Navbar */}
      <Navbar
        health={health}
        isLive={isLive}
        totalApps={allApps.length > 0 ? allApps.length : totalItems}
        onOpenScanModal={() => {
          setSelectedApp(null);
          setIsScanModalOpen(true);
        }}
        onScrollToHistory={() => setShowHistory((prev) => !prev)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Simplified Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 mb-2">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>RBI Regulated NBFC Audit &amp; Play Store Monitor</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Loan App Safety Checker
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Deterministic risk assessment for Indian digital lending apps. Cross-referenced with the
              official <strong>Reserve Bank of India (DNBS) Register</strong> and review sentiment.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => loadData()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs flex items-center gap-1.5 transition-all"
              title="Reload live dataset"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsScanModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs flex items-center gap-1.5 transition-all"
            >
              <span>Run Live Scan</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <OverviewMetrics
          apps={allApps.length > 0 ? allApps : apps}
          latestScan={latestScan}
          onFilterCategory={(cat) => {
            setSelectedCategory(cat);
            setPage(1);
          }}
        />

        {loadError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 shadow-xs"
          >
            <strong>Notice:</strong> {loadError}
          </div>
        )}

        {/* Primary App Explorer Table */}
        <AppTable
          apps={apps}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setPage(1);
          }}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setPage(1);
          }}
          sortBy={sortBy}
          onSortChange={(sort) => {
            setSortBy(sort);
            setPage(1);
          }}
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          onPageChange={(p) => setPage(p)}
          onSelectApp={(app) => {
            setIsScanModalOpen(false);
            setComparisonApps([]);
            setSelectedApp(app);
          }}
          comparisonIds={comparisonIds}
          onToggleComparison={toggleComparison}
          onCompare={openComparison}
          onClearComparison={() => setComparisonIds([])}
          isLoading={isLoading}
        />

        {/* Toggleable Scan History */}
        <div id="scan-history-section" className="pt-2">
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Scan Audit History &amp; What Changed ({scanHistory.length} recorded runs)</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showHistory && (
            <div className="mt-3">
              <ScanHistory scans={scanHistory} loading={isLoading} />
            </div>
          )}
        </div>

        {/* Methodology Disclosure Callout */}
        <div className="bg-blue-50/50 border border-blue-200/60 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-600 leading-relaxed shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p>
            <strong>Investigation Methodology:</strong> Analyzes public Google Play store metadata and sampled
            reviews for predatory indicators (7-day traps, contact harvesting, harassment). Scores are heuristic research aids; they do not certify legal compliance or creditworthiness.
          </p>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500 mt-8">
        <div className="max-w-6xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            Loan App Safety Checker · Digital Lending Cybersecurity Intelligence
          </p>
          <p className="text-[11px] text-slate-400">
            Cross-referenced against Reserve Bank of India Register of Non-Banking Financial Companies (DNBS).
          </p>
        </div>
      </footer>

      {/* App Detail Modal */}
      <AppDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} />

      {/* App Comparison Modal */}
      <AppComparisonModal
        apps={comparisonApps}
        onClose={() => setComparisonApps([])}
        onRemoveApp={(id) => setComparisonApps((prev) => prev.filter((a) => a.package_id !== id))}
      />

      {/* Scan Modal */}
      <ScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onScanSuccess={() => loadData()}
      />
    </div>
  );
}
