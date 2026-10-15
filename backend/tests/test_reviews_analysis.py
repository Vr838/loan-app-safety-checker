"""Unit tests for review classification and anomaly detection."""

from app.analysis.reviews import ReviewAnalyzer


def test_complaint_theme_classification():
    analyzer = ReviewAnalyzer()

    # Harassment test
    text1 = "They called my family and made abusive threats on WhatsApp!"
    sentiment1, themes1 = analyzer.classify_review(text1, rating=1)
    assert sentiment1 == "negative"
    assert "harassment_threats" in themes1

    # Contact list harvesting
    text2 = "App stole my contact list and sent vulgar messages to all my contacts."
    sentiment2, themes2 = analyzer.classify_review(text2, rating=1)
    assert sentiment2 == "negative"
    assert "privacy_contact_abuse" in themes2

    # 7-day trap and hidden deductions
    text3 = "Promised 90 days but tenure is only 7 days. Also cut 35% processing fee!"
    sentiment3, themes3 = analyzer.classify_review(text3, rating=1)
    assert sentiment3 == "negative"
    assert "short_cycle_extortion" in themes3
    assert "hidden_fees_deductions" in themes3

    # Clean positive review
    text4 = "Great customer service and fast disbursement into bank account."
    sentiment4, themes4 = analyzer.classify_review(text4, rating=5)
    assert sentiment4 == "positive"
    assert len(themes4) == 0


def test_anomaly_detection_duplicate_text():
    analyzer = ReviewAnalyzer()
    duplicate_text = "very good app nice loan quick approval"
    reviews = [
        {"rating": 5, "text": duplicate_text} for _ in range(8)
    ] + [
        {"rating": 1, "text": "Scam app do not download"} for _ in range(4)
    ]

    res = analyzer.detect_anomalies(reviews)
    assert res["has_anomaly"] is True
    assert res["duplicate_review_ratio"] >= 0.25


def test_anomaly_detection_bimodal_distribution():
    analyzer = ReviewAnalyzer()
    reviews = [
        {"rating": 1, "text": f"Scam number {i}"} for i in range(5)
    ] + [
        {"rating": 5, "text": f"Great app number {i}"} for i in range(10)
    ]

    res = analyzer.detect_anomalies(reviews)
    assert res["bimodal_distribution"] is True
    assert res["has_anomaly"] is True
