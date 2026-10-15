import { AppItem, AppListResponse, HealthStatus, ScanRun } from './types';
import { FALLBACK_APPS, FALLBACK_SCAN } from './demoData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function fetchHealth(): Promise<{ data: HealthStatus; isLive: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { data, isLive: true };
  } catch (err) {
    return {
      data: {
        status: 'demo_mode',
        version: '0.1.0 (Demo Mode)',
        environment: 'local_demo',
        database_connected: false,
        collector_ready: false,
        components: {
          backend: 'Backend offline, using verified local demo cache',
          risk_engine: 'active (v1.0.0 preview)',
        },
      },
      isLive: false,
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
}): Promise<{ response: AppListResponse; isDemo: boolean }> {
  try {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.risk_category && params.risk_category !== 'All') query.set('risk_category', params.risk_category);
    if (params?.min_rating) query.set('min_rating', params.min_rating.toString());
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.page_size) query.set('page_size', params.page_size.toString());

    const res = await fetch(`${API_BASE_URL}/api/v1/apps?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: AppListResponse = await res.json();
    return { response: data, isDemo: false };
  } catch (err) {
    // Client-side filtering & sorting fallback
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
      filtered = filtered.filter(
        (a) => (a.latest_assessment?.risk_category || '').toLowerCase() === targetCat
      );
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
    } else if (params?.sort_by === 'name_asc') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    const pageSize = params?.page_size || 10;
    const page = params?.page || 1;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return {
      response: {
        items: paginated,
        total: filtered.length,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(filtered.length / pageSize) || 1,
      },
      isDemo: true,
    };
  }
}

export async function fetchAppDetail(packageId: string): Promise<{ app: AppItem | null; isDemo: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/apps/${encodeURIComponent(packageId)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { app: data, isDemo: false };
  } catch (err) {
    const found = FALLBACK_APPS.find((a) => a.package_id === packageId) || null;
    return { app: found, isDemo: true };
  }
}

export async function fetchLatestScan(): Promise<{ scan: ScanRun | null; isDemo: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/scans/latest`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { scan: data, isDemo: false };
  } catch (err) {
    return { scan: FALLBACK_SCAN, isDemo: true };
  }
}

export async function triggerScan(adminToken: string, options?: { max_apps?: number; max_reviews?: number }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/scans/admin/trigger`, {
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
