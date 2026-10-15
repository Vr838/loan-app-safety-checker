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
import { ShieldCheck, RefreshCw, Sparkles, Database, FileSpreadsheet } from 'lucide-react';

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
      setLoadError(error instanceof Error ? error.message : 'Unable to load the comparison.');
    }
  };

  const scrollToHistory = () => {
    const el = document.getElementById('scan-history-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen app-shell flex flex-col font-sans bg-[#f8fafc]">
      {/* Top Navigation */}
      <Navbar
        health={health}
        isLive={isLive}
        totalApps={allApps.length > 0 ? allApps.length : totalItems}
        onOpenScanModal={() => {
          setSelectedApp(null);
          setIsScanModalOpen(true);
        }}
        onScrollToHistory={scrollToHistory}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8">
        {/* Page Hero Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Play Digital Lending Safety Monitor · India</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[-0.04em] text-slate-900 leading-tight">
              Loan app safety signals &amp; RBI compliance, clearly verified.
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-600 max-w-2xl">
              Real-time heuristic risk scoring for Indian personal loan apps. Cross-referenced against the
              official <strong>Reserve Bank of India (RBI) NBFC Master Register</strong> and enriched with
              multi-language review sentiment analysis.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => loadData()}
              className="button-secondary text-xs shadow-2xs"
              title="Reload live dataset"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
              <span>Refresh Dataset</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <OverviewMetrics
          apps={allApps.length > 0 ? allApps : apps}
          latestScan={latestScan}
          onFilterCategory={(cat) => {
            setSelectedCategory(cat);
            setPage(1);
          }}
        />

        {/* Scan History & What Changed Section */}
        <ScanHistory scans={scanHistory} loading={isLoading} />

        {loadError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 shadow-sm"
          >
            <strong>Error:</strong> {loadError}
          </div>
        )}

        {/* Search, Filter & App Table */}
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

        {/* Methodology Disclosure Callout */}
        <div className="method-note bg-blue-50/60 border border-blue-200/70 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-3.5 text-xs text-slate-700 leading-relaxed shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
          <p>
            <strong>Investigation Methodology:</strong> The Safety Checker engine audits public Google Play Store metadata,
            developer disclosures, and sampled reviews for defined predatory complaint themes (harassment, 7-day traps, contact extortion).
            A lower risk score indicates fewer matching predatory signals were observed; it does not constitute a legal endorsement or credit guarantee.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 py-8 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-6xl mx-auto px-5 space-y-2">
          <p className="font-semibold text-slate-700">
            Loan App Safety Checker — Open Financial Cybercrime &amp; Digital Lending Intelligence
          </p>
          <p className="text-[11px] text-slate-400 max-w-xl mx-auto">
            Cross-referenced with the Reserve Bank of India Register of Non-Banking Financial Companies (DNBS) and MeitY Section 69A IT Act Orders.
            Prepared as an academic research and interview submission blueprint.
          </p>
        </div>
      </footer>

      {/* App Detail Investigation Modal */}
      <AppDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} />

      {/* Side-by-Side App Comparison Modal */}
      <AppComparisonModal
        apps={comparisonApps}
        onClose={() => setComparisonApps([])}
        onRemoveApp={(id) => setComparisonApps((prev) => prev.filter((a) => a.package_id !== id))}
      />

      {/* Admin Scan Trigger Modal */}
      <ScanModal
        key={isScanModalOpen ? 'scan-open' : 'scan-closed'}
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onScanSuccess={() => loadData()}
      />
    </div>
  );
}
