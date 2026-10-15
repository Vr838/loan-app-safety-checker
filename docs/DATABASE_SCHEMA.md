# Database Schema & Data Models

This document defines the relational database schema, tables, column types, relationships, indexes, unique constraints, and migration strategies for the Loan App Safety Checker platform.

---

## 1. Schema Diagram (ERD)

```mermaid
erDiagram
    APP ||--o{ REVIEW : "sampled reviews"
    APP ||--o{ EVIDENCE : "corroborating items"
    APP ||--o{ RISK_ASSESSMENT : "versioned assessments"

    APP {
        string package_id PK "Unique Play Store package identifier"
        string title "Application display title"
        string developer "Developer name"
        string developer_id "Play Store developer ID"
        string developer_email "Contact email"
        string developer_website "Official website URL"
        text developer_address "Physical office address"
        string category "Category code, e.g. FINANCE"
        float rating "Public average rating 0.0 to 5.0"
        integer rating_count "Number of user ratings"
        string installs_text "Store install range string"
        integer installs_approx "Numeric floor of installs"
        string privacy_policy_url "Direct HTTPS policy URL"
        string store_url "Public listing web URL"
        string icon_url "App logo/icon URL"
        text summary "Listing description excerpt"
        boolean is_active "Listing presence flag"
        timestamp first_discovered_at "First indexed timestamp"
        timestamp last_scanned_at "Last checked timestamp"
    }

    REVIEW {
        integer id PK "Internal surrogate key"
        string source_review_id "Google Play review ID"
        string package_id FK "References APP(package_id)"
        integer rating "User star rating (1-5)"
        text text "Review comment text"
        integer thumbs_up "Helpful vote count"
        timestamp review_created_at "User submission time"
        timestamp collected_at "Collector ingest timestamp"
        string sentiment "positive | neutral | negative"
        json complaint_themes "List of detected financial complaint themes"
    }

    EVIDENCE {
        integer id PK "Internal surrogate key"
        string package_id FK "References APP(package_id)"
        string source_url "Public URL of evidence"
        string source_title "Article, gazette, or page title"
        string source_type "regulator | legal_registry | journalism | app_store | user_report"
        string claim_supported "Specific factual claim or finding"
        text excerpt "Verbatim cited excerpt or summary"
        float reliability_score "Provenance weight 0.0 to 1.0"
        string content_hash "SHA256(package_id + source_url + claim)"
        timestamp publication_date "Original document publication date"
        timestamp access_timestamp "Collector retrieval timestamp"
    }

    RISK_ASSESSMENT {
        integer id PK "Internal surrogate key"
        string package_id FK "References APP(package_id)"
        float overall_score "0.0 to 100.0 risk score"
        string risk_category "Lower concern | Caution | High concern | Insufficient evidence"
        float confidence_score "0.0 to 1.0 evidence sufficiency"
        string confidence_level "High | Medium | Low | Insufficient"
        json score_breakdown "Weights, rule contributions, mitigations"
        json negative_indicators "Structured list of triggered risk findings"
        json positive_indicators "Structured list of safety factors"
        json complaint_theme_distribution "Counts per complaint theme"
        text evidence_sufficiency_rationale "Reasoning behind confidence level"
        timestamp assessment_timestamp "Time of heuristic computation"
        string engine_version "Version of scoring ruleset e.g. v1.0.0"
    }

    SCAN_RUN {
        integer id PK "Internal surrogate key"
        string scan_uuid "UUID4 run identifier"
        timestamp started_at "Scan job start timestamp"
        timestamp completed_at "Scan job completion timestamp"
        string status "running | completed | partial | failed"
        string trigger_type "manual_cli | admin_api | scheduled"
        json queries_attempted "Search queries executed"
        integer apps_discovered_count "Total candidate packages found"
        integer apps_collected_count "Packages successfully ingested"
        integer apps_failed_count "Packages encountering collection errors"
        json error_summary "List of per-source failure details"
        string collector_version "Version of collector codebase"
    }
```

---

## 2. Table Specifications & Constraints

### `apps`
- **Primary Key:** `package_id` (`VARCHAR(255)`). Stable, unique identifier across all Android applications.
- **Indexes:**
  - `ix_apps_package_id` (Unique index on PK)
  - `ix_apps_title` (B-Tree for search queries)
  - `ix_apps_developer` (B-Tree for developer aggregation)
  - `ix_apps_developer_id` (B-Tree for multi-app developer lookups)
  - `ix_apps_category` (B-Tree for category filtering)
  - `ix_apps_rating` (B-Tree for rating range filtering)
  - `ix_apps_last_scanned` (B-Tree for staleness detection)
- **Constraints:** `rating >= 0.0 AND rating <= 5.0`, `rating_count >= 0`.

### `reviews`
- **Primary Key:** `id` (`INTEGER`, autoincrement).
- **Foreign Key:** `package_id` references `apps.package_id` with `ON DELETE CASCADE`.
- **Indexes:**
  - `ix_reviews_package_id` (Foreign key index)
  - `ix_reviews_package_rating` (`package_id`, `rating`) composite index for quick filtering of 1-star vs 5-star reviews.
  - `ix_reviews_source_review_id` (Lookup by upstream review ID).
- **Privacy Minimization:** Reviewer names, email addresses, and profile avatar images are strictly discarded prior to persistence.

### `evidence`
- **Primary Key:** `id` (`INTEGER`, autoincrement).
- **Foreign Key:** `package_id` references `apps.package_id` with `ON DELETE CASCADE`.
- **Unique Constraint:** `uq_app_evidence_hash` (`package_id`, `content_hash`). Prevents duplicate citations of identical evidence while allowing re-scans.
- **Indexes:**
  - `ix_evidence_package_id`
  - `ix_evidence_source_type` (`regulator`, `journalism`, etc.)
  - `ix_evidence_content_hash`

### `risk_assessments`
- **Primary Key:** `id` (`INTEGER`, autoincrement).
- **Foreign Key:** `package_id` references `apps.package_id` with `ON DELETE CASCADE`.
- **Indexes:**
  - `ix_risk_assessments_package_id`
  - `ix_risk_assessments_category` (`High concern`, `Caution`, etc.)
  - `ix_risk_assessments_timestamp` (Ordering by latest assessment)
- **Data Integrity:** Historical assessments are preserved immutably. Re-scoring an app creates a new row with the current timestamp and engine version, providing an audit trail.

### `scan_runs`
- **Primary Key:** `id` (`INTEGER`, autoincrement).
- **Unique Constraint:** `scan_uuid` (`VARCHAR(64)`).
- **Indexes:**
  - `ix_scan_runs_status`
  - `ix_scan_runs_started_at`

---

## 3. Database Migration Strategy (Alembic)

Database schema evolution is managed with Alembic.
- **Dual Support:** The schema definitions in `backend/app/db/models.py` use standard SQLAlchemy 2.0 constructs compatible with both PostgreSQL in production and SQLite for local development and CI testing.
- **Async Execution:** FastAPI uses `create_async_engine` (`asyncpg` for PostgreSQL, `aiosqlite` for SQLite).
- **Migration Commands:**
  ```bash
  # Generate migration after model changes
  alembic revision --autogenerate -m "description_of_changes"

  # Apply all pending migrations
  alembic upgrade head

  # Rollback one migration
  alembic downgrade -1
  ```
