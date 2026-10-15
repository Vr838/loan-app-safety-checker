'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { OverviewMetrics } from '../components/OverviewMetrics';
import { AppTable } from '../components/AppTable';
import { AppDetailModal } from '../components/AppDetailModal';
import { AppComparisonModal } from '../components/AppComparisonModal';
import { ScanModal } from '../components/ScanModal';
import { ScanHistory } from '../components/ScanHistory';
import { fetchAppComparison, fetchApps, fetchHealth, fetchLatestScan, fetchScanHistory } from '../lib/api';
import { AppItem, HealthStatus, ScanRun } from '../lib/types';
import { ShieldCheck, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
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
    setComparisonIds((current) => current.includes(packageId)
      ? current.filter((id) => id !== packageId)
      : current.length < 4 ? [...current, packageId] : current);
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

  return (
    <div className="min-h-screen app-shell flex flex-col">
      {/* Top Navigation */}
      <Navbar
        health={health}
        isLive={isLive}
        onOpenScanModal={() => {
          setSelectedApp(null);
          setIsScanModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 py-10 space-y-8">
        {/* Page Title & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="eyebrow">Live Google Play research</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">Loan app signals, clearly presented.</h1>
            <p className="text-[15px] leading-6 text-[#6e6e73] mt-3">
              Review public store information and sampled user feedback. Scores describe the signals found in the current data; they do not certify an app as safe.
            </p>
          </div>
          <button
            onClick={() => loadData()}
            className="button-secondary self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh data</span>
          </button>
        </div>

        {/* Overview Metric Cards */}
        <OverviewMetrics
          apps={apps}
          latestScan={latestScan}
        />

        <ScanHistory scans={scanHistory} loading={isLoading} />

        {loadError && (
          <div role="alert" className="rounded-2xl border border-[#f2c6cb] bg-[#fff2f3] px-4 py-3 text-sm text-[#a20b1b]">
            {loadError}
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
          isLoading={isLoading}
        />

        <div className="method-note">
          <ShieldCheck className="w-5 h-5 text-[#0071e3] shrink-0" />
          <p><strong>How to read this.</strong> The engine checks live listing metadata and a sampled set of public reviews for defined complaint themes. A low score means fewer matching signals were observed; it is not a safety guarantee.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/[.08] bg-white/60 py-6 text-center text-xs text-[#6e6e73]">
        <div className="max-w-6xl mx-auto px-5 space-y-1">
          <p>
            Loan App Safety Checker is an open investigative research project. Not affiliated with Google Play or regulatory agencies.
          </p>
          <p className="text-[11px] text-[#86868b]">
            Assessments are heuristic research aids, not legal determinations or credit ratings.
          </p>
        </div>
      </footer>

      {/* App Detail Investigation Modal */}
      <AppDetailModal
        app={selectedApp}
        onClose={() => setSelectedApp(null)}
      />

      <AppComparisonModal apps={comparisonApps} onClose={() => setComparisonApps([])} />

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
