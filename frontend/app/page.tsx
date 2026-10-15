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
import { ShieldCheck, RefreshCw, Sparkles, ChevronDown, ChevronUp, History, Scale, X, Layers } from 'lucide-react';

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

      const [healthResult, scanResult, scansResult, appsResult] = await Promise.allSettled([
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

      if (healthResult.status === 'fulfilled') {
        setHealth(healthResult.value);
        setIsLive(true);
      }
      if (scanResult.status === 'fulfilled') {
        setLatestScan(scanResult.value);
      }
      if (scansResult.status === 'fulfilled') {
        setScanHistory(scansResult.value);
      }
      if (appsResult.status === 'fulfilled') {
        setApps(appsResult.value.items);
        setTotalPages(appsResult.value.total_pages);
        setTotalItems(appsResult.value.total);
      } else {
        // Fallback to local full verified dataset
        const filtered = fullDataset.filter((a) => {
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matches = a.title.toLowerCase().includes(q) || a.developer.toLowerCase().includes(q) || a.package_id.toLowerCase().includes(q);
            if (!matches) return false;
          }
          if (selectedCategory && selectedCategory !== 'All') {
            const target = selectedCategory.toLowerCase();
            const cat = (a.latest_assessment?.risk_category ?? '').toLowerCase();
            if (target.includes('high')) return cat.includes('high');
            if (target.includes('caution') || target.includes('moderate')) return cat.includes('caution') || cat.includes('moderate');
            if (target.includes('lower') || target.includes('safe')) return cat.includes('lower') || cat.includes('safe');
            if (target.includes('insufficient')) return cat.includes('insufficient') || cat.includes('sparse');
            return cat.includes(target);
          }
          return true;
        });
        setApps(filtered.slice((page - 1) * pageSize, page * pageSize));
        setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)));
        setTotalItems(filtered.length);
      }
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
        {/* Sleek Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-6 sm:p-8 shadow-xs">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-gradient-to-br from-blue-100/50 to-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                </span>
                <span>RBI-Regulated NBFC Verification &amp; Play Store Audit</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
                Loan App Safety Checker
              </h1>
              
              <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                Continuous deterministic risk intelligence for digital lending applications. Cross-referenced against the official <strong>Reserve Bank of India (DNBS) Register</strong> and sampled customer complaints.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
              <button
                onClick={() => loadData()}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs flex items-center gap-1.5 transition-all active:scale-95"
                title="Reload live dataset"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                <span>Refresh Data</span>
              </button>
              
              <button
                onClick={() => setIsScanModalOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Live Scan</span>
              </button>
            </div>
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
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 shadow-xs flex items-center justify-between"
          >
            <span><strong>Notice:</strong> {loadError}</span>
            <button onClick={() => loadData()} className="font-semibold underline ml-2 text-rose-900">Retry</button>
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
            className="w-full py-3.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Audit Run History &amp; Monitored Apps ({scanHistory.length} recorded runs)</span>
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
        <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-slate-600 leading-relaxed shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800">Investigation Methodology &amp; Regulatory Context:</strong>
            <p className="mt-1">
              Scans analyze public Google Play store metadata, permission disclosures, and sampled customer reviews for high-risk flags (7-day traps, contact scraping, abusive recovery agents). Assessments are heuristic research aids; they do not certify creditworthiness or replace official Reserve Bank of India DNBS notices.
            </p>
          </div>
        </div>
      </main>

      {/* Floating Comparison Dock (Appears when 1-4 apps are checked) */}
      {comparisonIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 text-xs font-medium pr-2 border-r border-slate-700">
            <Scale className="w-4 h-4 text-blue-400" />
            <span><strong>{comparisonIds.length}</strong> / 4 apps selected</span>
          </div>
          <button
            onClick={openComparison}
            disabled={comparisonIds.length < 2}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              comparisonIds.length >= 2
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Compare Now</span>
          </button>
          <button
            onClick={() => setComparisonIds([])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Clear comparison selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
