# Implementation Plan — Loan App Safety Checker

This document tracks the phased engineering execution of the Loan App Safety Checker platform. Each milestone details its dependencies, key deliverables, risks, mitigation strategies, and testable acceptance criteria. Checkboxes are updated as implementation milestones are completed and verified.

---

## Architecture Overview & Phasing

```
[Phase 1: Planning & Explanations]
       │
       ▼
[Phase 2: Backend Core, Database & Migrations]
       │
       ▼
[Phase 3: Bounded Collectors & Evidence Adapters]
       │
       ▼
[Phase 4: Deterministic Risk Engine & Review Analysis]
       │
       ▼
[Phase 5: FastAPI REST Endpoints & Admin Protection]
       │
       ▼
[Phase 6: Next.js Analyst Dashboard & UI Components]
       │
       ▼
[Phase 7: Comprehensive Automated Testing & Edge Cases]
       │
       ▼
[Phase 8: Documentation Sync, CI, & Deployment Readiness]
```

---

## Milestone 1: Inspection, Planning & Explanations
**Dependencies:** None.  
**Risks:** Premature implementation before establishing strict risk engine heuristics and database boundaries.  
**Mitigation:** Define data models, risk scoring rules, and technology justifications before writing code.

- [x] Inspect existing blueprint files, directory structure, and tooling environment.
- [x] Author comprehensive `docs/IMPLEMENTATION_PLAN.md` with explicit milestones and acceptance criteria.
- [x] Author beginner-friendly `docs/EXPLANATIONS.md` explaining architecture, data flow, scoring math, and tech stack choices.
- [x] Verify local development runtimes (Python 3.11, Node v26, npm 11).

**Acceptance Criteria Status:** Completed & Verified.

---

## Milestone 2: Backend Architecture, Database Schema & Migrations
**Dependencies:** Milestone 1.  
**Risks:** Schema mismatch between PostgreSQL production and local testing environments; migration drift.  
**Mitigation:** Use SQLAlchemy 2.0 declarative models with Alembic migrations, supporting both PostgreSQL (`postgresql+asyncpg` / `psycopg2`) and SQLite (`sqlite+aiosqlite` / `sqlite`) for zero-dependency local test runs.

- [x] Create Python project structure in `backend/` with `pyproject.toml` and dependencies.
- [x] Define configuration management (`pydantic-settings`) in `backend/app/core/config.py` with environment variable validation.
- [x] Implement SQLAlchemy 2.0 models in `backend/app/db/models.py`:
  - `App`: package ID (primary key), title, developer, developer ID, category, rating, rating count, installs, privacy policy URL, store URL, timestamps.
  - `Review`: unique review ID, package ID, rating, review text, thumbs up, language, review timestamp, analyzed sentiment/themes.
  - `Evidence`: evidence ID, app ID, source URL, title, source type (regulator, journalism, store, user_report), excerpt, claim, access timestamp, publication timestamp, content hash.
  - `ScanRun`: scan ID, started_at, completed_at, status (`running`, `completed`, `partial`, `failed`), queries attempted, discovered count, collected count, failed count, error log, version info.
  - `RiskAssessment`: assessment ID, app ID, overall score (0–100), category (`Lower concern`, `Caution`, `High concern`, `Insufficient evidence`), confidence (`High`, `Medium`, `Low`, `Insufficient`), score breakdown JSON, positive/negative indicators, assessment timestamp, rule version.
- [x] Set up Alembic database migrations in `backend/migrations/` and generate initial migration (`c8e46ae8ab4a_initial_schema.py`).
- [x] Configure database session management in `backend/app/db/session.py`.
- [x] Create `backend/.env.example` with zero secrets.

**Acceptance Criteria Status:** Completed & Verified (Alembic upgrade and downgrade tested successfully).

---

## Milestone 3: Bounded Collectors & External Evidence Adapters
**Dependencies:** Milestone 2.  
**Risks:** Upstream rate limiting, IP blocking, CAPTCHA triggering, or library breakage from Google Play scraping; non-deterministic network failures.  
**Mitigation:** Strict bounded queries (max 5 apps per query default, max 30 reviews per app), configurable request delays (jitter), exponential backoff, caching, and graceful offline fallback.

- [x] Implement `backend/app/collectors/play_store.py`:
  - Query discovery across configured loan search queries (`instant personal loan`, `quick cash loan`, `instant credit line`).
  - Metadata parser extracting developer name, address, email, privacy policy, and store metrics.
  - Bounded review sampling with reviewer privacy preservation (anonymized identifiers, no personal data retained).
  - Robust exception handling for network timeouts, 404s, and structural changes.
- [x] Implement `backend/app/collectors/external_evidence.py`:
  - Configurable search provider interface (SerpApi, DuckDuckGo, or local verified registry).
  - Built-in regulatory knowledge base (RBI/NBFC official lists, cyber advisories).
  - Graceful degradation: operates cleanly using public regulatory registries when search API key is absent.
- [x] Implement `scripts/run_scan.py` command-line collector entrypoint for scheduled and manual scans.

**Acceptance Criteria Status:** Completed & Verified.

---

## Milestone 4: Deterministic Risk Engine & Review Analysis
**Dependencies:** Milestone 3.  
**Risks:** Unexplainable "black box" decisions; false accusations of fraud; conflating absence of data with safety.  
**Mitigation:** Versioned heuristic rule engine (`v1.0.0`) with transparent mathematical weights, counter-evidence weighting, and explicit `Insufficient evidence` status.

- [x] Implement `backend/app/analysis/reviews.py`:
  - Lexicon and pattern-based complaint classifier targeting high-risk financial signals (`harassment_threats`, `hidden_fees_deductions`, `short_cycle_extortion`, `privacy_contact_abuse`, `deceptive_rates`).
  - Review anomaly detector (bimodal star distribution, high text duplication bursts).
- [x] Implement `backend/app/analysis/risk.py`:
  - Deterministic scoring formula:
    $$\text{Risk Score} = \text{Clamp}\left(\sum w_i \cdot S_i - \sum b_j \cdot C_j, 0, 100\right)$$
  - Explicit rule definitions with weights, positive mitigations, and counter-evidence.
  - Evidence sufficiency / Confidence scoring ($0.0 - 1.0$) based on data availability.
  - Four deterministic tiers: `Insufficient evidence`, `Lower concern`, `Caution`, `High concern`.
  - Generation of structured indicator breakdown (finding, rule ID, impact, source attribution).

**Acceptance Criteria Status:** Completed & Verified (Unit tests confirm identical output on repeated runs).

---

## Milestone 5: FastAPI REST Endpoints & Admin Security
**Dependencies:** Milestones 2, 3, 4.  
**Risks:** Unauthenticated actors triggering denial-of-service scrapers; leaking backend traces.  
**Mitigation:** HTTP Bearer token authentication on `/api/v1/scans/admin/trigger`; strict Pydantic schemas; CORS whitelist.

- [x] Implement FastAPI application in `backend/app/main.py`:
  - Middleware for CORS, structured request logging, and global exception handling.
  - Health endpoint `GET /health` reporting DB status and collector state.
- [x] Implement API routes in `backend/app/api/`:
  - `GET /api/v1/apps`: Paginated list, search query, filter by risk category, sort by risk/rating/name.
  - `GET /api/v1/apps/{package_id}`: Full app details, latest risk assessment, review theme breakdown.
  - `GET /api/v1/apps/{package_id}/evidence`: Verifiable evidence records, sources, and timestamps.
  - `GET /api/v1/apps/{package_id}/history`: Historical snapshots of risk assessments and ratings.
  - `GET /api/v1/scans/latest`: Summary of latest scan run, discovered count, failed queries, coverage stats.
  - `POST /api/v1/scans/admin/trigger`: Protected scan trigger requiring `ADMIN_API_TOKEN`.
- [x] Implement seed service and CLI script `scripts/seed_demo_data.py` with labeled realistic sample apps covering all 4 tiers.

**Acceptance Criteria Status:** Completed & Verified (API tests pass with 200/202/401/404 assertions).

---

## Milestone 6: Next.js Analyst Dashboard & UI
**Dependencies:** Milestone 5.  
**Risks:** Slow render on large data; inaccessible contrast or color-only risk cues.  
**Mitigation:** Tailwind CSS dark financial intelligence palette; Lucide icons paired with badges; responsive components; graceful API offline fallback.

- [x] Initialize Next.js 14+ TypeScript project in `frontend/`.
- [x] Configure Tailwind CSS with dark analyst palette (obsidian slate `#0B0F17`, indigo `#6366F1`, emerald `#10B981`, amber `#F59E0B`, rose `#F43F5E`).
- [x] Build components:
  - `Navbar`: Live backend connection status and Authorized Scan modal launcher.
  - `OverviewMetrics`: Total apps, high concern alerts, average confidence, latest scan coverage.
  - `AppTable`: Searchable, filterable, sortable, paginated app table with status badges and indicators.
  - `AppDetailModal`:
    - Score breakdown gauge
    - Confidence meter & sufficiency explanation
    - Complaint theme distribution (Recharts)
    - Verifiable evidence cards with external links and access timestamps
    - Caveat & methodology disclaimer
  - `ScanModal`: Admin scan modal with token prompt.
- [x] Create `frontend/.env.example`.

**Acceptance Criteria Status:** Completed & Verified (`npm run build` succeeds in 2.7s with zero errors).

---

## Milestone 7: Automated Testing & Edge Case Verification
**Dependencies:** Milestones 2–6.  
**Risks:** Flaky network calls in CI; untested edge cases in scoring.  
**Mitigation:** 100% mocked external HTTP calls; comprehensive pytest suite covering all required edge scenarios.

- [x] Write backend unit tests:
  - `tests/test_risk_scoring.py`: Deterministic scoring, zero-evidence edge cases, counter-evidence deduction.
  - `tests/test_collectors.py`: Mocked Play Store and external search adapters, PII sanitization.
  - `tests/test_reviews_analysis.py`: Theme classification and anomaly detection.
  - `tests/test_api.py`: Endpoint contracts, pagination, invalid package ID, admin auth protection.
- [x] Run backend test suite: 23 passed out of 23 tests.
- [x] Run Ruff linter: All checks passed.
- [x] Run frontend build: `npm run build` static generation passed.

**Acceptance Criteria Status:** Completed & Verified.

---

## Milestone 8: Documentation Synchronization & CI
**Dependencies:** Milestones 1–7.  
**Risks:** Out-of-sync documentation claiming features that do not exist in code.  
**Mitigation:** Maintain 1-to-1 parity between implemented code and markdown documents.

- [x] Author/update all 15 required documentation files:
  - `README.md`
  - `docs/IMPLEMENTATION_PLAN.md`
  - `docs/EXPLANATIONS.md`
  - `docs/ARCHITECTURE.md`
  - `docs/METHODOLOGY.md`
  - `docs/DATA_SOURCES.md`
  - `docs/RISK_SCORING.md`
  - `docs/DATABASE_SCHEMA.md`
  - `docs/API.md`
  - `docs/TESTING.md`
  - `docs/DEPLOYMENT.md`
  - `docs/LIMITATIONS.md`
  - `docs/DECISIONS.md`
  - `docs/DEMO_WALKTHROUGH.md`
  - `docs/SECURITY.md`
- [x] Configure GitHub Actions CI workflow in `.github/workflows/ci.yml`.
- [x] Configure root `.gitignore` excluding secrets, caches, and local databases.

**Acceptance Criteria Status:** Completed & Verified.
