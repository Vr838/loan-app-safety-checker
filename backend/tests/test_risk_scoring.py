"""Unit tests for deterministic risk scoring engine."""

from app.analysis.risk import RiskEngine


def test_deterministic_scoring_consistency():
    """Verifies that identical inputs yield mathematically identical outputs."""
    engine = RiskEngine()
    app_data = {
        "store_url": "https://play.google.com/store/apps/details?id=com.test.app",
        "rating_count": 500,
        "installs_approx": 10000,
        "privacy_policy_url": "https://test.com/privacy",
    }
    reviews = [
        {"complaint_themes": ["harassment_threats"], "rating": 1},
        {"complaint_themes": ["harassment_threats"], "rating": 1},
        {"complaint_themes": ["short_cycle_extortion"], "rating": 1},
        {"complaint_themes": [], "rating": 5},
        {"complaint_themes": [], "rating": 4},
    ]
    anomalies = {"has_anomaly": False}
    evidence = []

    res1 = engine.compute_assessment(app_data, reviews, evidence, anomalies)
    res2 = engine.compute_assessment(app_data, reviews, evidence, anomalies)

    assert res1["overall_score"] == res2["overall_score"]
    assert res1["risk_category"] == res2["risk_category"]
    assert res1["confidence_score"] == res2["confidence_score"]
    assert len(res1["negative_indicators"]) == len(res2["negative_indicators"])


def test_insufficient_evidence_status():
    """Verifies that an app with virtually zero data is classified as Insufficient evidence, not Lower concern."""
    engine = RiskEngine()
    app_data = {
        "store_url": "https://play.google.com/store/apps/details?id=com.sparse.app",
        "rating_count": 2,
        "installs_approx": 10,
        "privacy_policy_url": None,
    }
    reviews = [
        {"complaint_themes": [], "rating": 5},
    ]
    anomalies = {"has_anomaly": False}
    evidence = []

    res = engine.compute_assessment(app_data, reviews, evidence, anomalies)
    assert res["risk_category"] == "Insufficient evidence"
    assert res["confidence_level"] == "Insufficient"
    assert "cannot make a responsible safety assessment" in res["evidence_sufficiency_rationale"]


def test_legacy_complaint_aliases_are_scored():
    """Historical imports use aliases that must retain their scoring meaning."""
    engine = RiskEngine()
    result = engine.compute_assessment(
        app_data={
            "store_url": "https://play.google.com/store/apps/details?id=com.alias.test",
            "rating_count": 100,
            "installs_approx": 1_000,
            "privacy_policy_url": "https://example.com/privacy",
        },
        reviews=[{"complaint_themes": ["hidden_fees", "short_tenor_trap"], "rating": 1} for _ in range(5)],
        evidence_items=[],
        anomalies={"has_anomaly": False},
    )

    assert "PRED_01" in result["score_breakdown"]
    assert result["complaint_theme_distribution"]["hidden_fees_deductions"] == 5
    assert result["complaint_theme_distribution"]["short_cycle_extortion"] == 5


def test_high_concern_predatory_signals():
    """Verifies that severe complaint themes and regulatory notices produce High concern category."""
    engine = RiskEngine()
    app_data = {
        "store_url": "https://play.google.com/store/apps/details?id=com.predatory.app",
        "rating_count": 2000,
        "installs_approx": 50000,
        "privacy_policy_url": "http://insecure-http.com/priv",  # Triggers POL_01
    }
    reviews = [
        {"complaint_themes": ["harassment_threats", "privacy_contact_abuse"], "rating": 1}
        for _ in range(6)
    ] + [
        {"complaint_themes": ["short_cycle_extortion"], "rating": 1}
        for _ in range(4)
    ] + [
        {"complaint_themes": [], "rating": 5}
        for _ in range(10)
    ]
    anomalies = {"has_anomaly": True, "notes": "Bimodal polarization detected"}
    evidence = [
        {
            "source_type": "regulator",
            "claim_supported": "Named in official regulatory advisory on illegal lending",
            "source_title": "State Cyber Advisory",
            "source_url": "https://cybercrime.gov.in/advisory",
            "excerpt": "Public warning against coercive practices.",
        }
    ]

    res = engine.compute_assessment(app_data, reviews, evidence, anomalies)
    assert res["risk_category"] == "High concern"
    assert res["overall_score"] >= 65.0
    assert any(ind["rule_id"] == "HARASS_01" for ind in res["negative_indicators"])
    assert any(ind["rule_id"] == "PRIV_01" for ind in res["negative_indicators"])
    assert any(ind["rule_id"] == "REG_ADV_01" for ind in res["negative_indicators"])


def test_verified_nbfc_mitigation():
    """Verifies that official NBFC registration deducts from the score."""
    engine = RiskEngine()
    app_data = {
        "store_url": "https://play.google.com/store/apps/details?id=com.legit.nbfc",
        "rating_count": 100000,
        "installs_approx": 5000000,
        "privacy_policy_url": "https://legit.com/privacy",
    }
    reviews = [{"complaint_themes": [], "rating": 4} for _ in range(25)]
    anomalies = {"has_anomaly": False}
    evidence = [
        {
            "source_type": "regulator",
            "claim_supported": "Matches official regulated entity: Legit NBFC Limited",
            "source_title": "RBI NBFC Registry",
            "source_url": "https://rbi.org.in",
            "excerpt": "Registered NBFC",
        }
    ]

    res = engine.compute_assessment(app_data, reviews, evidence, anomalies)
    assert res["risk_category"] == "Lower concern"
    assert res["overall_score"] == 0.0
    assert any(ind["rule_id"] == "REG_NBFC_01" for ind in res["positive_indicators"])
