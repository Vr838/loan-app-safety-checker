"""Tests for collectors with mocked external HTTP interactions."""

import pytest
from unittest.mock import patch
from app.collectors.play_store import PlayStoreCollector
from app.collectors.external_evidence import ExternalEvidenceCollector, compute_content_hash


@pytest.mark.asyncio
async def test_play_store_discovery_mocked():
    collector = PlayStoreCollector(delay_seconds=0.0)
    mock_search_results = [
        {"appId": "com.mock.app1"},
        {"appId": "com.mock.app2"},
    ]

    with patch("app.collectors.play_store.search_apps", return_value=mock_search_results):
        packages = await collector.discover_apps(["loan"])
        assert "com.mock.app1" in packages
        assert "com.mock.app2" in packages
        assert len(packages) == 2


@pytest.mark.asyncio
async def test_play_store_details_mocked():
    collector = PlayStoreCollector(delay_seconds=0.0)
    mock_details = {
        "title": "Mock Loan App",
        "developer": "Mock Dev",
        "developerId": "mock_dev_id",
        "developerEmail": "dev@mock.com",
        "genreId": "FINANCE",
        "score": 4.1,
        "ratings": 120,
        "installs": "10,000+",
        "minInstalls": 10000,
        "privacyPolicy": "https://mock.com/privacy",
        "url": "https://play.google.com/store/apps/details?id=com.mock.app",
        "summary": "Mock summary",
    }

    with patch("app.collectors.play_store.fetch_app_details", return_value=mock_details):
        details = await collector.get_app_details("com.mock.app")
        assert details is not None
        assert details["title"] == "Mock Loan App"
        assert details["rating"] == 4.1
        assert details["installs_approx"] == 10000


@pytest.mark.asyncio
async def test_play_store_reviews_anonymization_mocked():
    collector = PlayStoreCollector(delay_seconds=0.0)
    mock_reviews = [
        {
            "reviewId": "rev_123",
            "userName": "Secret John Doe",  # Should be stripped!
            "userImage": "https://lh3.googleusercontent.com/avatar.jpg",  # Should be stripped!
            "content": "Good experience overall.",
            "score": 4,
            "thumbsUpCount": 3,
            "at": None,
        }
    ]

    with patch("app.collectors.play_store.fetch_reviews", return_value=(mock_reviews, None)):
        reviews = await collector.get_app_reviews("com.mock.app")
        assert len(reviews) == 1
        r = reviews[0]
        assert r["text"] == "Good experience overall."
        assert "userName" not in r
        assert "userImage" not in r


@pytest.mark.asyncio
async def test_external_evidence_regulatory_matching():
    collector = ExternalEvidenceCollector(provider="local_registry")
    evidence = await collector.gather_evidence(
        package_id="com.bajajfinserv.test",
        developer_name="Bajaj Finance Limited",
        app_title="Bajaj Finserv App",
    )
    assert len(evidence) >= 1
    assert any("Bajaj Finance Limited" in e["claim_supported"] for e in evidence)
    assert any(e["source_type"] == "regulator" for e in evidence)


def test_content_hash_deterministic():
    h1 = compute_content_hash("com.test", "https://source.com", "Claim text")
    h2 = compute_content_hash("com.test", "https://source.com", "Claim text")
    assert h1 == h2
    assert len(h1) == 64
