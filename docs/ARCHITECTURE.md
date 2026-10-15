# System Architecture & Component Boundaries

The **Loan App Safety Checker** platform is built as a modular monolith with decoupled data collection, persistence, deterministic analysis, REST API delivery, and a Next.js analyst dashboard.

---

## 1. System Component Diagram

```mermaid
flowchart TD
    subgraph ExternalSources ["External Data Sources"]
        GP["Google Play Store (Public Listings & Reviews)"]
        REG["Regulator Registries (RBI NBFC Register & Advisories)"]
        WEB["Allowed Web & Search Sources (SerpApi / News)"]
    end

    subgraph BackendService ["Python FastAPI Backend (Modular Monolith)"]
        subgraph Collectors ["app.collectors"]
            PSC["PlayStoreCollector<br/>(Rate limits, backoff, anonymization)"]
            EEC["ExternalEvidenceCollector<br/>(Regulatory matcher, content hash)"]
        end

        subgraph Analysis ["app.analysis"]
            NLP["ReviewAnalyzer<br/>(Themes: Harassment, Contact Abuse, 7-Day Trap)"]
            ANOM["AnomalyDetector<br/>(Bimodal star polarization, Duplicate review bursts)"]
            RE["RiskEngine v1.1.0<br/>(Deterministic weights, Sufficiency metric)"]
        end

        subgraph Services ["app.services"]
            SS["ScanService<br/>(Audit accounting, deduplication, error handling)"]
        end

        subgraph Database ["Relational Database (SQLAlchemy 2.0 / Alembic)"]
            DB[(PostgreSQL / SQLite<br/>apps, reviews, evidence, scan_runs, risk_assessments)]
        end

        subgraph API ["app.api (FastAPI REST)"]
            H_EP["GET /health"]
            A_EP["GET /api/v1/apps<br/>GET /api/v1/apps/{id}<br/>GET /api/v1/apps/{id}/evidence<br/>GET /api/v1/apps/{id}/history"]
            S_EP["GET /api/v1/scans/latest<br/>POST /api/v1/scans/admin/trigger (Bearer Token)"]
        end
    end

    subgraph FrontendService ["Next.js 14+ Analyst Dashboard (TypeScript & Tailwind)"]
        UI_NAV["Navbar (Live/Demo status, Scan button)"]
        UI_MET["OverviewMetrics (Totals, Risk breakdown, Scan info)"]
        UI_TBL["AppTable (Search, Category filters, Sort, Pagination)"]
        UI_MOD["AppDetailModal (Score gauge, Theme bar chart, Indicators, Evidence)"]
        UI_SCN["ScanModal (Admin token input, Bounded budget)"]
    end

    %% Connections
    GP --> PSC
    REG --> EEC
    WEB --> EEC

    PSC --> SS
    EEC --> SS

    SS --> NLP
    SS --> ANOM
    NLP --> RE
    ANOM --> RE

    RE --> SS
    SS --> DB
    SEED --> DB

    DB --> API
    API --> FrontendService
```

---

## 2. System Boundaries & Invariants

1. **No Frontend Scraping:** Web scraping or collection calls are **never executed inside a user-facing HTTP request**. The Next.js frontend only reads persisted historical snapshots from PostgreSQL via FastAPI.
2. **Deterministic Analysis:** The scoring engine computes scores using pure mathematical functions (`backend/app/analysis/risk.py`). Given the same inputs, the engine outputs the identical score, confidence level, and indicator list.
3. **Data Minimization:** Reviewer identities (names, email addresses, profile avatars) are stripped before persistence to respect privacy.
4. **Graceful Degradation:** If live collection or external search keys are absent, the application functions cleanly using pre-packaged labeled benchmark data and public regulatory lists.
