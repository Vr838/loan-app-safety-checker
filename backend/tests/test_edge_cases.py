"""Comprehensive edge case test suite for Loan App Safety Checker.

Covers:
- /compare endpoint validation (duplicate IDs, < 2, > 4, missing IDs)
- /rbi-check endpoint validation and not found handling
- Report generation (CSV, PDF, b'%PDF-' signature, missing assessment fallback)
- Risk scoring bounds (clamped to [0.0, 100.0] under extreme indicators)
- Review NLP edge cases (emojis, Hinglish, blank strings, extreme lengths)
- Search sanitization (SQL special chars, XSS strings, out-of-range pagination)
"""

import pytest
from httpx import AsyncClient

from app.analysis.reviews import ReviewAnalyzer
from app.analysis.risk import RiskEngine
from app.services.reports import build_csv_report, build_pdf_report


# ============================================================================
# API & COMPARISON EDGE CASES
# ============================================================================


@pytest.mark.asyncio
async def test_compare_less_than_two_apps_fails(client: AsyncClient):
    """Comparing fewer than two apps must return 422 Unprocessable Entity."""
    resp = await client.get("/api/v1/apps/compare?package_id=org.altruist.BajajExperia")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_compare_duplicate_apps_fails(client: AsyncClient):
    """Submitting duplicate package IDs must return 422 Unprocessable Entity."""
    resp = await client.get(
        "/api/v1/apps/compare?package_id=org.altruist.BajajExperia&package_id=org.altruist.BajajExperia"
    )
    assert resp.status_code == 422
    assert "distinct" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_compare_more_than_four_apps_fails(client: AsyncClient):
    """Submitting more than 4 package IDs must return 422."""
    query = "&".join(f"package_id=com.app.{i}" for i in range(5))
    resp = await client.get(f"/api/v1/apps/compare?{query}")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_compare_missing_app_returns_404(client: AsyncClient):
    """If any app in the comparison does not exist, return 404."""
    resp = await client.get(
        "/api/v1/apps/compare?package_id=org.altruist.BajajExperia&package_id=com.totally.fake.package"
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_compare_valid_apps_succeeds(client: AsyncClient):
    """Comparing two valid apps returns a 200 with complete app profiles."""
    resp = await client.get(
        "/api/v1/apps/compare?package_id=org.altruist.BajajExperia&package_id=com.test.high-risk"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["package_id"] == "org.altruist.BajajExperia"
    assert data[1]["package_id"] == "com.test.high-risk"


# ============================================================================
# RBI-CHECK ENDPOINT EDGE CASES
# ============================================================================


@pytest.mark.asyncio
async def test_rbi_check_valid_app(client: AsyncClient):
    """RBI check returns manual verification instructions and developer entity."""
    resp = await client.get("/api/v1/apps/org.altruist.BajajExperia/rbi-check")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "manual_verification_required"
    assert "Bajaj Finance" in data["developer_name"]
    assert len(data["sources"]) >= 1


@pytest.mark.asyncio
async def test_rbi_check_not_found(client: AsyncClient):
    """RBI check on non-existent package returns 404."""
    resp = await client.get("/api/v1/apps/com.nonexistent.fake/rbi-check")
    assert resp.status_code == 404


# ============================================================================
# REPORT GENERATION EDGE CASES (CSV & PDF)
# ============================================================================


@pytest.mark.asyncio
async def test_download_report_csv_success(client: AsyncClient):
    """CSV report download returns text/csv content with research headers."""
    resp = await client.get("/api/v1/apps/org.altruist.BajajExperia/report.csv")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    content = resp.text
    assert "Loan App Safety Checker research report" in content
    assert "org.altruist.BajajExperia" in content
    assert "Observed risk score" in content


@pytest.mark.asyncio
async def test_download_report_pdf_success(client: AsyncClient):
    """PDF report download returns application/pdf with valid PDF binary signature."""
    resp = await client.get("/api/v1/apps/org.altruist.BajajExperia/report.pdf")
    assert resp.status_code == 200
    assert "application/pdf" in resp.headers["content-type"]
    assert resp.content.startswith(b"%PDF-")


@pytest.mark.asyncio
async def test_download_report_not_found(client: AsyncClient):
    """Reports for non-existent apps return 404."""
    resp_csv = await client.get("/api/v1/apps/com.fake.app/report.csv")
    assert resp_csv.status_code == 404

    resp_pdf = await client.get("/api/v1/apps/com.fake.app/report.pdf")
    assert resp_pdf.status_code == 404


def test_report_builder_handles_missing_assessment_and_evidence():
    """Unit test: report builders must not crash when assessment or evidence is None/empty."""
    class MockApp:
        title = "Minimal Test App"
        package_id = "com.minimal.test"
        developer = "Unknown"
        rating = 0.0
        installs_text = None
        from datetime import datetime, timezone
        last_scanned_at = datetime.now(timezone.utc)

    app = MockApp()
    csv_str = build_csv_report(app, None, [])
    assert "Needs more data" in csv_str
    assert "No assessment recorded" in csv_str

    pdf_bytes = build_pdf_report(app, None, [])
    assert pdf_bytes.startswith(b"%PDF-")


# ============================================================================
# RISK ENGINE CLAMPING & EXTREME BOUNDS
# ============================================================================


def test_risk_score_clamped_to_100_max():
    """Even with excessive negative points, overall_score must never exceed 100.0."""
    engine = RiskEngine()
    app_data = {
        "store_url": "https://play.google.com/store/apps/details?id=com.extreme.app",
        "rating_count": 50000,
        "installs_approx": 100000,
        "privacy_policy_url": "http://insecure.com/policy",
    }
    # 50 harassment complaints + 50 privacy complaints
    reviews = [{"complaint_themes": ["harassment_threats", "privacy_contact_abuse", "short_cycle_extortion"], "rating": 1} for _ in range(50)]
    anomalies = {"has_anomaly": True}
    evidence = [
        {"source_type": "regulator", "claim_supported": "Official Ban Order", "source_title": "MeitY Ban", "source_url": "https://meity.gov.in"}
        for _ in range(5)
    ]

    res = engine.compute_assessment(app_data, reviews, evidence, anomalies)
    assert res["overall_score"] == 100.0
    assert res["risk_category"] == "High concern"


def test_risk_score_clamped_to_0_min():
    """Even with massive mitigations and zero complaints, overall_score must never be negative."""
    engine = RiskEngine()
    app_data = {
        "store_url": "https://play.google.com/store/apps/details?id=com.perfect.app",
        "rating_count": 5000000,
        "installs_approx": 100000000,
        "privacy_policy_url": "https://perfect.com/privacy",
    }
    reviews = [{"complaint_themes": [], "rating": 5} for _ in range(100)]
    anomalies = {"has_anomaly": False}
    evidence = [
        {"source_type": "regulator", "claim_supported": "Matches official regulated entity: Perfect Bank Ltd", "source_title": "RBI Register", "source_url": "https://rbi.org.in"}
        for _ in range(10)
    ]

    res = engine.compute_assessment(app_data, reviews, evidence, anomalies)
    assert res["overall_score"] == 0.0
    assert res["risk_category"] == "Lower concern"


# ============================================================================
# REVIEW THEME CLASSIFIER NLP EDGE CASES
# ============================================================================


def test_review_theme_classifier_unicode_and_emojis():
    """Classifier handles emojis and emotive symbols gracefully."""
    analyzer = ReviewAnalyzer()
    text = "Threatening my family 😡 blackmailing and abusive language 🤬 vulgar calls!!"
    sentiment, themes = analyzer.classify_review(text, rating=1)
    assert sentiment == "negative"
    assert "harassment_threats" in themes


def test_review_theme_classifier_empty_or_none():
    """Empty or None text returns empty theme list without crashing."""
    analyzer = ReviewAnalyzer()
    assert analyzer.classify_review("", rating=3) == ("neutral", [])
    assert analyzer.classify_review(None, rating=3) == ("neutral", [])  # type: ignore


def test_review_theme_classifier_extreme_length():
    """Long repetitive strings do not cause exponential backtracking (ReDoS)."""
    analyzer = ReviewAnalyzer()
    long_text = ("fake charges and hidden processing fees deducted " * 200) + "blackmail"
    sentiment, themes = analyzer.classify_review(long_text, rating=1)
    assert sentiment == "negative"
    assert "hidden_fees_deductions" in themes
    assert "harassment_threats" in themes


# ============================================================================
# SEARCH & QUERY SANITIZATION EDGE CASES
# ============================================================================


@pytest.mark.asyncio
async def test_search_special_characters_sanitized(client: AsyncClient):
    """SQL wildcards and XSS payloads in query parameter do not cause server errors."""
    special_queries = ["%", "_", "'", '"', "<script>alert(1)</script>", "\\", ";--"]
    for q in special_queries:
        resp = await client.get(f"/api/v1/apps?q={q}")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data


@pytest.mark.asyncio
async def test_out_of_range_page_number(client: AsyncClient):
    """Requesting page beyond total pages returns 200 with empty items list."""
    resp = await client.get("/api/v1/apps?page=99999&page_size=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["page"] == 99999
