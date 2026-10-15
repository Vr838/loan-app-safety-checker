# Future Cybersecurity Roadmap

## Highest priority improvements

| Improvement | Threat addressed | Proposed approach |
| --- | --- | --- |
| Replace shared token access | A shared token cannot identify who initiated a scan. | Add operator accounts, secure sessions, role based access control, and audit logs. |
| Move scans to workers | In-process jobs can be interrupted by deployment restarts. | Use a queue and dedicated worker with job IDs, retries, cancellation, and durable status. |
| Add API rate limiting | A valid token could still submit too many requests. | Apply limits by account, IP, and endpoint with a defined retry response. |
| Add secret rotation | A leaked token remains valid until manually replaced. | Store secrets in a managed vault and support short lived credentials. |
| Add security headers | Browsers need stronger protection against injected content. | Configure CSP, HSTS, frame restrictions, referrer policy, and `nosniff` headers. |
| Add audit events | Investigations need a reliable activity record. | Log scan requested, started, completed, failed, and configuration changes without secrets. |

## Application security enhancements

1. Add a Content Security Policy that restricts scripts, styles, images, and network connections to known origins.
2. Add CSRF protection if cookie based authentication is introduced.
3. Run dependency monitoring, SAST, and secret scanning in pull requests.
4. Use least privilege database accounts, encrypted backups, encrypted transport, and restore tests.
5. Send redacted logs to a protected logging service with retention and alert rules.
6. Alert on unusual scan frequency, repeated failed authorization, or source error spikes.

## Collector security enhancements

1. Allow only approved source domains and use timeouts, response size limits, and redirect limits.
2. Isolate future APK analysis in a disposable sandbox with no production database credentials.
3. Validate downloaded content types before parsing and retain only the minimum evidence needed.
4. Add per source circuit breakers so a failing source cannot delay the whole scan.
5. Record collection version and timestamp so evidence can be reproduced and reviewed.

## Incident response plan

1. Detect suspicious activity through authorization, error, and scan volume alerts.
2. Contain it by disabling affected tokens or queue workers.
3. Preserve relevant redacted logs and scan metadata.
4. Rotate compromised secrets and patch the root cause.
5. Review impact, update controls, and document the resolution.

## Recommended implementation order

1. Deploy production CORS and security headers.
2. Replace the shared token with authenticated operator accounts and audit logs.
3. Move scans to a durable queue worker.
4. Add rate limiting, monitoring, dependency scanning, and alerting.
5. Isolate APK analysis before introducing binary inspection.
