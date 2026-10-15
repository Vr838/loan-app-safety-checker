# Data Sources, Registry & Provenance

This document details the registry of external sources, access constraints, request budgets, and data provenance rules implemented in the Loan App Safety Checker platform.

---

## 1. Source Registry

| Source Identifier | Source Type | Base URL / Registry | Access Method | Terms & Constraints | Retention Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `google_play` | Public App Store | `https://play.google.com/store/apps` | `google-play-scraper` / HTTPX | Public listings & reviews only. Max 10 apps/query, 30 reviews/app. Delays with jitter. | Reviewer names and PII strictly stripped. Metadata and anonymized text retained. |
| `rbi_nbfc_registry` | Official Regulator | `https://www.rbi.org.in/scripts/BS_NBFCList.aspx` | Curated offline snapshot & HTTP verification | Official Government of India & RBI public domain gazettes. | Stored as verified regulatory evidence with provenance URL. |
| `state_cyber_advisory` | Government Advisory | `https://cybercrime.gov.in/advisories` | Curated public advisory registry | Public safety warnings issued by State Cyber Crime units. | Verbatim excerpt and access timestamp recorded. |
| `external_search` | Search Adapter | `https://serpapi.com/search.json` | Authenticated HTTPX API client | Rate-limited queries. Configurable provider (SerpApi / DuckDuckGo / Local Registry). | Short excerpts ($\le 300$ chars) stored with SHA256 content hash. |

---

## 2. Provenance Architecture

To ensure every finding is auditable and resistant to tampering:
1. **Source Timestamps:**  
   The database records two distinct timestamps for all evidence:
   - `publication_date`: When the original article or gazette was issued (if available).
   - `access_timestamp`: When our collector retrieved and evaluated the record.
2. **Deterministic Content Hashing:**  
   Every evidence item generates a SHA256 hash derived from:
   $$\text{Content Hash} = \text{SHA256}(\text{package\_id} + \text{":::"} + \text{source\_url} + \text{":::"} + \text{claim})$$
   This prevents duplicate citations from appearing in the database while allowing historical re-scans.
3. **No Paraphrasing of Allegations as Facts:**  
   Excerpts are retained in their original quoted format and attributed directly to their publisher.

---

## 3. Privacy & Personal Data Minimization

- **Zero Reviewer PII:** User profile photos, real names, and email addresses are discarded immediately upon ingestion.
- **Copyright Compliance:** External news and regulatory pages are never mirrored in full. Only short factual excerpts (1–3 sentences) necessary to substantiate a finding are retained, accompanied by a direct link to the original publisher.
