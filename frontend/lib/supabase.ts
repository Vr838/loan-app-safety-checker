import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppItem, AppListResponse, ScanRun } from './types';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjpuwpvupzigbvapkvjz.supabase.co';
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_9ZcCD_1qmI_WtCeUgr59Yg_YNUXsAl8';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

export function isSupabaseConnected(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/**
 * Fetch apps from Supabase Postgres database if available
 */
export async function fetchAppsFromSupabase(params?: {
  q?: string;
  risk_category?: string;
  min_rating?: number;
  sort_by?: string;
  page?: number;
  page_size?: number;
}): Promise<AppListResponse | null> {
  try {
    const supabase = getSupabase();
    let query = supabase.from('apps').select('*', { count: 'exact' });

    if (params?.q) {
      query = query.or(`title.ilike.%${params.q}%,developer.ilike.%${params.q}%,package_id.ilike.%${params.q}%`);
    }

    if (params?.min_rating) {
      query = query.gte('rating', params.min_rating);
    }

    // Exclude delisted apps
    query = query.eq('is_active', true);

    const pageSize = params?.page_size ?? 25;
    const page = params?.page ?? 1;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    query = query.range(start, end);

    const { data, count, error } = await query;
    if (error || !data || data.length === 0) {
      return null;
    }

    return {
      items: data as AppItem[],
      total: count ?? data.length,
      page,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil((count ?? data.length) / pageSize)),
    };
  } catch (err) {
    console.warn('Supabase fetchApps skipped, using verified store dataset:', err);
    return null;
  }
}

/**
 * Fetch latest scan run from Supabase
 */
export async function fetchLatestScanFromSupabase(): Promise<ScanRun | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('scan_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as ScanRun;
  } catch {
    return null;
  }
}
