"""External evidence collector and regulatory registry adapter."""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, unquote, urlparse

import httpx
from bs4 import BeautifulSoup

from app.core.config import settings

logger = logging.getLogger(__name__)

def compute_content_hash(package_id: str, source_url: Optional[str], claim: str) -> str:
    """Computes a deterministic SHA256 hash for deduplicating evidence."""
    raw = f"{package_id}:::{source_url or 'no_url'}:::{claim}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


class ExternalEvidenceCollector:
    """Retrieves corroborating regulatory and web evidence for an app."""

    def __init__(self, provider: Optional[str] = None, api_key: Optional[str] = None):
        self.provider = provider or settings.EXTERNAL_SEARCH_PROVIDER
        self.api_key = api_key or settings.SEARCH_API_KEY

    async def gather_evidence(
        self,
        package_id: str,
        developer_name: str,
        app_title: str,
    ) -> List[Dict[str, Any]]:
        """Gathers verifiable evidence from regulatory databases and configured search providers."""
        evidence_list: List[Dict[str, Any]] = []
        # There is no bundled lender registry or caution list because it cannot
        # stay current. Search results are stored as unverified provenance only.
        if self.provider == "serpapi" and self.api_key:
            web_results = await self._query_serpapi(package_id, app_title)
            evidence_list.extend(web_results)
        elif self.provider == "google_news":
            web_results = await self._query_google_news(package_id, developer_name, app_title)
            evidence_list.extend(web_results)
        elif self.provider == "duckduckgo":
            web_results = await self._query_duckduckgo(package_id, developer_name, app_title)
            evidence_list.extend(web_results)
        else:
            logger.info(
                "External evidence collection is disabled for provider '%s'; live Play Store data remains available.",
                self.provider,
            )

        return evidence_list

    async def _query_google_news(
        self,
        package_id: str,
        developer_name: str,
        app_title: str,
    ) -> List[Dict[str, Any]]:
        """Collect a short current-news sample from Google's public RSS feed."""
        # Store titles often append a feature tagline (for example, "Home
        # Credit: Personal Loan App"). Search the stable brand portion so the
        # feed can return relevant reporting instead of an empty exact match.
        search_name = app_title.split(":", maxsplit=1)[0].split(" - ", maxsplit=1)[0].strip()
        query = f'"{search_name}" loan complaints'
        try:
            async with httpx.AsyncClient(
                timeout=10.0,
                follow_redirects=True,
                headers={"User-Agent": "LoanAppSafetyChecker/1.1 research bot"},
            ) as client:
                response = await client.get(
                    "https://news.google.com/rss/search",
                    params={"q": query, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"},
                )
                response.raise_for_status()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Error querying Google News RSS: %s", exc)
            return []

        return self._parse_google_news_results(package_id, app_title, response.text)

    @staticmethod
    def _parse_google_news_results(package_id: str, app_title: str, xml: str) -> List[Dict[str, Any]]:
        """Turn a Google News RSS response into bounded, linkable provenance."""
        try:
            soup = BeautifulSoup(xml, "xml")
        except Exception:
            soup = BeautifulSoup(xml, "html.parser")
        now = datetime.now(timezone.utc)
        results: List[Dict[str, Any]] = []
        brand = app_title.split(":", maxsplit=1)[0].split(" - ", maxsplit=1)[0].strip().lower()

        for item in soup.find_all("item"):
            title_node = item.find("title")
            link_node = item.find("link")
            if not title_node or not link_node:
                continue

            title = title_node.get_text(" ", strip=True)
            source_url = link_node.get_text(strip=True)
            description_node = item.find("description")
            snippet = description_node.get_text(" ", strip=True) if description_node else ""
            source_node = item.find("source")
            source_name = source_node.get_text(" ", strip=True) if source_node else "Google News"
            # Search engines occasionally return broad loan-industry coverage.
            # Keep a result only if its visible text names the app brand.
            if not title or not source_url or (brand and brand not in f"{title} {snippet}".lower()):
                continue

            claim = f"Public news result related to {app_title}; requires human corroboration."
            results.append({
                "package_id": package_id,
                "source_url": source_url,
                "source_title": f"{title} - {source_name}",
                "source_type": "news_search_result",
                "claim_supported": claim,
                "excerpt": snippet,
                "reliability_score": 0.0,
                "content_hash": compute_content_hash(package_id, source_url, claim),
                "publication_date": None,
                "access_timestamp": now,
            })
            if len(results) == 3:
                break

        return results

    async def _query_duckduckgo(
        self,
        package_id: str,
        developer_name: str,
        app_title: str,
    ) -> List[Dict[str, Any]]:
        """Collect a small, live public-web sample without a paid API key.

        This is deliberately limited to three links per app and never changes a
        risk score. It makes the investigation links visible for human review;
        it is not evidence of regulatory status or wrongdoing.
        """
        query = f'"{app_title}" "{developer_name}" loan complaints reviews news'
        try:
            async with httpx.AsyncClient(
                timeout=10.0,
                follow_redirects=True,
                headers={"User-Agent": "LoanAppSafetyChecker/1.1 research bot"},
            ) as client:
                response = await client.get("https://html.duckduckgo.com/html/", params={"q": query})
                response.raise_for_status()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Error querying DuckDuckGo web search: %s", exc)
            return []

        return self._parse_duckduckgo_results(package_id, app_title, response.text)

    @staticmethod
    def _parse_duckduckgo_results(package_id: str, app_title: str, html: str) -> List[Dict[str, Any]]:
        """Turn DuckDuckGo's result markup into bounded, linkable provenance."""
        soup = BeautifulSoup(html, "html.parser")
        now = datetime.now(timezone.utc)
        results: List[Dict[str, Any]] = []

        for result in soup.select(".result"):
            link = result.select_one(".result__a")
            if not link:
                continue

            source_url = ExternalEvidenceCollector._unwrap_duckduckgo_url(link.get("href", ""))
            title = link.get_text(" ", strip=True)
            snippet_node = result.select_one(".result__snippet")
            snippet = snippet_node.get_text(" ", strip=True) if snippet_node else ""
            if not source_url or not title:
                continue

            claim = f"Public web result related to {app_title}; requires human corroboration."
            results.append({
                "package_id": package_id,
                "source_url": source_url,
                "source_title": title,
                "source_type": "search_result",
                "claim_supported": claim,
                "excerpt": snippet,
                "reliability_score": 0.0,
                "content_hash": compute_content_hash(package_id, source_url, claim),
                "publication_date": None,
                "access_timestamp": now,
            })
            if len(results) == 3:
                break

        return results

    @staticmethod
    def _unwrap_duckduckgo_url(url: str) -> str:
        """Extract the result destination from DuckDuckGo's redirect URL."""
        parsed = urlparse(url)
        destination = parse_qs(parsed.query).get("uddg", [None])[0]
        return unquote(destination) if destination else url

    async def _query_serpapi(self, package_id: str, app_title: str) -> List[Dict[str, Any]]:
        """Queries SerpApi for credible public journalism or official notices."""
        results = []
        try:
            query = f'"{app_title}" OR "{package_id}" (loan harassment OR regulatory action OR RBI OR illegal)'
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://serpapi.com/search.json",
                    params={
                        "q": query,
                        "api_key": self.api_key,
                        "num": 3,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    organic = data.get("organic_results", [])
                    now = datetime.now(timezone.utc)
                    for item in organic:
                        url = item.get("link")
                        title = item.get("title", "Search Result")
                        snippet = item.get("snippet", "")
                        claim = f"Corroborating public reporting regarding {app_title}"
                        h = compute_content_hash(package_id, url, claim)
                        results.append({
                            "package_id": package_id,
                            "source_url": url,
                            "source_title": title,
                            "source_type": "search_result",
                            "claim_supported": claim,
                            "excerpt": snippet,
                            "reliability_score": 0.0,
                            "content_hash": h,
                            "publication_date": None,
                            "access_timestamp": now,
                        })
        except Exception as e:
            logger.warning("Error querying external search API: %s", str(e))

        return results
