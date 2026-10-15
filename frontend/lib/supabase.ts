import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppItem, AppListResponse, ScanRun } from './types';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjpuwpvupzigbvapkvjz.supabase.co';
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_9ZcCD_1qmI_WtCeUgr59Yg_YNUXsAl8';

/**
 * Flag to control whether the client should attempt querying Supabase tables.
 * Set NEXT_PUBLIC_USE_SUPABASE=true in Vercel or .env.local after running supabase/schema.sql.
 * By default, set to false so the browser never logs 404 errors when tables haven't been created yet.
 */
export const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

let supabaseClient: SupabaseClient | null = null;
let tablesAvailable: boolean | null = null;

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
  return Boolean(SUPABASE_URL && SUPABASE_KEY && tablesAvailable === true);
}

/**
 * Fetch apps from Supabase Postgres database only when tables exist and USE_SUPABASE is enabled.
 * Returns null immediately if tables are not initialized, completely preventing 404 console errors.
 */
export async function fetchAppsFromSupabase(params?: {
  q?: string;
  risk_category?: string;
  min_rating?: number;
  sort_by?: string;
  page?: number;
  page_size?: number;
}): Promise<AppListResponse | null> {
  // If explicitly disabled or tables already determined to not exist, skip without network request
  if (!USE_SUPABASE || tablesAvailable === false) {
    return null;
  }

  try {
    const supabase = getSupabase();
    let query = supabase.from('apps').select('*', { count: 'exact' });

    if (params?.q) {
      query = query.or(`title.ilike.%${params.q}%,developer.ilike.%${params.q}%,package_id.ilike.%${params.q}%`);
    }

    if (params?.min_rating) {
      query = query.gte('rating', params.min_rating);
    }

    query = query.eq('is_active', true);

    const pageSize = params?.page_size ?? 25;
    const page = params?.page ?? 1;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    query = query.range(start, end);

    const { data, count, error } = await query;
    if (error) {
      // 404 or table missing -> cache as unavailable to avoid further failed requests
      tablesAvailable = false;
      return null;
    }

    tablesAvailable = true;
    return {
      items: (data ?? []) as AppItem[],
      total: count ?? data?.length ?? 0,
      page,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil((count ?? data?.length ?? 0) / pageSize)),
    };
  } catch {
    tablesAvailable = false;
    return null;
  }
}

/**
 * Fetch latest scan run from Supabase if tables exist
 */
export async function fetchLatestScanFromSupabase(): Promise<ScanRun | null> {
  if (!USE_SUPABASE || tablesAvailable === false) {
    return null;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('scan_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      tablesAvailable = false;
      return null;
    }
    return data as ScanRun;
  } catch {
    tablesAvailable = false;
    return null;
  }
}
