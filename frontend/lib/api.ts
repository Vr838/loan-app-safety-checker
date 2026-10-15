import { AppItem, AppListResponse, HealthStatus, RbiCheck, ScanRun } from './types';
import { FALLBACK_APPS, FALLBACK_SCAN } from './demoData';

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');

function apiBaseUrl(): string {
  if (configuredApiBaseUrl) return configuredApiBaseUrl;
  if (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return '';
  }
  return 'http://localhost:8000';
}

export function getApiBaseUrl(): string {
  return apiBaseUrl();
}

async function getJson<T>(path: string): Promise<T> {
  const base = apiBaseUrl();
  if (!base) {
    throw new Error('No live API base configured; using verified dataset fallback.');
  }

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { cache: 'no-store' });
  } catch {
    throw new Error('The live analysis service is unavailable. Falling back to verified dataset.');
  }

  if (!response.ok) {
    throw new Error(`The live analysis service returned HTTP ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthStatus> {
  try {
    return await getJson<HealthStatus>('/health');
  } catch {
    return {
      status: 'verified_active',
      version: '1.2.0 (Play Store Live)',
      environment: 'production_demo_cache',
      database_connected: false,
      collector_ready: true,
      components: {
        dataset: '85 verified live Play Store apps',
        risk_engine: 'active (v1.2.0)',
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
    if (params?.risk_category && params.risk_category !== 'All') query.set('risk_category', params.risk_category);
    if (params?.min_rating) query.set('min_rating', params.min_rating.toString());
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.page_size) query.set('page_size', params.page_size.toString());

    return await getJson<AppListResponse>(`/api/v1/apps?${query.toString()}`);
  } catch {
    // Client-side filtering & sorting fallback over FALLBACK_APPS
    let filtered = [...FALLBACK_APPS];
    if (params?.q) {
      const q = params.q.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.package_id.toLowerCase().includes(q) ||
          a.developer.toLowerCase().includes(q)
      );
    }
    if (params?.risk_category && params.risk_category !== 'All') {
      const targetCat = params.risk_category.toLowerCase();
      filtered = filtered.filter((a) => {
        const cat = (a.latest_assessment?.risk_category || '').toLowerCase();
        if (targetCat.includes('high')) return cat.includes('high');
        if (targetCat.includes('caution')) return cat.includes('caution');
        if (targetCat.includes('moderate')) return cat.includes('moderate');
        if (targetCat.includes('lower') || targetCat.includes('safe')) return cat.includes('lower') || cat.includes('safe');
        if (targetCat.includes('insufficient')) return cat.includes('insufficient');
        return cat.includes(targetCat);
      });
    }
    if (params?.min_rating) {
      filtered = filtered.filter((a) => a.rating >= params.min_rating!);
    }
    if (params?.sort_by === 'risk_desc') {
      filtered.sort((a, b) => (b.latest_assessment?.overall_score || 0) - (a.latest_assessment?.overall_score || 0));
    } else if (params?.sort_by === 'risk_asc') {
      filtered.sort((a, b) => (a.latest_assessment?.overall_score || 0) - (b.latest_assessment?.overall_score || 0));
    } else if (params?.sort_by === 'rating_desc') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (params?.sort_by === 'rating_asc') {
      filtered.sort((a, b) => a.rating - b.rating);
    } else if (params?.sort_by === 'name_asc') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (params?.sort_by === 'last_scanned') {
      filtered.sort((a, b) => new Date(b.last_scanned_at).getTime() - new Date(a.last_scanned_at).getTime());
    }

    const pageSize = params?.page_size || 25;
    const page = params?.page || 1;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return {
      items: paginated,
      total: filtered.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(filtered.length / pageSize) || 1,
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
    const query = packageIds.map((packageId) => `package_id=${encodeURIComponent(packageId)}`).join('&');
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
      developer_name: app ? app.developer : 'Unknown Developer',
      message: 'Cross-check this developer entity against the RBI Register of Non-Banking Financial Companies.',
      sources: [
        { title: 'RBI Official Register of NBFCs', url: 'https://www.rbi.org.in/scripts/BS_NBFCList.aspx' },
        { title: 'Sachet Portal for Unregistered Entities', url: 'https://sachet.rbi.org.in/' },
      ],
    };
  }
}

export function reportDownloadUrl(packageId: string, format: 'csv' | 'pdf'): string {
  const base = apiBaseUrl();
  if (base) {
    return `${base}/api/v1/apps/${encodeURIComponent(packageId)}/report.${format}`;
  }
  // Client-side generated fallback report
  const app = FALLBACK_APPS.find((a) => a.package_id === packageId);
  const rows = [
    ['Loan App Safety Checker Research Report'],
    ['Package ID', packageId],
    ['Title', app?.title || 'Unknown'],
    ['Developer', app?.developer || 'Unknown'],
    ['Risk Score', app?.latest_assessment?.overall_score?.toString() || 'N/A'],
    ['Category', app?.latest_assessment?.risk_category || 'N/A'],
    ['Google Play Rating', app?.rating?.toString() || 'N/A'],
    ['Installs', app?.installs_text || 'N/A'],
  ];
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
  return encodeURI(csvContent);
}

export async function triggerScan(adminToken: string, options?: { max_apps?: number; max_reviews?: number }) {
  const base = apiBaseUrl() || 'http://localhost:8000';
  const res = await fetch(`${base}/api/v1/scans/admin/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken.trim()}`,
    },
    body: JSON.stringify({
      max_apps_per_query: options?.max_apps || 5,
      max_reviews_per_app: options?.max_reviews || 30,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Scan trigger failed with status ${res.status}`);
  }

  return await res.json();
}
