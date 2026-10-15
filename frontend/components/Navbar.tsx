'use client';

import React from 'react';
import { ShieldAlert, Database, History, PlayCircle } from 'lucide-react';
import { HealthStatus } from '../lib/types';
import { isSupabaseConnected } from '../lib/supabase';

interface NavbarProps {
  health: HealthStatus | null;
  isLive: boolean;
  totalApps: number;
  onOpenScanModal: () => void;
  onScrollToHistory?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isLive,
  totalApps,
  onOpenScanModal,
  onScrollToHistory,
}) => {
  const hasSupabase = isSupabaseConnected();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="navbar-brand">
          <div className="navbar-logo">
            <ShieldAlert />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="navbar-title">Loan App Safety Checker</span>
              <span className="navbar-badge">RBI &amp; Play Store Audit</span>
            </div>
            <p className="navbar-subtitle">
              Real-time predatory app intelligence · {totalApps > 0 ? `${totalApps} Live Apps Verified` : '84 Live Apps Verified'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          <div className="navbar-status" style={{ display: 'flex' }}>
            <span className={`navbar-status-dot${isLive ? '' : ' offline'}`} />
            <Database style={{ width: 12, height: 12, color: '#64748b' }} />
            <span>{hasSupabase ? 'Supabase Cloud DB' : 'Play Store Dataset'}</span>
          </div>

          {onScrollToHistory && (
            <button
              onClick={onScrollToHistory}
              className="button-secondary"
              title="Jump to Scan History"
              style={{ fontSize: 12 }}
            >
              <History style={{ width: 14, height: 14 }} />
              <span>What Changed</span>
            </button>
          )}

          <button
            onClick={onOpenScanModal}
            className="button-primary"
            title="Trigger an authenticated live Play Store sweep"
            style={{ fontSize: 12 }}
          >
            <PlayCircle style={{ width: 14, height: 14 }} />
            <span>Run Store Scan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
