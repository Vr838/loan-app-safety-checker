# Known Limitations & Roadmaps

The Loan App Safety Checker platform prioritizes transparency. This document details technical boundaries, known limitations, their operational impact, and recommended next steps.

---

## 1. Inventory of Current Limitations

| Limitation Area | Description & Root Cause | Operational Impact | Workaround in Place | Next Engineering Step |
| :--- | :--- | :--- | :--- | :--- |
| **Non-Exhaustive Play Store Coverage** | Google Play does not expose an exhaustive catalog API; discovery depends on search queries. | The catalog reflects discovered packages from configured loan queries, not all possible financial apps. | Multi-query discovery (`instant loan`, `personal loan`, `quick cash`) with deduplication. | Ingest public fintech sitemaps and app repository dumps. |
| **Self-Selected Review Bias** | User reviews are voluntary, often submitted during extreme satisfaction or extreme frustration. | High rating polarization; review sentiment alone is not definitive proof of illegal activity. | Review anomaly detector (`REV_01`) detects artificial bursts and polarization. | Corroborate review clusters with external regulatory filings. |
| **No Dynamic Runtime Binary Analysis** | The platform examines public listing metadata, disclosures, and reviews, not the decompiled APK binary. | Cannot observe real-time network traffic or undocumented background SDK behavior. | Explicit caveat in UI; only report permissions and disclosures verified from store metadata. | Integrate with open APK static analysis tools (e.g. MobSF) in a future worker. |
| **Entity Disambiguation** | Developer names on Play Store frequently differ from the registered legal corporate NBFC name. | Some legitimate NBFC partnerships may not automatically match the registry. | Fuzzy matching on corporate substrings and explicit `developer_id` checks. | Implement a crowdsourced / audited developer-to-lender mapping registry. |
| **Multilingual NLP Complexity** | Loan reviews often feature code-mixed language (e.g., Hinglish, Romanized regional languages). | Keyword regexes catch major English and Romanized keywords, but nuance in regional dialects can be missed. | Targeted multilingual keyword lexicons and explicit `Insufficient evidence` fallbacks. | Fine-tune a lightweight transformer model for Indian financial sentiment. |
| **External Search API Rate Limits** | Live external search requires paid third-party API keys (e.g. SerpApi). | When unconfigured, the system cannot search live web news dynamically. | Built-in verified regulatory registry provides instant verification with clear limitation logging. | Add support for free public search providers (e.g. DuckDuckGo HTML parser) with backoff. |

---

## 2. Incomplete or Future Features

1. **Automated Scheduled Cron Scans:**  
   Currently, scans are executed manually via CLI (`scripts/run_scan.py`) or through the authenticated endpoint `POST /api/v1/scans/admin/trigger`. A standing recurring cron job can be configured via GitHub Actions or cloud schedulers.
2. **Graph Visualization of Developer Networks:**  
   NetworkX is supported for mapping developers sharing common office addresses or websites, but full graph clustering UI will be added in Phase 2.
