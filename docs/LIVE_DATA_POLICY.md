# Live Data Policy

The application does not ship applications, reviews, assessments, lender matches, or regulatory warnings. An empty catalog means that no live scan has completed yet.

Each scan collects public Google Play metadata and a bounded, anonymized review sample at scan time. The risk engine derives its score from that scan's metadata and detected review themes.

External evidence is disabled by default. When a live search provider is configured, the dashboard stores the returned source URL and excerpt as provenance. Search results are not treated as regulatory findings and do not grant a lender a verified status.

Use the protected scan endpoint or `scripts/run_scan.py` to populate the catalog. Review results remain heuristic research aids, not legal or regulatory determinations.
