# Cybersecurity Aspects

## Security objectives

The system protects the scan trigger, collected public data, and the research service from source failures or untrusted content.

## Current controls

| Area | Current control | Security benefit |
| --- | --- | --- |
| Scan authorization | The admin scan endpoint requires a Bearer token. | Prevents unauthenticated visitors from starting expensive scans. |
| Token comparison | The backend uses constant time comparison. | Reduces timing information leakage during token validation. |
| Request validation | FastAPI and Pydantic validate incoming scan values and limits. | Rejects malformed and out of range inputs before collection starts. |
| Bounded collection | App, review, and news collection are capped. | Reduces denial of service risk and pressure on upstream services. |
| Rate controls | The collector uses delay, jitter, and controlled retries. | Avoids request bursts and reduces source bans. |
| Secret separation | Database URLs, tokens, and provider credentials stay in backend environment variables. | Prevents secrets from reaching the browser bundle. |
| CORS configuration | Backend origins are configured explicitly. | Limits which browser origins can call the API. |
| Untrusted content | Reviews and external pages are processed as plain data. | Prevents scraped text from being executed as code or instructions. |
| Privacy minimization | Reviewer names, email addresses, and avatars are removed before storage. | Reduces unnecessary personal data retention. |
| Evidence provenance | Evidence stores source URLs and content hashes. | Supports traceability and removes duplicate records. |
| Restart recovery | Interrupted scans become failed at application startup. | Stops stale jobs from blocking future scans. |

## Threats considered

### Unauthorized or excessive scans

Bearer authorization, one active scan at a time, bounded inputs, and collection throttling reduce resource exhaustion and upstream blocking risks.

### Secret exposure

A public frontend must not contain backend API keys, database credentials, or a production admin token. Only `NEXT_PUBLIC_API_BASE_URL` is intended to be visible in browser configuration.

### Untrusted content

Reviews, descriptions, and news pages can contain malicious links or false statements. The product presents them as cited evidence and does not execute scraped content.

### Data quality attacks

Coordinated fake reviews can distort analysis. The risk engine separates confidence from score and records anomaly signals, but high impact conclusions still need human review.

## Deployment checklist

1. Set a long random `ADMIN_API_TOKEN` in the hosting provider's secret manager.
2. Set a specific HTTPS frontend origin in CORS configuration.
3. Use HTTPS for frontend, API, and database connections.
4. Use managed PostgreSQL with backups for production.
5. Keep dependencies updated and run dependency scanning.
6. Store structured logs without tokens, database URLs, or raw personal data.
7. Limit scan access to trusted operators until account based roles are implemented.
