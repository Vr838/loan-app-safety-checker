# REST API Reference & Specification

The Loan App Safety Checker backend provides a typed REST API built with FastAPI and validated using Pydantic v2.

**Base URL:** `/api/v1`  
**OpenAPI Interactive Docs:** `http://localhost:8000/docs`  
**ReDoc Specification:** `http://localhost:8000/redoc`

---

## 1. Authentication & Security

- **Public Endpoints:** Read endpoints (`GET /apps`, `GET /apps/{package_id}`, `GET /scans/latest`, `GET /health`) are public and do not require credentials.
- **Administrative Endpoints:** Triggering scan jobs (`POST /api/v1/scans/admin/trigger`) requires an HTTP Bearer authorization token:
  ```http
  Authorization: Bearer <ADMIN_API_TOKEN>
  ```
- **Error Responses for Auth Failures:**
  ```json
  {
    "detail": "Invalid administrative authorization token."
  }
  ```
  Status Code: `401 Unauthorized`

---

## 2. Endpoints Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | System health, database connection, and collector state | No |
| `GET` | `/api/v1/apps` | Paginated app list with search, category filtering, and sorting | No |
| `GET` | `/api/v1/apps/{package_id}` | Detailed app profile, latest score breakdown, and evidence | No |
| `GET` | `/api/v1/apps/{package_id}/evidence` | List of all verifiable external evidence items for an app | No |
| `GET` | `/api/v1/apps/{package_id}/history` | Historical risk assessment snapshots for trend analysis | No |
| `GET` | `/api/v1/scans/latest` | Most recent scan run metrics, queries, and error accounting | No |
| `POST`| `/api/v1/scans/admin/trigger` | Launches an authorized background scan job with bounded budget | **Yes (Bearer)** |

---

## 3. Endpoint Specifications

### 3.1 Health Check
`GET /health`

**Response Example (200 OK):**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "environment": "development",
  "database_connected": true,
  "collector_ready": true,
  "components": {
    "database": "connected",
    "risk_engine": "active (v1.1.0)",
    "external_search": "disabled"
  }
}
```

---

### 3.2 List Apps
`GET /api/v1/apps`

**Query Parameters:**
- `q` (string, optional): Search keyword across `title`, `package_id`, or `developer`.
- `risk_category` (string, optional): Filter by `Lower concern`, `Caution`, `High concern`, `Insufficient evidence`.
- `min_rating` (float, optional): Minimum store rating (0.0 to 5.0).
- `sort_by` (string, optional, default: `"risk_desc"`):
  - `risk_desc`: Highest risk first
  - `risk_asc`: Lowest risk first
  - `rating_desc`: Highest rating first
  - `rating_asc`: Lowest rating first
  - `name_asc`: Alphabetical by title
  - `last_scanned`: Most recently scanned first
- `page` (integer, default: 1): Page number.
- `page_size` (integer, default: 10, max: 100): Items per page.

**Response Example (200 OK):**
```json
{
  "items": [
    {
      "package_id": "com.speedyloan.instantcredit",
      "title": "Speedy Rupee - Instant Quick Cash",
      "developer": "Apex Cloud Fintech Holdings Ltd",
      "category": "FINANCE",
      "rating": 3.1,
      "rating_count": 1420,
      "installs_text": "50,000+",
      "installs_approx": 50000,
      "privacy_policy_url": "http://speedyrupee.blogspot.com/p/privacy.html",
      "store_url": "https://play.google.com/store/apps/details?id=com.speedyloan.instantcredit",
      "icon_url": "https://play-lh.googleusercontent.com/speedy_mock_icon.png",
      "is_active": true,
      "first_discovered_at": "2024-10-01T12:00:00Z",
      "last_scanned_at": "2024-10-15T10:00:00Z",
      "latest_assessment": {
        "id": 12,
        "package_id": "com.speedyloan.instantcredit",
        "overall_score": 88.0,
        "risk_category": "High concern",
        "confidence_score": 0.74,
        "confidence_level": "High",
        "complaint_theme_distribution": {
          "harassment_threats": 8,
          "privacy_contact_abuse": 6,
          "short_cycle_extortion": 7
        },
        "evidence_sufficiency_rationale": "Severe composite risk signals present...",
        "assessment_timestamp": "2024-10-15T10:00:00Z",
        "engine_version": "v1.1.0"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1
}
```

---

### 3.3 App Profile & Detailed Assessment
`GET /api/v1/apps/{package_id}`

**Response Example (200 OK):**
```json
{
  "package_id": "com.speedyloan.instantcredit",
  "title": "Speedy Rupee - Instant Quick Cash",
  "developer": "Apex Cloud Fintech Holdings Ltd",
  "developer_email": "apexsupport2023@gmail.com",
  "developer_website": null,
  "developer_address": "Suite 401, Grand Cayman, Cayman Islands",
  "category": "FINANCE",
  "rating": 3.1,
  "rating_count": 1420,
  "installs_text": "50,000+",
  "installs_approx": 50000,
  "privacy_policy_url": "http://speedyrupee.blogspot.com/p/privacy.html",
  "store_url": "https://play.google.com/store/apps/details?id=com.speedyloan.instantcredit",
  "icon_url": "https://play-lh.googleusercontent.com/speedy_mock_icon.png",
  "summary": "Get cash in 5 minutes! No paperwork needed...",
  "is_active": true,
  "first_discovered_at": "2024-10-01T12:00:00Z",
  "last_scanned_at": "2024-10-15T10:00:00Z",
  "latest_assessment": {
    "overall_score": 88.0,
    "risk_category": "High concern",
    "confidence_score": 0.74,
    "confidence_level": "High",
    "negative_indicators": [
      {
        "rule_id": "HARASS_01",
        "category": "Conduct & Collection",
        "finding": "8 user reviews report abusive collection calls and threats.",
        "impact": "negative",
        "weight": 30.0,
        "contribution": 30.0,
        "source": "Google Play Reviews",
        "source_url": "https://play.google.com/store/apps/details?id=com.speedyloan.instantcredit",
        "citation_excerpt": "Reviewers allege collection agents sent abusive WhatsApp messages..."
      }
    ],
    "positive_indicators": [],
    "score_breakdown": {
      "HARASS_01": {"weight": 30.0, "contribution": 30.0}
    },
    "evidence_sufficiency_rationale": "Severe composite risk signals present..."
  },
  "evidence_items": [
    {
      "id": 4,
      "package_id": "com.speedyloan.instantcredit",
      "source_url": "https://cybercrime.gov.in/advisories/unauthorized_lending_apps",
      "source_title": "State Cyber Cell Advisory on Unregulated Digital Lending",
      "source_type": "regulator",
      "claim_supported": "Named in public cautionary advisory...",
      "excerpt": "Borrowers advised against transacting with unregistered digital lending applications...",
      "reliability_score": 0.90,
      "content_hash": "a1b2c3d4...",
      "access_timestamp": "2024-10-15T10:00:00Z"
    }
  ],
  "recent_assessments": []
}
```

**Error Response (404 Not Found):**
```json
{
  "detail": "Application with package ID 'com.nonexistent.app' not found in registry."
}
```

---

### 3.4 Scan Status & Latest Run
`GET /api/v1/scans/latest`

**Response Example (200 OK):**
```json
{
  "id": 1,
  "scan_uuid": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "started_at": "2024-10-15T08:00:00Z",
  "completed_at": "2024-10-15T08:05:00Z",
  "status": "completed",
  "trigger_type": "manual_cli",
  "queries_attempted": [
    "instant personal loan",
    "quick cash loan",
    "instant credit line"
  ],
  "apps_discovered_count": 4,
  "apps_collected_count": 4,
  "apps_failed_count": 0,
  "error_summary": [],
  "collector_version": "1.0.0"
}
```

---

### 3.5 Authorized Admin Scan Trigger
`POST /api/v1/scans/admin/trigger`

**Headers:**
```http
Authorization: Bearer <ADMIN_API_TOKEN>
Content-Type: application/json
```

**Request Body (Optional overrides):**
```json
{
  "queries": ["instant personal loan", "quick cash loan"],
  "max_apps_per_query": 5,
  "max_reviews_per_app": 30
}
```

**Response Example (202 Accepted):**
```json
{
  "message": "Scan execution accepted and launched in background.",
  "status": "accepted",
  "budget": {
    "max_apps_per_query": 5,
    "max_reviews_per_app": 30
  }
}
```
