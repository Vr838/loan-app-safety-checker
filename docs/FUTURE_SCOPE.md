# Future Scope and Feature Roadmap

This roadmap keeps the project useful for research while preserving transparent evidence and bounded collection.

## Better research coverage

| Feature | User value | Implementation direction |
| --- | --- | --- |
| Configurable search packs | Include salary advances, BNPL, credit lines, and regional loan wording. | Store named query packs and show which pack produced each discovery. |
| Official regulator evidence | Compare lenders and partners with verified public records. | Import reviewed official datasets with source date, version, and provenance. |
| Complaint source connectors | Add selected consumer forums and reputable journalism. | Use source specific collectors with rate limits and citation retention. |
| Multi-language review analysis | Improve coverage for Hindi, Hinglish, and regional languages. | Add language detection, reviewed lexicons, and an evaluation set. |
| Scheduled scans | Keep results current without manual action. | Run authenticated jobs through a worker and scheduler with an execution history. |

## Product features

| Feature | User value | Implementation direction |
| --- | --- | --- |
| Scan history | Compare one run with another. | Save scan parameters, per app changes, and a results summary. |
| App comparison | Compare several loan apps side by side. | Add a comparison view for scores, themes, sources, and confidence. |
| Change alerts | Surface a significant score, developer, review, or evidence change. | Calculate diffs after each scan and allow dashboard or email alerts. |
| Evidence timeline | See when review trends and reports appeared. | Plot dated assessment snapshots and cited evidence. |
| Exportable report | Share a clear assessment with sources and caveats. | Generate CSV and PDF reports with methodology and citations. |
| Correction flow | Let researchers submit a factual correction. | Add a moderated form with provenance requirements and audit history. |

## Reliability and scale

1. Use queue based workers so long scans do not affect API responsiveness.
2. Use managed PostgreSQL, backups, and connection pooling in production.
3. Add structured logs, source success metrics, and alert thresholds.
4. Add retention rules and deletion jobs for collected public content.

## Recommended next feature

Build **scan history and change alerts** next. They show why a live result changed and make the data more useful over time.
