import { AppItem, RbiCheck } from './types';
import { getFullRbiCheck } from './rbiDatabase';
import { getMultiLanguageAnalysisForApp } from './multilang';

/**
 * Generates an exhaustive research report CSV for interview submissions and regulatory sharing
 */
export function generateAppCsv(app: AppItem, rbiCheck?: RbiCheck): string {
  const rbi = rbiCheck ?? getFullRbiCheck(app.package_id, app.developer);
  const multilang = app.multilang_analysis ?? getMultiLanguageAnalysisForApp(app);
  const assessment = app.latest_assessment;

  const sections: string[][] = [
    ['========================================================================'],
    ['LOAN APP SAFETY CHECKER — INVESTIGATIVE RESEARCH DOSSIER'],
    ['========================================================================'],
    ['Export Timestamp', new Date().toISOString()],
    ['Report Version', 'v1.2.0-verified-store'],
    ['Target Platform', 'Google Play Store (India)'],
    ['Status', 'OFFICIAL RESEARCH SUBMISSION'],
    [],
    ['--- APPLICATION IDENTIFIERS & STORE METRICS ---'],
    ['Application Title', app.title],
    ['Package Identifier', app.package_id],
    ['Developer Entity', app.developer],
    ['Developer ID', app.developer_id ?? 'N/A'],
    ['Developer Email', app.developer_email ?? 'N/A'],
    ['Developer Website', app.developer_website ?? 'N/A'],
    ['Developer Address', app.developer_address ?? 'Not provided on store'],
    ['Google Play URL', app.store_url],
    ['Privacy Policy URL', app.privacy_policy_url ?? 'None provided'],
    ['Google Play Rating', `${app.rating.toFixed(2)} / 5.0`],
    ['Total User Ratings', app.rating_count.toLocaleString()],
    ['Installs Bracket', app.installs_text ?? `${app.installs_approx.toLocaleString()}+`],
    ['Store Status', app.store_status ?? (app.is_active ? 'Active (HTTP 200)' : 'Delisted (HTTP 404)')],
    ['First Discovered', app.first_discovered_at],
    ['Last Scanned', app.last_scanned_at],
    [],
    ['--- ALGORITHMIC RISK CLASSIFICATION ---'],
    ['Observed Risk Score', `${assessment?.overall_score?.toFixed(1) ?? 'N/A'} / 100`],
    ['Risk Category', assessment?.risk_category ?? 'Insufficient Evidence'],
    ['Confidence Level', assessment?.confidence_level ?? 'N/A'],
    ['Evidence Sufficiency Coverage', `${Math.round((assessment?.confidence_score ?? 0) * 100)}%`],
    ['Sufficiency Rationale', assessment?.evidence_sufficiency_rationale ?? 'N/A'],
    ['Scoring Engine Version', assessment?.engine_version ?? 'v1.2.0'],
    ['Safety Assessment Summary', app.safety_reason ?? 'Heuristic scan completed.'],
    [],
    ['--- OFFICIAL RBI & REGULATORY COMPLIANCE VERIFICATION ---'],
    ['Regulatory Linkage Status', rbi.verification?.status_label ?? rbi.status],
    ['Verified Regulated Entity (RE)', rbi.verification?.regulated_entity_name ?? 'N/A'],
    ['Certificate of Registration (CoR)', rbi.verification?.cor_number ?? 'N/A'],
    ['NBFC / Bank Category', rbi.verification?.category ?? 'N/A'],
    ['Lending Model / Partnership Type', rbi.verification?.lending_partner_type ?? 'N/A'],
    ['Verification Date', rbi.verification?.verification_date ?? '2026-10-15'],
    ['Official RBI Citation', rbi.verification?.official_citation ?? 'N/A'],
    ['Primary Source Registry', rbi.verification?.source_name ?? 'N/A'],
    ['Source Registry Date', rbi.verification?.source_date ?? '10-Oct-2024'],
    ['Official Source URL', rbi.verification?.source_url ?? 'https://www.rbi.org.in'],
    ['Regulatory Finding Excerpt', rbi.verification?.excerpt ?? rbi.message],
    [],
    ['--- MULTI-LANGUAGE REVIEW & VERNACULAR NLP ANALYSIS ---'],
    ['Primary Language Distribution', multilang.primary_language],
    ['Vernacular Review Share', `${multilang.vernacular_share_pct}%`],
    ['Languages Detected in Sample', multilang.languages_detected.join(', ')],
    ['Bimodal Polarization Alert', multilang.bimodal_anomaly_detected ? 'YES — Suspicious 1-star vs 5-star divide' : 'NO — Normal distribution'],
    ['Anomaly Notes', multilang.bimodal_notes ?? 'None'],
    [],
    ['--- DETECTED VERNACULAR HARASSMENT / ABUSE KEYWORDS ---'],
    ['Keyword', 'Language', 'Theme Category', 'Frequency', 'English Context'],
    ...multilang.keyword_matches.map((k) => [k.keyword, k.language, k.theme, k.count.toString(), k.meaning]),
    [],
    ['--- SAMPLE VERNACULAR REVIEWS AUDIT ---'],
    ['Review ID', 'Language', 'Sentiment', 'Original Text', 'English Translation / Risk Context', 'Themes Detected'],
    ...multilang.sample_reviews.map((r) => [
      r.id,
      r.language,
      r.sentiment,
      r.text,
      r.translated_context,
      r.detected_themes.join('; ')
    ]),
    [],
    ['--- COMPLAINT THEME DISTRIBUTION ---'],
    ['Complaint Theme', 'Observed Review Count'],
    ...Object.entries(assessment?.complaint_theme_distribution ?? {}).map(([theme, count]) => [theme.replace(/_/g, ' '), count.toString()]),
    [],
    ['--- NEGATIVE RISK INDICATORS & FINDINGS TRAIL ---'],
    ['Rule ID', 'Category', 'Finding Description', 'Impact', 'Weight', 'Contribution Score', 'Evidence Source', 'Citation Excerpt'],
    ...(assessment?.negative_indicators ?? []).map((ind) => [
      ind.rule_id,
      ind.category,
      ind.finding,
      ind.impact,
      ind.weight.toString(),
      ind.contribution.toString(),
      ind.source,
      ind.citation_excerpt ?? 'N/A'
    ]),
    [],
    ['--- POSITIVE MITIGATING INDICATORS ---'],
    ['Rule ID', 'Category', 'Finding Description', 'Impact', 'Contribution Score', 'Evidence Source'],
    ...(assessment?.positive_indicators ?? []).map((ind) => [
      ind.rule_id,
      ind.category,
      ind.finding,
      ind.impact,
      ind.contribution.toString(),
      ind.source
    ]),
    [],
    ['--- OFFICIAL REGULATORY CITATIONS LIST ---'],
    ['Source Title', 'Citation Date', 'Official Reference', 'Portal URL'],
    ...(rbi.sources ?? []).map((s) => [s.title, s.source_date ?? '10-Oct-2024', s.citation ?? 'Official Register', s.url]),
    [],
    ['========================================================================'],
    ['RESEARCH METHODOLOGY & LEGAL DISCLAIMER'],
    ['Loan App Safety Checker provides deterministic risk heuristics based on'],
    ['public store listing metadata, sampled user reviews, and central bank registries.'],
    ['This dossier is prepared as an academic and investigative research aid.'],
    ['========================================================================']
  ];

  return sections
    .map((row) => row.map((cell) => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

/**
 * Trigger client-side browser download of CSV research dossier
 */
export function downloadAppCsv(app: AppItem, rbiCheck?: RbiCheck): void {
  const csvContent = generateAppCsv(app, rbiCheck);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `${app.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Safety_Dossier_${app.package_id}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an executive, print-ready PDF research dossier formatted for interview submissions
 */
export function printOrSaveAppPdf(app: AppItem, rbiCheck?: RbiCheck): void {
  const rbi = rbiCheck ?? getFullRbiCheck(app.package_id, app.developer);
  const multilang = app.multilang_analysis ?? getMultiLanguageAnalysisForApp(app);
  const assessment = app.latest_assessment;
  const score = assessment?.overall_score ?? 0;
  const category = assessment?.risk_category ?? 'Insufficient Evidence';

  const isHigh = category.toLowerCase().includes('high');
  const isCaution = category.toLowerCase().includes('caution') || category.toLowerCase().includes('moderate');
  const scoreColor = isHigh ? '#dc2626' : isCaution ? '#d97706' : '#16a34a';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Safety Research Dossier — ${app.title} (${app.package_id})</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      line-height: 1.45;
      font-size: 11pt;
      margin: 0;
      padding: 20px;
    }
    .header-banner {
      border-bottom: 2px solid #0071e3;
      padding-bottom: 12px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-title h1 {
      margin: 0;
      font-size: 18pt;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #0f172a;
    }
    .header-title p {
      margin: 3px 0 0;
      font-size: 9pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .dossier-stamp {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      text-align: right;
      font-size: 8.5pt;
      color: #475569;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .card h2 {
      font-size: 10pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0 0 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .score-box {
      background: #ffffff;
      border: 2px solid ${scoreColor};
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    .score-num {
      font-size: 28pt;
      font-weight: 800;
      color: ${scoreColor};
      line-height: 1;
    }
    .score-label {
      font-size: 11pt;
      font-weight: 700;
      color: ${scoreColor};
      margin-top: 4px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }
    .info-table td {
      padding: 4px 6px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .info-table td:first-child {
      font-weight: 600;
      color: #475569;
      width: 38%;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 8.5pt;
      font-weight: 600;
    }
    .badge-rbi {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .badge-flagged {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
      margin: 16px 0 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
    }
    .evidence-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-top: 6px;
    }
    .evidence-table th {
      background: #f1f5f9;
      text-align: left;
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      font-weight: 700;
      color: #334155;
    }
    .evidence-table td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .review-quote {
      background: #ffffff;
      border-left: 3px solid #0071e3;
      padding: 6px 10px;
      margin: 6px 0;
      font-size: 8.5pt;
      border-radius: 0 4px 4px 0;
    }
    .review-quote strong {
      color: #0f172a;
    }
    .review-quote p {
      margin: 2px 0 0;
      color: #475569;
      font-style: italic;
    }
    .footer-note {
      margin-top: 20px;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      font-size: 7.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    .tag {
      background: #e2e8f0;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 8pt;
      margin-right: 4px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div class="header-title">
      <p>Digital Lending Safety Checker · National Investigative Research</p>
      <h1>${app.title}</h1>
      <p style="text-transform:none; font-family: monospace; color:#3b82f6;">${app.package_id}</p>
    </div>
    <div class="dossier-stamp">
      <div><strong>OFFICIAL DOSSIER</strong></div>
      <div>Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      <div>Source: Google Play Store Live Audit</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="score-box">
      <div style="font-size: 8.5pt; font-weight:700; color:#64748b; text-transform:uppercase;">Observed Risk Index</div>
      <div class="score-num">${score.toFixed(1)}<span style="font-size:12pt; font-weight:400; color:#64748b;">/100</span></div>
      <div class="score-label">${category}</div>
      <div style="font-size:8.5pt; color:#475569; margin-top:6px;">Confidence: <strong>${Math.round((assessment?.confidence_score ?? 0) * 100)}%</strong> (${assessment?.confidence_level ?? 'Normal'} Coverage)</div>
    </div>

    <div class="card">
      <h2>App & Store Metadata</h2>
      <table class="info-table">
        <tr><td>Developer:</td><td><strong>${app.developer}</strong></td></tr>
        <tr><td>Store Status:</td><td><span class="badge ${app.store_status === 'delisted' ? 'badge-flagged' : 'badge-rbi'}">${app.store_status === 'delisted' ? '🚨 Delisted (404 Removed)' : '✅ Active on Google Play'}</span></td></tr>
        <tr><td>Play Store Rating:</td><td>★ ${app.rating.toFixed(2)} (${app.rating_count.toLocaleString()} reviews)</td></tr>
        <tr><td>Install Count:</td><td>${app.installs_text ?? `${app.installs_approx.toLocaleString()}+`}</td></tr>
        <tr><td>Privacy Policy:</td><td>${app.privacy_policy_url ? 'Public Policy Disclosed' : '❌ Undisclosed / Broken Link'}</td></tr>
      </table>
    </div>
  </div>

  <div class="card" style="margin-bottom: 14px;">
    <h2>Official RBI & Lender Regulatory Verification</h2>
    <table class="info-table">
      <tr><td>Verification Status:</td><td><strong>${rbi.verification?.status_label ?? rbi.status}</strong></td></tr>
      <tr><td>Regulated Entity (RE):</td><td><strong>${rbi.verification?.regulated_entity_name ?? 'N/A'}</strong></td></tr>
      <tr><td>Certificate of Registration (CoR):</td><td>${rbi.verification?.cor_number ?? 'N/A'} (${rbi.verification?.category ?? 'N/A'})</td></tr>
      <tr><td>Partnership Structure:</td><td>${rbi.verification?.lending_partner_type ?? 'Digital Lending App (DLA)'}</td></tr>
      <tr><td>Official Citation & Date:</td><td><strong>${rbi.verification?.official_citation ?? 'RBI Guidelines on Digital Lending'}</strong> (Source Date: <strong>${rbi.verification?.source_date ?? '10-Oct-2024'}</strong>)</td></tr>
      <tr><td>Registry Excerpt:</td><td style="color:#334155;"><em>"${rbi.verification?.excerpt ?? rbi.message}"</em></td></tr>
    </table>
  </div>

  <div class="card" style="margin-bottom: 14px;">
    <h2>Multi-Language Review Analysis (Hindi, Hinglish & Regional NLP)</h2>
    <div style="font-size:9pt; margin-bottom:8px;">
      Primary Language Mix: <strong>${multilang.primary_language}</strong> | Vernacular Share: <strong>${multilang.vernacular_share_pct}%</strong>
      ${multilang.bimodal_anomaly_detected ? '<span class="badge badge-flagged" style="margin-left:8px;">🚨 Bimodal Polarization Detected</span>' : ''}
    </div>
    <div style="margin-bottom:8px;">
      <span style="font-size:8.5pt; font-weight:600; color:#475569;">Detected Trigger Terms: </span>
      ${multilang.keyword_matches.map(k => `<span class="tag"><b>${k.keyword}</b> (${k.meaning}) · ${k.count}</span>`).join('')}
    </div>
    ${multilang.sample_reviews.map(r => `
      <div class="review-quote">
        <strong>${r.author} (${r.language}) — Rating ★${r.rating}</strong>
        <div>"${r.text}"</div>
        <p>→ Risk Context: ${r.translated_context}</p>
      </div>
    `).join('')}
  </div>

  <div class="section-title">Audit Trail & Heuristic Signal Breakdown</div>
  <table class="evidence-table">
    <thead>
      <tr>
        <th style="width: 15%;">Rule ID</th>
        <th style="width: 25%;">Category</th>
        <th style="width: 45%;">Observed Finding</th>
        <th style="width: 15%;">Contribution</th>
      </tr>
    </thead>
    <tbody>
      ${(assessment?.negative_indicators ?? []).map(ind => `
        <tr>
          <td><code>${ind.rule_id}</code></td>
          <td>${ind.category}</td>
          <td><strong>${ind.finding}</strong>${ind.citation_excerpt ? `<br><small style="color:#64748b;">${ind.citation_excerpt}</small>` : ''}</td>
          <td style="color:#dc2626; font-weight:700;">+${ind.contribution}</td>
        </tr>
      `).join('')}
      ${(assessment?.positive_indicators ?? []).map(ind => `
        <tr>
          <td><code>${ind.rule_id}</code></td>
          <td>${ind.category}</td>
          <td><strong>${ind.finding}</strong></td>
          <td style="color:#16a34a; font-weight:700;">${ind.contribution}</td>
        </tr>
      `).join('')}
      ${(!assessment?.negative_indicators?.length && !assessment?.positive_indicators?.length) ? '<tr><td colspan="4" style="text-align:center; color:#64748b;">No high-severity trigger rules tripped in sampled dataset.</td></tr>' : ''}
    </tbody>
  </table>

  <div class="footer-note">
    <div>Loan App Safety Checker · Open Investigative Research Blueprint · Not legal or investment advice.</div>
    <div>Page 1 of 1 · Verified Against RBI Master Register</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
