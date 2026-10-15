#!/usr/bin/env python3
"""CLI utility to execute a bounded, rate-limited collection and risk assessment scan."""

import argparse
import asyncio
import os
import sys

# Ensure backend is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.db.session import AsyncSessionLocal, async_engine, Base
from app.services.scans import ScanService


async def main():
    parser = argparse.ArgumentParser(description="Run bounded loan app discovery and safety scan.")
    parser.add_argument(
        "--query",
        action="append",
        dest="queries",
        help="Search query to run (can be specified multiple times). Defaults to standard loan queries.",
    )
    parser.add_argument(
        "--max-apps",
        type=int,
        default=5,
        help="Maximum apps to discover per query (bounded to prevent rate limits). Default: 5",
    )
    parser.add_argument(
        "--max-reviews",
        type=int,
        default=30,
        help="Maximum user reviews to sample per app. Default: 30",
    )

    args = parser.parse_args()

    print("Initializing database tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print(f"Launching bounded scan (max {args.max_apps} apps/query, max {args.max_reviews} reviews/app)...")
    async with AsyncSessionLocal() as session:
        service = ScanService(session)
        scan_run = await service.execute_scan(
            queries=args.queries,
            max_apps_per_query=args.max_apps,
            max_reviews_per_app=args.max_reviews,
            trigger_type="manual_cli",
        )

        print("\nScan Completed!")
        print(f"Status: {scan_run.status.upper()}")
        print(f"Discovered Packages: {scan_run.apps_discovered_count}")
        print(f"Successfully Analyzed: {scan_run.apps_collected_count}")
        print(f"Failed / Unavailable: {scan_run.apps_failed_count}")
        if scan_run.error_summary:
            print("\nErrors encountered:")
            for err in scan_run.error_summary:
                print(f"  - {err.get('package_id')}: {err.get('error')}")

    await async_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
