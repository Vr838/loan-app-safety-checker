"""Scan orchestration service coordinating discovery, collection, analysis, and persistence."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from app.db.models import App, Review, Evidence, RiskAssessment, ScanRun
from app.collectors.play_store import PlayStoreCollector, DEFAULT_LOAN_QUERIES
from app.collectors.external_evidence import ExternalEvidenceCollector
from app.analysis.reviews import ReviewAnalyzer
from app.analysis.risk import RiskEngine

logger = logging.getLogger(__name__)


class ScanService:
    """Coordinates a bounded, rate-limited scan run across collectors and the risk engine."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.play_store = PlayStoreCollector()
        self.evidence_collector = ExternalEvidenceCollector()
        self.analyzer = ReviewAnalyzer()
        self.risk_engine = RiskEngine()

    async def execute_scan(
        self,
        queries: Optional[List[str]] = None,
        max_apps_per_query: int = 5,
        max_reviews_per_app: int = 30,
        trigger_type: str = "manual_cli",
    ) -> ScanRun:
        """Executes a bounded, resilient scan run and records complete audit metrics."""
        scan_uuid = str(uuid.uuid4())
        search_terms = queries or DEFAULT_LOAN_QUERIES
        now = datetime.now(timezone.utc)

        scan_run = ScanRun(
            scan_uuid=scan_uuid,
            started_at=now,
            status="running",
            trigger_type=trigger_type,
            queries_attempted=search_terms,
            apps_discovered_count=0,
            apps_collected_count=0,
            apps_failed_count=0,
            error_summary=[],
            collector_version="1.0.0",
        )
        self.session.add(scan_run)
        await self.session.commit()
        await self.session.refresh(scan_run)
        scan_run_id = scan_run.id

        # 1. Discovery Phase
        self.play_store.max_apps_per_query = max_apps_per_query
        self.play_store.max_reviews_per_app = max_reviews_per_app

        discovered_package_ids = await self.play_store.discover_apps(search_terms)
        scan_run.apps_discovered_count = len(discovered_package_ids)
        await self.session.commit()

        collected_count = 0
        new_app_count = 0
        refreshed_app_count = 0
        failed_count = 0
        errors: List[Dict[str, Any]] = []

        # 2. Collection & Analysis Phase
        for pkg_id in discovered_package_ids:
            try:
                # App Metadata
                details = await self.play_store.get_app_details(pkg_id)
                if not details:
                    failed_count += 1
                    errors.append({"package_id": pkg_id, "error": "Failed to fetch metadata (404 or block)"})
                    continue

                # User Reviews Sample
                raw_reviews = await self.play_store.get_app_reviews(pkg_id)
                analyzed_reviews = []
                for r in raw_reviews:
                    sentiment, themes = self.analyzer.classify_review(r["text"], r["rating"])
                    r["sentiment"] = sentiment
                    r["complaint_themes"] = themes
                    analyzed_reviews.append(r)

                # Review Anomalies
                anomalies = self.analyzer.detect_anomalies(analyzed_reviews)

                # External Regulatory & Reporting Evidence
                evidence_items = await self.evidence_collector.gather_evidence(
                    package_id=pkg_id,
                    developer_name=details["developer"],
                    app_title=details["title"],
                )

                # Deterministic Risk Engine Assessment
                assessment_data = self.risk_engine.compute_assessment(
                    app_data=details,
                    reviews=analyzed_reviews,
                    evidence_items=evidence_items,
                    anomalies=anomalies,
                )

                # 3. Persistence & Upsert Phase
                existing_app = await self.session.scalar(select(App).where(App.package_id == pkg_id))
                if existing_app:
                    refreshed_app_count += 1
                    existing_app.title = details["title"]
                    existing_app.developer = details["developer"]
                    existing_app.developer_id = details["developer_id"]
                    existing_app.developer_email = details["developer_email"]
                    existing_app.developer_website = details["developer_website"]
                    existing_app.developer_address = details["developer_address"]
                    existing_app.category = details["category"]
                    existing_app.rating = details["rating"]
                    existing_app.rating_count = details["rating_count"]
                    existing_app.installs_text = details["installs_text"]
                    existing_app.installs_approx = details["installs_approx"]
                    existing_app.privacy_policy_url = details["privacy_policy_url"]
                    existing_app.store_url = details["store_url"]
                    existing_app.icon_url = details["icon_url"]
                    existing_app.summary = details["summary"]
                    existing_app.last_scanned_at = datetime.now(timezone.utc)
                    app_record = existing_app
                else:
                    new_app_count += 1
                    app_record = App(
                        package_id=pkg_id,
                        title=details["title"],
                        developer=details["developer"],
                        developer_id=details["developer_id"],
                        developer_email=details["developer_email"],
                        developer_website=details["developer_website"],
                        developer_address=details["developer_address"],
                        category=details["category"],
                        rating=details["rating"],
                        rating_count=details["rating_count"],
                        installs_text=details["installs_text"],
                        installs_approx=details["installs_approx"],
                        privacy_policy_url=details["privacy_policy_url"],
                        store_url=details["store_url"],
                        icon_url=details["icon_url"],
                        summary=details["summary"],
                        first_discovered_at=datetime.now(timezone.utc),
                        last_scanned_at=datetime.now(timezone.utc),
                    )
                    self.session.add(app_record)

                await self.session.flush()

                # Keep only the current public review sample. This prevents a
                # repeated scan from silently inflating stored review data.
                await self.session.execute(delete(Review).where(Review.package_id == pkg_id))
                for rev in analyzed_reviews:
                    rev_obj = Review(
                        source_review_id=rev.get("source_review_id"),
                        package_id=pkg_id,
                        rating=rev["rating"],
                        text=rev["text"],
                        thumbs_up=rev["thumbs_up"],
                        review_created_at=rev.get("review_created_at"),
                        collected_at=datetime.now(timezone.utc),
                        sentiment=rev["sentiment"],
                        complaint_themes=rev["complaint_themes"],
                    )
                    self.session.add(rev_obj)

                # Add evidence (upsert by hash)
                for ev in evidence_items:
                    ev_hash = ev["content_hash"]
                    existing_ev = await self.session.scalar(
                        select(Evidence).where(
                            Evidence.package_id == pkg_id,
                            Evidence.content_hash == ev_hash,
                        )
                    )
                    if not existing_ev:
                        ev_obj = Evidence(
                            package_id=pkg_id,
                            source_url=ev["source_url"],
                            source_title=ev["source_title"],
                            source_type=ev["source_type"],
                            claim_supported=ev["claim_supported"],
                            excerpt=ev["excerpt"],
                            reliability_score=ev["reliability_score"],
                            content_hash=ev_hash,
                            publication_date=ev["publication_date"],
                            access_timestamp=ev["access_timestamp"],
                        )
                        self.session.add(ev_obj)

                # Add Risk Assessment snapshot
                assessment_obj = RiskAssessment(
                    package_id=pkg_id,
                    overall_score=assessment_data["overall_score"],
                    risk_category=assessment_data["risk_category"],
                    confidence_score=assessment_data["confidence_score"],
                    confidence_level=assessment_data["confidence_level"],
                    score_breakdown=assessment_data["score_breakdown"],
                    negative_indicators=assessment_data["negative_indicators"],
                    positive_indicators=assessment_data["positive_indicators"],
                    complaint_theme_distribution=assessment_data["complaint_theme_distribution"],
                    evidence_sufficiency_rationale=assessment_data["evidence_sufficiency_rationale"],
                    assessment_timestamp=datetime.now(timezone.utc),
                    engine_version=assessment_data["engine_version"],
                )
                self.session.add(assessment_obj)

                collected_count += 1
                scan_run.apps_collected_count = collected_count
                scan_run.apps_new_count = new_app_count
                scan_run.apps_refreshed_count = refreshed_app_count
                scan_run.apps_failed_count = failed_count
                scan_run.error_summary = errors
                await self.session.commit()

            except Exception as e:
                # A database error invalidates the current transaction. Restore a
                # usable session so remaining apps in the scan can still complete.
                await self.session.rollback()
                logger.error("Failed processing package %s: %s", pkg_id, str(e))
                failed_count += 1
                errors.append({"package_id": pkg_id, "error": str(e)})
                scan_run = await self.session.get(ScanRun, scan_run_id)
                if scan_run is not None:
                    scan_run.apps_collected_count = collected_count
                    scan_run.apps_new_count = new_app_count
                    scan_run.apps_refreshed_count = refreshed_app_count
                    scan_run.apps_failed_count = failed_count
                    scan_run.error_summary = errors
                    await self.session.commit()

        # 4. Finalize Scan Run Status
        # The scan row may have been expired by a rollback in a failed item.
        scan_run = await self.session.get(ScanRun, scan_run_id)
        if scan_run is None:
            raise RuntimeError("Scan run disappeared before completion.")

        scan_run.completed_at = datetime.now(timezone.utc)
        scan_run.apps_collected_count = collected_count
        scan_run.apps_new_count = new_app_count
        scan_run.apps_refreshed_count = refreshed_app_count
        scan_run.apps_failed_count = failed_count
        scan_run.error_summary = errors

        if collected_count == 0:
            scan_run.status = "failed"
            if not errors:
                errors.append({
                    "error": "No Play Store listings were discovered. Check the network connection and try again."
                })
        elif failed_count > 0:
            scan_run.status = "partial"
        else:
            scan_run.status = "completed"

        scan_run.error_summary = errors

        await self.session.commit()
        await self.session.refresh(scan_run)
        return scan_run
