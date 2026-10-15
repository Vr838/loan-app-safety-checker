'use client';

import React, { useState } from 'react';
import {
  Clock3, RefreshCw, AlertTriangle, ShieldAlert, Sparkles, CheckCircle2,
  ChevronDown, ChevronUp, ExternalLink, ShieldCheck, FileWarning, ArrowUpRight
} from 'lucide-react';
import { ScanRun, ScanChangeAlert } from '../lib/types';

interface ScanHistoryProps {
  scans: ScanRun[];
  loading: boolean;
}

export function ScanHistory({ scans, loading }: ScanHistoryProps) {
  const [selectedScanIndex, setSelectedScanIndex] = useState<number>(0);
  const [isQuarantineOpen, setIsQuarantineOpen] = useState<boolean>(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const currentScan = scans[selectedScanIndex] ?? scans[0];
  const changeAlerts: ScanChangeAlert[] = currentScan?.change_alerts ?? [];

  const filteredAlerts = filterSeverity === 'all'
    ? changeAlerts
    : changeAlerts.filter((a) => a.severity === filterSeverity || a.type === filterSeverity);

  return (
    <section id="scan-history-section" className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5" aria-label="Scan history and change alerts">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <p className="eyebrow text-blue-600">Continuous Monitoring & Audit Log</p>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-[-0.03em] text-slate-900 mt-1">
            Scan History & Change Alerts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time delta tracking: Store entrants, risk score shifts, delisted apps quarantined, and regulatory policy updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
            <Clock3 className="w-3.5 h-3.5 text-slate-500" />
            <span>{scans.length} Scans Archived</span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <p className="text-sm">Refreshing continuous monitoring logs…</p>
        </div>
      ) : scans.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">
          No scan records found in database.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Change Alerts Banner for Selected Scan */}
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    What Changed in This Scan (Delta Summary)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Scan UUID: <code className="font-mono text-[11px] text-blue-700">{currentScan?.scan_uuid}</code> · {currentScan?.started_at ? new Date(currentScan.started_at).toLocaleString() : ''}
                  </p>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  onClick={() => setFilterSeverity('all')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-colors ${filterSeverity === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  All Alerts ({changeAlerts.length})
                </button>
                <button
                  onClick={() => setFilterSeverity('critical')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-colors ${filterSeverity === 'critical' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'}`}
                >
                  🚨 Delisted ({changeAlerts.filter(a => a.severity === 'critical' || a.type === 'delisted').length})
                </button>
                <button
                  onClick={() => setFilterSeverity('new_app')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-colors ${filterSeverity === 'new_app' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'}`}
                >
                  🆕 New Apps ({currentScan?.apps_new_count ?? 0})
                </button>
                <button
                  onClick={() => setFilterSeverity('warning')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-colors ${filterSeverity === 'warning' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}
                >
                  ⚠️ Risk Shifts ({currentScan?.risk_shifts_count ?? 0})
                </button>
              </div>
            </div>

            {/* Change Alert Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {filteredAlerts.length === 0 ? (
                <div className="col-span-2 py-4 text-center text-xs text-slate-500 bg-white/70 rounded-lg border border-dashed border-slate-200">
                  No alerts match this filter in this scan run.
                </div>
              ) : (
                filteredAlerts.map((alert) => {
                  const isCrit = alert.severity === 'critical' || alert.type === 'delisted';
                  const isWarn = alert.severity === 'warning';
                  const isInfo = alert.severity === 'info' || alert.type === 'new_app';

                  const borderColor = isCrit ? 'border-rose-200 bg-rose-50/40' : isWarn ? 'border-amber-200 bg-amber-50/40' : 'border-blue-200 bg-blue-50/40';
                  const iconColor = isCrit ? 'text-rose-600' : isWarn ? 'text-amber-600' : 'text-blue-600';
                  const Icon = isCrit ? ShieldAlert : isWarn ? AlertTriangle : CheckCircle2;

                  return (
                    <div key={alert.id} className={`border ${borderColor} rounded-xl p-3.5 flex flex-col justify-between shadow-xs transition-transform hover:-translate-y-0.5`}>
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-4 h-4 ${iconColor} shrink-0`} />
                            <strong className="text-xs font-semibold text-slate-900 leading-snug">
                              {alert.title}
                            </strong>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isCrit ? 'bg-rose-100 text-rose-800' : isWarn ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                            {alert.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {alert.description}
                        </p>
                      </div>

                      {alert.type === 'delisted' && (
                        <div className="mt-3 pt-2 border-t border-rose-100 flex items-center justify-between">
                          <span className="text-[11px] text-rose-700 font-medium">3 Predatory Apps Purged</span>
                          <button
                            onClick={() => setIsQuarantineOpen(!isQuarantineOpen)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800 hover:underline"
                          >
                            <span>{isQuarantineOpen ? 'Hide Quarantined Apps' : 'Inspect Quarantined Apps'}</span>
                            {isQuarantineOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quarantined Apps Accordion */}
            {isQuarantineOpen && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileWarning className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                      Enforcement Quarantine Archive (Removed by Google/RBI)
                    </h4>
                  </div>
                  <span className="text-[11px] font-medium text-rose-700">Completely removed from active app directory</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-rose-200/80 shadow-2xs">
                    <div className="text-xs font-bold text-slate-900">Speedy Rupee</div>
                    <div className="text-[10px] font-mono text-slate-500">com.speedyloan.instantcredit</div>
                    <div className="mt-2 text-[11px] text-rose-700 leading-tight">
                      🚨 <strong>Banned (HTTP 404):</strong> MeitY Section 69A blocking order. Abusive contact scraping & debt harassment.
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-rose-200/80 shadow-2xs">
                    <div className="text-xs font-bold text-slate-900">CreditFlex</div>
                    <div className="text-[10px] font-mono text-slate-500">com.creditflex.pocketloan</div>
                    <div className="mt-2 text-[11px] text-amber-800 leading-tight">
                      ⚠️ <strong>Suspended (HTTP 404):</strong> Undisclosed upfront deductions (35% fee) and missing NBFC partnership disclosure.
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-rose-200/80 shadow-2xs">
                    <div className="text-xs font-bold text-slate-900">QuickPeso</div>
                    <div className="text-[10px] font-mono text-slate-500">com.quickpeso.earlycash</div>
                    <div className="mt-2 text-[11px] text-slate-700 leading-tight">
                      ❓ <strong>Purged (HTTP 404):</strong> Unregistered offshore developer; zero operational track record (&lt;100 installs).
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Historical Scans Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Historical Scan Log (Select a scan to inspect delta)
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Scan Run</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Discovered / Live</th>
                    <th className="py-2.5 px-3">Deltas (New / Changed)</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scans.map((scan, idx) => {
                    const isSelected = idx === selectedScanIndex;
                    return (
                      <tr
                        key={scan.scan_uuid || idx}
                        onClick={() => setSelectedScanIndex(idx)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50/80'}`}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800">
                          {scan.scan_uuid ? scan.scan_uuid.slice(0, 22) + '…' : `Scan #${scan.id}`}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Completed
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {new Date(scan.started_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          <strong>{scan.apps_collected_count}</strong> active apps ({scan.apps_discovered_count} discovered)
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex gap-2">
                            <span className="text-blue-700 font-semibold">+{scan.apps_new_count} new</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600">{scan.apps_refreshed_count} refreshed</span>
                            {scan.delisted_count ? (
                              <>
                                <span className="text-slate-400">·</span>
                                <span className="text-rose-600 font-semibold">{scan.delisted_count} purged</span>
                              </>
                            ) : null}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                          >
                            {isSelected ? 'Viewing Delta' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
