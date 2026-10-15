# Loan App Safety Checker

> An evidence-driven research and risk-analysis platform for publicly listed digital lending apps. It combines app-store metadata, user review theme classification, developer transparency signals, and external regulatory records into explainable, deterministic heuristic assessments.

**Project Status:** Implemented & Verified  
**Public Repository:** [https://github.com/Vr838/loan-app-safety-checker](https://github.com/Vr838/loan-app-safety-checker)  
**Live Production Demo (Vercel):** [https://frontend-three-iota-v02ppkagaq.vercel.app](https://frontend-three-iota-v02ppkagaq.vercel.app)  
**Scoring Engine Version:** `v1.0.0`  
**Test Suite:** 23/23 Passing (100% mocked external HTTP calls)  
**Frontend Build:** Next.js 16 (Turbopack) Production Build Verified  

---

## 1. Project Overview

Digital personal loan applications on mobile marketplaces offer credit in minutes. However, a significant subset of predatory or unregulated lending apps engage in harmful behaviors:
- Exorbitant hidden fees and illegal 7-day loan repayment cycles.
- Unauthorized harvesting of user contact lists and photo galleries for extortion.
- Abusive debt collection, including threatening calls to borrowers' contacts.
- Obfuscated corporate ownership where developer names do not match licensed Non-Banking Financial Companies (NBFCs).

**Loan App Safety Checker** is an automated, evidence-backed investigative platform designed to surface these risks before borrowers install an app.

> **Important Caveat:** This platform is an investigative research aid. It does **not** provide legal determinations, credit recommendations, or absolute guarantees of safety. Assessments are deterministic heuristics.

---

## 2. Key Implemented Features

- **Responsible Bounded Collector:** Rate-limited Google Play Store collector with jitter delays, exponential backoff, bounded app caps, and bounded review samples.
- **Privacy Minimization:** Reviewer names, emails, and avatar URLs are stripped prior to persistence.
- **External Evidence Registry:** Built-in verified registry of RBI-registered NBFC entities and public State Cyber Crime advisories, with configurable search adapter support (SerpApi).
- **Deterministic Risk Engine (`v1.0.0`):** Transparent mathematical formula balancing 6 negative risk signals against positive regulatory mitigations, bounded between 0 and 100.
- **Separation of Risk from Confidence:** A separate Evidence Sufficiency metric ($0.0 - 1.0$) ensures newly launched apps with zero reviews are marked as `Insufficient evidence` rather than falsely declared safe.
- **FastAPI REST Service:** Typed Pydantic v2 endpoints for app listing, search, filtering, detailed profiles, evidence provenance, historical trend snapshots, and health checks.
- **Protected Admin Trigger:** HTTP Bearer token authentication with constant-time comparison on scan trigger endpoints (`POST /api/v1/scans/admin/trigger`).
- **Dark Analyst Dashboard:** Next.js 16 + TypeScript dashboard with Recharts complaint distribution, risk badges, evidence cards, and graceful demo fallback when offline.
- **Database Migrations:** SQLAlchemy 2.0 with Alembic supporting both PostgreSQL in production and zero-dependency SQLite locally.

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts |
| **Backend API** | Python 3.11+, FastAPI, Pydantic v2, Pydantic Settings, Uvicorn |
| **Database & ORM**| PostgreSQL 15+ (Production), SQLite (Local/CI), SQLAlchemy 2.0, Alembic |
| **Collectors & NLP**| `google-play-scraper`, HTTPX, BeautifulSoup4, Scikit-learn, Regex Pattern Lexicons |
| **Testing & CI** | Pytest, Pytest-Asyncio, Pytest-Mock, Ruff, GitHub Actions CI |

---

## 4. Repository Structure

```text
loan-app-safety-checker/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI (lint, tests, frontend build)
├── backend/
│   ├── app/
│   │   ├── analysis/            # Deterministic risk engine & review theme classifier
│   │   │   ├── reviews.py
│   │   │   └── risk.py
│   │   ├── api/                 # FastAPI routes (health, apps, scans)
│   │   │   ├── routes/
│   │   │   │   ├── apps.py
│   │   │   │   ├── health.py
│   │   │   │   └── scans.py
│   │   │   └── router.py
│   │   ├── collectors/          # Bounded Play Store & regulatory evidence collectors
│   │   │   ├── external_evidence.py
│   │   │   └── play_store.py
│   │   ├── core/                # Settings, Pydantic config, Bearer auth
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── db/                  # SQLAlchemy models & async sessionmaker
│   │   │   ├── models.py
│   │   │   └── session.py
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   │   ├── app.py
│   │   │   ├── evidence.py
│   │   │   ├── health.py
│   │   │   ├── review.py
│   │   │   ├── risk.py
│   │   │   └── scan.py
│   │   ├── services/            # Scan orchestration & labeled demo seed service
│   │   │   ├── scans.py
│   │   │   └── seed.py
│   │   └── main.py              # Application entrypoint, lifespan & CORS
│   ├── migrations/              # Alembic migration scripts
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── tests/                   # 23 automated tests with mocked HTTP
│   │   ├── conftest.py
│   │   ├── test_api.py
│   │   ├── test_collectors.py
│   │   ├── test_reviews_analysis.py
│   │   └── test_risk_scoring.py
│   ├── alembic.ini
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── .env.example
├── frontend/
│   ├── app/                     # Next.js App Router (page.tsx, layout.tsx, globals.css)
│   ├── components/              # UI components (Navbar, OverviewMetrics, AppTable, ...)
│   ├── lib/                     # Types, API client, and demo fallback dataset
│   ├── package.json
│   └── .env.example
├── scripts/
│   ├── run_scan.py              # CLI utility to run a bounded scan
│   └── seed_demo_data.py        # CLI utility to seed labeled benchmark data
├── docs/                        # Complete project documentation suite (14 files)
├── .gitignore                   # Excludes secrets, databases, caches, and node_modules
└── README.md
```

---

## 5. Local Setup & Quickstart

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**

### 5.1 Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt -r requirements-dev.txt

# 4. Copy environment template
cp .env.example .env

# 5. Run database migrations (creates SQLite tables automatically)
alembic upgrade head

# 6. Seed the labeled demo dataset
python ../scripts/seed_demo_data.py

# 7. Start the FastAPI development server
uvicorn app.main:app --reload --port 8000
```
- API is running at: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 5.2 Frontend Setup

In a new terminal window:
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Start Next.js development server
npm run dev
```
- Dashboard is running at: `http://localhost:3000`

---

## 6. Running Tests & Linters

### Backend Automated Tests
Automated tests use an in-memory SQLite database and 100% mocked network calls. No real network requests are made during testing.
```bash
cd backend
pytest -v
```
**Latest Test Run Result:** `23 passed in 25.28s`

### Code Quality & Linting
```bash
cd backend
ruff check app tests
```
**Latest Lint Result:** `All checks passed!`

### Frontend Build & Typecheck
```bash
cd frontend
npm run build
```
**Latest Build Result:** `Compiled successfully in 2.7s (zero type errors)`

---

## 7. Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `development` | Runtime environment (`development`, `production`) |
| `DATABASE_URL` | `sqlite+aiosqlite:///./loan_safety.db` | Async SQLAlchemy database URL |
| `SYNC_DATABASE_URL` | `sqlite:///./loan_safety.db` | Sync database URL for Alembic migrations |
| `ADMIN_API_TOKEN` | `dev-secret-admin-token-replace-in-prod` | Bearer token for authorized scans |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Whitelisted frontend origins |
| `MAX_APPS_PER_QUERY` | `10` | Bounded cap on candidate apps per query |
| `MAX_REVIEWS_PER_APP`| `30` | Bounded sample of user reviews per app |
| `EXTERNAL_SEARCH_PROVIDER`| `local_registry` | `local_registry`, `serpapi`, or `duckduckgo` |
| `SEARCH_API_KEY` | `""` | Optional external search API key |

### Frontend (`frontend/.env.local`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Base URL of FastAPI backend |

---

## 8. Documentation Index

The repository maintains synchronized, in-depth documentation in `docs/`:

- [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md): Engineering roadmap, milestones, and verified acceptance criteria.
- [EXPLANATIONS.md](docs/EXPLANATIONS.md): Plain-language guide explaining data flow, scoring math, and technology rationales.
- [ARCHITECTURE.md](docs/ARCHITECTURE.md): Component diagrams, system boundaries, and invariants.
- [METHODOLOGY.md](docs/METHODOLOGY.md): Research framework, evidence hierarchy, and epistemic tiers.
- [DATA_SOURCES.md](docs/DATA_SOURCES.md): Source registry, provenance hashing, rate budgets, and privacy rules.
- [RISK_SCORING.md](docs/RISK_SCORING.md): Mathematical rules, weights, thresholds, formulas, and worked examples.
- [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md): Entity relationship diagram, table columns, constraints, and migrations.
- [API.md](docs/API.md): OpenAPI endpoint descriptions, request/response examples, and error codes.
- [TESTING.md](docs/TESTING.md): Testing plan, edge-case matrix, and verified execution results.
- [DEPLOYMENT.md](docs/DEPLOYMENT.md): Step-by-step production hosting guide for Vercel, Render, and PostgreSQL.
- [LIMITATIONS.md](docs/LIMITATIONS.md): Known operational gaps, impact, workarounds, and roadmaps.
- [DECISIONS.md](docs/DECISIONS.md): Architecture Decision Records (ADRs) and trade-offs.
- [DEMO_WALKTHROUGH.md](docs/DEMO_WALKTHROUGH.md): Step-by-step verification guide for reviewers and evaluators.
- [SECURITY.md](docs/SECURITY.md): Secrets management, admin token protection, data minimization, and responsible collection.

---

## 9. Definition of Done Checklist

- [x] Repository contains fully working frontend (`frontend/`) and backend (`backend/`) code.
- [x] Setup instructions work cleanly from scratch.
- [x] Collection uses bounded requests, rate throttling with jitter, timeouts, and backoff.
- [x] Apps are deduplicated by package ID and evidence by content hash.
- [x] Assessments are explainable, deterministic, versioned (`v1.0.0`), and cite verifiable evidence.
- [x] Insufficient evidence is explicitly recognized and never conflated with safety.
- [x] Automated test suite (23/23 tests) passes with 100% mocked network calls.
- [x] No secrets or private tokens are committed (`.env.example` templates only).
- [x] All 15 required Markdown documents match the real implementation.
- [x] GitHub Actions CI workflow configured for linting, tests, and build.
- [x] Step-by-step reviewer walkthrough provided in [docs/DEMO_WALKTHROUGH.md](docs/DEMO_WALKTHROUGH.md).
