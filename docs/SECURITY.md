# Security & Responsible Collection Policy

This document details the security posture, authentication architecture, data minimization practices, and responsible collection boundaries implemented in the Loan App Safety Checker platform.

---

## 1. Secrets & Credentials Management

1. **Zero Secret Policy in Source Control:**  
   The repository contains only `.env.example` templates with empty or non-sensitive default values. Real API keys, database connection strings, and admin tokens are loaded exclusively from local `.env` files or secure hosting environment variables (e.g., Vercel / Render environment settings).
2. **Server-Side Exclusivity:**  
   The Next.js frontend only exposes `NEXT_PUBLIC_API_BASE_URL`. All database connection strings (`DATABASE_URL`), administrative credentials (`ADMIN_API_TOKEN`), and search provider keys (`SEARCH_API_KEY`) remain strictly on the Python backend service.
3. **Git Hygiene:**  
   The root `.gitignore` strictly excludes `.env`, `.env.local`, `.venv/`, `*.db`, SQLite files, caches, and OS artifacts.

---

## 2. Administrative Protection & Authentication

### 2.1 The Scan Trigger Surface
Public collection and risk scoring are compute- and network-intensive. Triggering an unconstrained collection scan from the public internet would leave the system vulnerable to denial-of-service (DoS) attacks or upstream IP bans.

To mitigate this risk:
- Scans are **never triggered automatically by frontend visitor requests**.
- The endpoint `POST /api/v1/scans/admin/trigger` is gated behind HTTP Bearer authentication.

### 2.2 Constant-Time Token Comparison
In `backend/app/core/security.py`, incoming bearer tokens are validated against `ADMIN_API_TOKEN` using `secrets.compare_digest`:
```python
is_valid = secrets.compare_digest(
    credentials.credentials.strip(),
    settings.ADMIN_API_TOKEN.strip(),
)
```
This protects against side-channel timing attacks where an attacker measures slight millisecond variations in string comparison to deduce secret characters.

---

## 3. Data Minimization & User Privacy

When analyzing user reviews from public store listings, the collector follows strict privacy and data minimization principles:
1. **PII Stripping:** Reviewer usernames (`userName`), reviewer emails, and avatar URLs (`userImage`) are stripped immediately upon retrieval in `PlayStoreCollector.get_app_reviews()` before the review is analyzed or stored.
2. **Anonymous Aggregation:** Reviews are indexed by their upstream numerical review ID or a generated surrogate key.
3. **No Tracking Cookies:** The dashboard does not use third-party user tracking cookies, fingerprinting libraries, or invasive telemetry.

---

## 4. Responsible Collection Boundaries

The collector operates strictly within ethical research guidelines:
1. **No Circumvention:** The system never bypasses CAPTCHAs, paywalls, or authentication gates.
2. **Bounded Request Budgets:** Scans enforce hard caps (`max_apps_per_query`, `max_reviews_per_app`) to prevent overloading upstream services.
3. **Throttling & Backoff:** All HTTP calls include configurable delays and randomized jitter (`sleep_time = delay * random.uniform(0.5, 1.5)`), as well as exponential backoff on transient errors.
4. **Caching & Deduplication:** Stable Android package IDs and SHA256 evidence content hashes prevent repeated duplicate network requests for already verified apps.

---

## 5. Input Sanitization & CORS

1. **Untrusted External Data:** Text extracted from reviews, developer descriptions, and external websites is treated strictly as **untrusted user data**, never as code or instructions.
2. **Pydantic Validation:** All incoming and outgoing data passes through strict Pydantic v2 models with validated boundaries (e.g. ratings clamped between $0.0$ and $5.0$).
3. **Cross-Origin Resource Sharing (CORS):** The FastAPI backend restricts CORS headers specifically to the authorized frontend origins (`http://localhost:3000` in development, or the custom deployed domain in production). Wildcard `*` origins are rejected in production.
