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
| **External Search Coverage** | A bounded Google News RSS search collects at most three public reporting links per app. Results can be incomplete, and complaints or forums may not be indexed as news. | It cannot establish a complete record of all news, complaints, or forums. | Results are retained as unverified provenance and never alter a score without an official regulatory record. | Add reviewed regulator feeds and a resilient multi-provider search service. |

---

## 2. Incomplete or Future Features

1. **Automated Scheduled Cron Scans:**  
   Currently, scans are executed manually via CLI (`scripts/run_scan.py`) or through the authenticated endpoint `POST /api/v1/scans/admin/trigger`. A standing recurring cron job can be configured via GitHub Actions or cloud schedulers.
2. **Graph Visualization of Developer Networks:**  
   NetworkX is supported for mapping developers sharing common office addresses or websites, but full graph clustering UI will be added in Phase 2.

---

## 3. Practical Limits for Users

1. **Coverage is not exhaustive.** Google Play does not provide a public endpoint that lists every loan app. This project discovers candidates through configured searches, so a missing app has not been assessed.
2. **A scan is a snapshot.** Store listings, ratings, reviews, developer details, and public reporting can change after a scan completes. Use the displayed scan date and refresh before relying on a result.
3. **The selected scan budget is an upper bound.** Each scan uses three loan queries. The app limit applies to each query, duplicate packages are checked once, and upstream sources can return fewer usable records.
4. **Scores are signals, not verdicts.** A lower score means fewer matching signals appeared in the collected evidence. It does not mean an app is safe or approved. Higher scores require source review and may need human or regulatory verification.
5. **Review language is difficult.** Hindi, Hinglish, and regional language reviews can carry meaning that the present rule based classifier does not fully capture.
6. **No APK inspection occurs.** The system does not download, decompile, or execute Android app packages. It cannot independently verify runtime permissions, embedded SDKs, or network traffic.
7. **Production needs a public backend.** A Vercel frontend cannot call a visitor's local backend. The deployment needs a separate HTTPS API URL and production environment configuration.

## 4. Current Data Boundaries

The collector stores only the metadata, public review sample, and external evidence needed for the result. Reviewer names, email addresses, and avatars are removed before storage. External evidence is kept with source URLs so a result can be checked, but news and forum coverage can still be incomplete.
