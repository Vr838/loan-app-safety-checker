"""Responsible, rate-limited Google Play Store discovery, metadata, and review collector."""

import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from google_play_scraper import Sort, app as fetch_app_details, reviews as fetch_reviews, search as search_apps
from app.core.config import settings

logger = logging.getLogger(__name__)

DEFAULT_LOAN_QUERIES = [
    "instant personal loan",
    "quick cash loan",
    "instant credit line",
]


class PlayStoreCollector:
    """Bounded, rate-limited collector for public Google Play Store apps and reviews."""

    def __init__(
        self,
        max_apps_per_query: Optional[int] = None,
        max_reviews_per_app: Optional[int] = None,
        delay_seconds: Optional[float] = None,
        country: str = "in",
        language: str = "en",
    ):
        self.max_apps_per_query = max_apps_per_query or settings.MAX_APPS_PER_QUERY
        self.max_reviews_per_app = max_reviews_per_app or settings.MAX_REVIEWS_PER_APP
        self.delay_seconds = delay_seconds or settings.REQUEST_DELAY_SECONDS
        self.country = country
        self.language = language

    async def _throttle(self) -> None:
        """Applies configured delay with jitter to prevent burst requests."""
        jitter = random.uniform(0.5, 1.5)
        sleep_time = self.delay_seconds * jitter
        await asyncio.sleep(sleep_time)

    async def discover_apps(self, queries: Optional[List[str]] = None) -> List[str]:
        """Discovers candidate loan app package IDs across multiple search queries.

        Deduplicates package IDs while preserving order.
        """
        search_terms = queries or DEFAULT_LOAN_QUERIES
        discovered_packages: List[str] = []
        seen = set()

        for query in search_terms:
            logger.info("Discovering apps for query: '%s'", query)
            try:
                await self._throttle()
                # Run search synchronously in thread pool to prevent blocking asyncio loop
                results = await asyncio.to_thread(
                    search_apps,
                    query,
                    n_hits=self.max_apps_per_query,
                    lang=self.language,
                    country=self.country,
                )
                for item in results:
                    app_id = item.get("appId")
                    if app_id and app_id not in seen:
                        seen.add(app_id)
                        discovered_packages.append(app_id)
            except Exception as e:
                logger.error("Error executing search for query '%s': %s", query, str(e))

        logger.info("Discovered %d unique candidate package IDs", len(discovered_packages))
        return discovered_packages

    async def get_app_details(self, package_id: str) -> Optional[Dict[str, Any]]:
        """Fetches normalized metadata for a specific app package."""
        await self._throttle()
        try:
            raw = await asyncio.to_thread(
                fetch_app_details,
                package_id,
                lang=self.language,
                country=self.country,
            )

            # Normalization into our schema format
            installs_text = str(raw.get("installs", "0+"))
            installs_numeric = int(raw.get("minInstalls", 0) or 0)

            app_data = {
                "package_id": package_id,
                "title": raw.get("title", "Unknown Title"),
                "developer": raw.get("developer", "Unknown Developer"),
                "developer_id": str(raw.get("developerId") or ""),
                "developer_email": raw.get("developerEmail"),
                "developer_website": raw.get("developerWebsite"),
                "developer_address": raw.get("developerAddress"),
                "category": raw.get("genreId", "FINANCE"),
                "rating": float(raw.get("score") or 0.0),
                "rating_count": int(raw.get("ratings") or 0),
                "installs_text": installs_text,
                "installs_approx": installs_numeric,
                "privacy_policy_url": raw.get("privacyPolicy"),
                "store_url": raw.get("url") or f"https://play.google.com/store/apps/details?id={package_id}",
                "icon_url": raw.get("icon"),
                "summary": raw.get("summary") or raw.get("description", "")[:500],
            }
            return app_data
        except Exception as e:
            logger.warning("Failed to fetch details for package '%s': %s", package_id, str(e))
            return None

    async def get_app_reviews(self, package_id: str) -> List[Dict[str, Any]]:
        """Fetches a bounded, anonymized sample of user reviews for analysis.

        Strictly strips reviewer names, emails, and personal avatars to minimize personal data.
        """
        await self._throttle()
        try:
            result, _ = await asyncio.to_thread(
                fetch_reviews,
                package_id,
                lang=self.language,
                country=self.country,
                sort=Sort.NEWEST,
                count=self.max_reviews_per_app,
            )

            anonymized_reviews = []
            for r in result:
                review_at = r.get("at")
                if isinstance(review_at, datetime):
                    if review_at.tzinfo is None:
                        review_at = review_at.replace(tzinfo=timezone.utc)
                else:
                    review_at = None

                anonymized_reviews.append({
                    "source_review_id": str(r.get("reviewId") or ""),
                    "package_id": package_id,
                    "rating": int(r.get("score") or 1),
                    "text": str(r.get("content") or "").strip(),
                    "thumbs_up": int(r.get("thumbsUpCount") or 0),
                    "review_created_at": review_at,
                })
            return anonymized_reviews
        except Exception as e:
            logger.warning("Failed to fetch reviews for package '%s': %s", package_id, str(e))
            return []
