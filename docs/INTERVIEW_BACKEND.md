# Backend Interview Notes

## Responsibility

The FastAPI backend owns data collection, review analysis, risk assessment, persistence, and scan status. The browser never receives database credentials, search keys, or the administrator scan token.

## Request flow

1. The dashboard sends an authenticated request to start a scan.
2. The API rejects a second request while another scan is running.
3. A background task creates the scan record and processes each discovered app.
4. The dashboard polls the latest scan endpoint for status and progress.
5. Each completed app updates the database and the scan counters.
6. The final result is `completed`, `partial`, or `failed`.

## Important routes

| Route | Purpose |
| --- | --- |
| `GET /health` | Confirms the database, collector, and engine are ready. |
| `GET /api/v1/apps` | Lists assessed apps with search, filters, sorting, and pagination. |
| `GET /api/v1/apps/{package_id}` | Returns one app, its assessment history, and source evidence. |
| `GET /api/v1/scans/latest` | Returns current scan state and any failure summary. |
| `POST /api/v1/scans/admin/trigger` | Starts a bounded background scan after token verification. |

## Collector design

The Play Store collector searches loan-related phrases, deduplicates by package ID, fetches listing metadata, and samples recent reviews. It uses bounded limits, retries, and delays to avoid unbounded traffic.

The external evidence collector uses Google News RSS for a small current-news sample. It keeps only links that visibly name the app brand. These are investigation leads, not verified claims.

## Failure handling

- Failed app requests are recorded in `error_summary` and the scan continues.
- Zero discovered or collected apps marks the scan as failed, not completed.
- Repeated scans replace the current stored review sample, avoiding review-count inflation.
- A running scan blocks a second start request with HTTP 409.

## Data protection answer

Only public review text and non-identifying fields are stored. Reviewer names, avatars, and similar profile information are removed before persistence.

## Strong interview answer

"The backend keeps ingestion separate from scoring. A collector produces public source data, the analyzer produces explicit themes, and the risk engine turns those themes into explainable score contributions. That separation makes the result testable and auditable."
