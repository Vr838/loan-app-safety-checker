export interface IndicatorItem {
  rule_id: string;
  category: string;
  finding: string;
  impact: 'negative' | 'positive';
  weight: number;
  contribution: number;
  source: string;
  source_url?: string | null;
  citation_excerpt?: string | null;
}

export interface RiskAssessment {
  id?: number;
  package_id: string;
  overall_score: number;
  risk_category:
    | 'Lower concern'
    | 'Caution'
    | 'Moderate'
    | 'High concern'
    | 'Insufficient evidence'
    | 'Lower Concern'
    | 'High Concern'
    | 'Insufficient Evidence'
    | string;
  confidence_score: number;
  confidence_level: 'High' | 'Medium' | 'Low' | 'Insufficient';
  score_breakdown?: Record<string, any>;
  negative_indicators: IndicatorItem[];
  positive_indicators: IndicatorItem[];
  complaint_theme_distribution: Record<string, number>;
  evidence_sufficiency_rationale?: string;
  assessment_timestamp: string;
  engine_version: string;
}

export interface EvidenceItem {
  id: number;
  package_id: string;
  source_url?: string | null;
  source_title: string;
  source_type: string;
  claim_supported: string;
  excerpt: string;
  reliability_score: number;
  content_hash: string;
  publication_date?: string | null;
  access_timestamp: string;
}

export interface ScanChangeAlert {
  id: string;
  type: 'delisted' | 'new_app' | 'risk_shift' | 'permission_change' | 'rbi_status';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  package_id?: string;
  app_name?: string;
  old_value?: string;
  new_value?: string;
}

export interface RbiVerification {
  status: 'verified_regulated' | 'registered_dla' | 'unverified_lsp' | 'sachet_flagged' | 'manual_verification_required';
  status_label: string;
  regulated_entity_name: string;
  cor_number?: string;
  category?: string;
  lending_partner_type?: string;
  verification_date: string;
  source_name: string;
  source_url: string;
  source_date: string;
  official_citation: string;
  excerpt: string;
}

export interface VernacularKeywordMatch {
  keyword: string;
  language: 'Hindi' | 'Hinglish' | 'Regional';
  theme: string;
  meaning: string;
  count: number;
}

export interface VernacularReviewSample {
  id: string;
  text: string;
  language: 'Hindi' | 'Hinglish' | 'Regional';
  sentiment: 'negative' | 'neutral' | 'positive';
  detected_themes: string[];
  translated_context: string;
  rating: number;
  author: string;
}

export interface MultiLanguageReviewAnalysis {
  primary_language: string;
  vernacular_share_pct: number;
  languages_detected: string[];
  bimodal_anomaly_detected: boolean;
  bimodal_notes?: string;
  keyword_matches: VernacularKeywordMatch[];
  sample_reviews: VernacularReviewSample[];
}

export interface SensitivePermission {
  name: string;
  dangerous: boolean;
  category: string;
  reason: string;
  detected: boolean;
}

export interface AppItem {
  package_id: string;
  title: string;
  developer: string;
  developer_id?: string | null;
  developer_email?: string | null;
  developer_website?: string | null;
  developer_address?: string | null;
  category: string;
  rating: number;
  rating_count: number;
  installs_text?: string | null;
  installs_approx: number;
  privacy_policy_url?: string | null;
  store_url: string;
  icon_url?: string | null;
  summary?: string | null;
  is_active: boolean;
  first_discovered_at: string;
  last_scanned_at: string;
  safety_reason?: string | null;
  store_status?: 'active' | 'delisted' | 'flagged' | null;
  review_sample_count?: number;
  latest_assessment?: RiskAssessment | null;
  evidence_items?: EvidenceItem[];
  recent_assessments?: RiskAssessment[];
  rbi_verification?: RbiVerification;
  multilang_analysis?: MultiLanguageReviewAnalysis;
  sensitive_permissions?: SensitivePermission[];
}

export interface AppListResponse {
  items: AppItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ScanRun {
  id: number;
  scan_uuid: string;
  started_at: string;
  completed_at?: string | null;
  status: string;
  trigger_type: string;
  queries_attempted: string[];
  apps_discovered_count: number;
  apps_collected_count: number;
  apps_new_count: number;
  apps_refreshed_count: number;
  apps_failed_count: number;
  delisted_count?: number;
  risk_shifts_count?: number;
  error_summary?: Array<{ package_id?: string; error?: string }>;
  collector_version: string;
  change_alerts?: ScanChangeAlert[];
}

export interface RbiSource {
  title: string;
  url: string;
  source_date?: string;
  citation?: string;
  excerpt?: string;
}

export interface RbiCheck {
  status: 'verified_regulated' | 'registered_dla' | 'unverified_lsp' | 'sachet_flagged' | 'manual_verification_required' | string;
  developer_name: string;
  message: string;
  sources: RbiSource[];
  verification?: RbiVerification;
}

export interface HealthStatus {
  status: string;
  version: string;
  environment: string;
  database_connected: boolean;
  collector_ready: boolean;
  components: Record<string, string>;
}

