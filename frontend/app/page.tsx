'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { OverviewMetrics } from '../components/OverviewMetrics';
import { AppTable } from '../components/AppTable';
import { AppDetailModal } from '../components/AppDetailModal';
import { ScanModal } from '../components/ScanModal';
import { fetchApps, fetchHealth, fetchLatestScan } from '../lib/api';
import { AppItem, HealthStatus, ScanRun } from '../lib/types';
import { Shield, BookOpen, ExternalLink, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [latestScan, setLatestScan] = useState<ScanRun | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isDemo, setIsDemo] = useState<boolean>(false);

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
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const healthRes = await fetchHealth();
      setHealth(healthRes.data);
      setIsLive(healthRes.isLive);

      const scanRes = await fetchLatestScan();
      setLatestScan(scanRes.scan);

      const appsRes = await fetchApps({
        q: searchQuery,
        risk_category: selectedCategory,
        sort_by: sortBy,
        page,
        page_size: pageSize,
      });

      setApps(appsRes.response.items);
      setTotalPages(appsRes.response.total_pages);
      setTotalItems(appsRes.response.total);
      setIsDemo(appsRes.isDemo);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, sortBy, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        health={health}
        isLive={isLive}
        onOpenScanModal={() => setIsScanModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Title & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2.5">
              <span>Loan Application Safety & Risk Intelligence</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Evidence-based continuous monitoring of public Play Store digital lending applications, predatory terms, and regulatory disclosures.
            </p>
          </div>
          <button
            onClick={() => loadData()}
            className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {/* Overview Metric Cards */}
        <OverviewMetrics
          apps={apps}
          latestScan={latestScan}
          isDemo={isDemo}
        />

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
          onSelectApp={(app) => setSelectedApp(app)}
          isLoading={isLoading}
        />

        {/* Research Methodology Accordion / Footer Card */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
          <div>
            <h4 className="font-semibold text-slate-200 mb-1 flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Transparent Risk Engine</span>
            </h4>
            <p className="text-[11px] leading-relaxed">
              Calculates deterministic scores (0-100) using auditable rules for debt collection harassment, unauthorized contact list harvesting, predatory 7-day traps, and regulatory notices.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-200 mb-1 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Evidence Sufficiency Metric</span>
            </h4>
            <p className="text-[11px] leading-relaxed">
              Separates risk score from evidence sufficiency. If an app lacks sufficient reviews or external audit trails, it is flagged as <em>Insufficient evidence</em> rather than assuming safety.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-200 mb-1 flex items-center space-x-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Verifiable Provenance</span>
            </h4>
            <p className="text-[11px] leading-relaxed">
              Every material finding links directly to public regulator advisories, registered NBFC gazettes, or timestamped user reviews with personal identities stripped.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>
            Loan App Safety Checker is an open investigative research project. Not affiliated with Google Play or regulatory agencies.
          </p>
          <p className="text-[11px] text-slate-600">
            Assessments are heuristic research aids, not legal determinations or credit ratings.
          </p>
        </div>
      </footer>

      {/* App Detail Investigation Modal */}
      <AppDetailModal
        app={selectedApp}
        onClose={() => setSelectedApp(null)}
      />

      {/* Admin Scan Trigger Modal */}
      <ScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onScanSuccess={() => loadData()}
      />
    </div>
  );
}
