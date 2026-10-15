/**
 * API client for Loan App Safety Checker
 *
 * Priority:
 *  1. NEXT_PUBLIC_API_BASE_URL env var (set this in Vercel for a live backend)
 *  2. http://localhost:8000 when running locally
 *  3. Static FALLBACK_APPS dataset (always used on Vercel prod without a live backend)
 */

import { AppItem, AppListResponse, HealthStatus, RbiCheck, ScanRun } from './types';
import { FALLBACK_APPS, FALLBACK_SCAN } from './demoData';

/** Resolve the backend base URL. Returns null when no live backend is configured. */
function resolveApiBase(): string | null {
  // Explicit override via env var (set in Vercel dashboard or .env.local)
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '');
  if (explicit) return explicit;

  // Localhost development
  if (typeof window === 'undefined') return null; // SSR – no browser context
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  // Vercel / production – no live backend configured
  return null;
}

export function getApiBaseUrl(): string {
  return resolveApiBase() ?? '(static fallback dataset)';
}

/** Generic JSON fetch with timeout */
async function getJson<T>(path: string): Promise<T> {
  const base = resolveApiBase();
  if (!base) {
    throw new Error('NO_LIVE_BACKEND');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    throw new Error('BACKEND_UNREACHABLE');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── Public API Functions ────────────────────────────────────────────────────

export async function fetchHealth(): Promise<HealthStatus> {
  try {
    return await getJson<HealthStatus>('/health');
  } catch {
    return {
      status: 'static_dataset',
      version: '1.2.0',
      environment: 'vercel_static',
      database_connected: false,
      collector_ready: true,
      components: {
        dataset: `${FALLBACK_APPS.length} verified Play Store apps`,
        risk_engine: 'static (v1.2.0)',
        backend: 'not connected – set NEXT_PUBLIC_API_BASE_URL to enable',
      },
    };
  }
}

export async function fetchApps(params?: {
  q?: string;
  risk_category?: string;
  min_rating?: number;
  sort_by?: string;
  page?: number;
  page_size?: number;
}): Promise<AppListResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.risk_category && params.risk_category !== 'All')
      query.set('risk_category', params.risk_category);
    if (params?.min_rating) query.set('min_rating', params.min_rating.toString());
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.page_size) query.set('page_size', params.page_size.toString());

    return await getJson<AppListResponse>(`/api/v1/apps?${query.toString()}`);
  } catch {
    // ── Client-side filtering & sorting over static FALLBACK_APPS ──
    let filtered = [...FALLBACK_APPS];

    if (params?.q) {
      const q = params.q.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.package_id.toLowerCase().includes(q) ||
          a.developer.toLowerCase().includes(q),
      );
    }

    if (params?.risk_category && params.risk_category !== 'All') {
      const target = params.risk_category.toLowerCase();
      filtered = filtered.filter((a) => {
        const cat = (a.latest_assessment?.risk_category ?? '').toLowerCase();
        if (target.includes('high')) return cat.includes('high');
        if (target.includes('caution')) return cat.includes('caution');
        if (target.includes('moderate')) return cat.includes('moderate');
        if (target.includes('lower') || target.includes('safe'))
          return cat.includes('lower') || cat.includes('safe');
        if (target.includes('insufficient')) return cat.includes('insufficient');
        return cat.includes(target);
      });
    }

    if (params?.min_rating) {
      filtered = filtered.filter((a) => a.rating >= params.min_rating!);
    }

    const sorters: Record<string, (a: AppItem, b: AppItem) => number> = {
      risk_desc: (a, b) =>
        (b.latest_assessment?.overall_score ?? 0) - (a.latest_assessment?.overall_score ?? 0),
      risk_asc: (a, b) =>
        (a.latest_assessment?.overall_score ?? 0) - (b.latest_assessment?.overall_score ?? 0),
      rating_desc: (a, b) => b.rating - a.rating,
      rating_asc: (a, b) => a.rating - b.rating,
      name_asc: (a, b) => a.title.localeCompare(b.title),
      last_scanned: (a, b) =>
        new Date(b.last_scanned_at).getTime() - new Date(a.last_scanned_at).getTime(),
    };
    if (params?.sort_by && sorters[params.sort_by]) {
      filtered.sort(sorters[params.sort_by]);
    }

    const pageSize = params?.page_size ?? 25;
    const page = params?.page ?? 1;
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    };
  }
}

export async function fetchAppDetail(packageId: string): Promise<AppItem> {
  try {
    return await getJson<AppItem>(`/api/v1/apps/${encodeURIComponent(packageId)}`);
  } catch {
    const found = FALLBACK_APPS.find((a) => a.package_id === packageId);
    if (found) return found;
    throw new Error(`App not found: ${packageId}`);
  }
}

export async function fetchLatestScan(): Promise<ScanRun | null> {
  try {
    return await getJson<ScanRun | null>('/api/v1/scans/latest');
  } catch {
    return FALLBACK_SCAN;
  }
}

export async function fetchScanHistory(limit = 8): Promise<ScanRun[]> {
  try {
    return await getJson<ScanRun[]>(`/api/v1/scans?limit=${limit}`);
  } catch {
    return [FALLBACK_SCAN];
  }
}

export async function fetchAppComparison(packageIds: string[]): Promise<AppItem[]> {
  try {
    const query = packageIds
      .map((id) => `package_id=${encodeURIComponent(id)}`)
      .join('&');
    return await getJson<AppItem[]>(`/api/v1/apps/compare?${query}`);
  } catch {
    return FALLBACK_APPS.filter((a) => packageIds.includes(a.package_id));
  }
}

export async function fetchRbiCheck(packageId: string): Promise<RbiCheck> {
  try {
    return await getJson<RbiCheck>(`/api/v1/apps/${encodeURIComponent(packageId)}/rbi-check`);
  } catch {
    const app = FALLBACK_APPS.find((a) => a.package_id === packageId);
    return {
      status: 'manual_verification_required',
      developer_name: app?.developer ?? 'Unknown Developer',
      message:
        'Cross-check this developer entity against the RBI Register of Non-Banking Financial Companies.',
      sources: [
        {
          title: 'RBI Official Register of NBFCs',
          url: 'https://www.rbi.org.in/scripts/BS_NBFCList.aspx',
        },
        {
          title: 'Sachet Portal for Unregistered Entities',
          url: 'https://sachet.rbi.org.in/',
        },
      ],
    };
  }
}

/** Returns a URL to download a CSV or PDF report. Falls back to inline CSV data URI. */
export function reportDownloadUrl(packageId: string, format: 'csv' | 'pdf'): string {
  const base = resolveApiBase();
  if (base) {
    return `${base}/api/v1/apps/${encodeURIComponent(packageId)}/report.${format}`;
  }

  // Client-side CSV fallback (PDF not possible without backend)
  const app = FALLBACK_APPS.find((a) => a.package_id === packageId);
  const rows = [
    ['Loan App Safety Checker — Research Report'],
    ['Package ID', packageId],
    ['App Title', app?.title ?? 'Unknown'],
    ['Developer', app?.developer ?? 'Unknown'],
    ['Risk Score', app?.latest_assessment?.overall_score?.toString() ?? 'N/A'],
    ['Risk Category', app?.latest_assessment?.risk_category ?? 'N/A'],
    ['Confidence Level', app?.latest_assessment?.confidence_level ?? 'N/A'],
    ['Google Play Rating', app?.rating?.toString() ?? 'N/A'],
    ['Rating Count', app?.rating_count?.toString() ?? 'N/A'],
    ['Installs', app?.installs_text ?? 'N/A'],
    ['Store Status', app?.store_status ?? 'N/A'],
    ['Play Store URL', app?.store_url ?? `https://play.google.com/store/apps/details?id=${packageId}`],
  ];
  const csv = rows.map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  return 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
}

export async function triggerScan(
  adminToken: string,
  options?: { max_apps?: number; max_reviews?: number },
) {
  const base = resolveApiBase() ?? 'http://localhost:8000';
  const res = await fetch(`${base}/api/v1/scans/admin/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken.trim()}`,
    },
    body: JSON.stringify({
      max_apps_per_query: options?.max_apps ?? 5,
      max_reviews_per_app: options?.max_reviews ?? 30,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail ?? `Scan trigger failed with HTTP ${res.status}`);
  }

  return res.json();
}
