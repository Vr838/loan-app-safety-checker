'use client';

import React, { useState } from 'react';
import { X, Terminal, KeyRound, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { triggerScan } from '../lib/api';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: () => void;
}

export const ScanModal: React.FC<ScanModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [token, setToken] = useState('dev-secret-admin-token-replace-in-prod');
  const [maxApps, setMaxApps] = useState(5);
  const [maxReviews, setMaxReviews] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await triggerScan(token, { max_apps: maxApps, max_reviews: maxReviews });
      setSuccess('Scan successfully scheduled in background! Fresh data will populate as collection completes.');
      setTimeout(() => {
        onScanSuccess();
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Authorization failed or API offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Trigger Collection Scan</h3>
              <p className="text-[11px] text-slate-400">Authenticated background discovery run</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin Authorization Token</span>
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter ADMIN_API_TOKEN..."
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-slate-500">
              Matches <code className="text-indigo-300">ADMIN_API_TOKEN</code> configured on the server.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Max Apps / Query</label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxApps}
                onChange={(e) => setMaxApps(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">Bounded discovery cap</span>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Reviews Sample / App</label>
              <input
                type="number"
                min={5}
                max={100}
                value={maxReviews}
                onChange={(e) => setMaxReviews(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">Bounded review budget</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Responsible Collector Guarantee:</div>
            <p>
              Scans operate asynchronously with jitter delays, exponential backoff, and PII minimization. External calls are throttled to respect source rate limits.
            </p>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Authorizing...' : 'Launch Scan Job'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
