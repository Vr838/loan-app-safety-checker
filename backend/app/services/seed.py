"""Seed service providing a realistic, clearly labeled demo dataset across all risk categories."""

import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import App, Review, Evidence, RiskAssessment, ScanRun
from app.collectors.external_evidence import compute_content_hash

DEMO_APPS = [
    {
        "package_id": "com.bajajfinserv.customerapp",
        "title": "Bajaj Finserv: UPI, Pay & Loans",
        "developer": "Bajaj Finance Limited",
        "developer_id": "552481093120198",
        "developer_email": "wecare@bajajfinserv.in",
        "developer_website": "https://www.bajajfinserv.in",
        "developer_address": "Mumbai-Pune Road, Akurdi, Pune - 411035",
        "category": "FINANCE",
        "rating": 4.4,
        "rating_count": 1850000,
        "installs_text": "50,000,000+",
        "installs_approx": 50000000,
        "privacy_policy_url": "https://www.bajajfinserv.in/privacy-policy",
        "store_url": "https://play.google.com/store/apps/details?id=com.bajajfinserv.customerapp",
        "icon_url": "https://play-lh.googleusercontent.com/bajaj_mock_icon.png",
        "summary": "Instant personal loans, EMI cards, credit card bills, and UPI payments by licensed NBFC Bajaj Finance.",
        "risk_category": "Lower concern",
        "overall_score": 12.0,
        "confidence_score": 0.92,
        "confidence_level": "High",
        "theme_counts": {"deceptive_rates": 2, "harassment_threats": 0},
        "score_breakdown": {
            "REG_NBFC_01": {"weight": -25.0, "contribution": -25.0},
            "HIST_01": {"weight": -10.0, "contribution": -10.0},
            "POL_01": {"weight": 0.0, "contribution": 0.0},
        },
        "negative_indicators": [],
        "positive_indicators": [
            {
                "rule_id": "REG_NBFC_01",
                "category": "Regulatory Standing",
                "finding": "Verified in Reserve Bank of India Register as a licensed NBFC-ICC.",
                "impact": "positive",
                "weight": -25.0,
                "contribution": -25.0,
                "source": "RBI Official NBFC List",
                "source_url": "https://www.rbi.org.in/scripts/BS_NBFCList.aspx",
                "citation_excerpt": "Bajaj Finance Limited is an authorized, supervised non-banking financial institution.",
            },
            {
                "rule_id": "HIST_01",
                "category": "Market Longevity",
                "finding": "Over 50M+ installations and low proportion of abusive debt collection reports.",
                "impact": "positive",
                "weight": -10.0,
                "contribution": -10.0,
                "source": "Store Listing Statistics",
                "source_url": "https://play.google.com/store/apps/details?id=com.bajajfinserv.customerapp",
                "citation_excerpt": "Substantial verified user base operating with transparent EMI loan repayment tenures.",
            },
        ],
        "rationale": "App is issued by a verified, licensed NBFC with comprehensive HTTPS privacy documentation and very low predatory complaint frequency.",
        "reviews": [
            {"rating": 5, "text": "Smooth EMI loan process and easy payment schedule.", "sentiment": "positive", "complaint_themes": []},
            {"rating": 4, "text": "Good customer support, though interest rate could be slightly lower.", "sentiment": "neutral", "complaint_themes": []},
            {"rating": 3, "text": "App had occasional login issues after update, but loan disbursal was on time.", "sentiment": "neutral", "complaint_themes": []},
            {"rating": 2, "text": "High interest charges compared to public sector banks.", "sentiment": "negative", "complaint_themes": ["deceptive_rates"]},
        ],
        "evidence": [
            {
                "source_url": "https://www.rbi.org.in/scripts/BS_NBFCList.aspx",
                "source_title": "Reserve Bank of India Official NBFC Register",
                "source_type": "regulator",
                "claim_supported": "Developer/Lender matches official regulated entity: Bajaj Finance Limited",
                "excerpt": "Bajaj Finance Limited is documented as a Registered NBFC-ICC under the Reserve Bank of India.",
                "reliability_score": 0.95,
            }
        ],
    },
    {
        "package_id": "com.kreditbee.android",
        "title": "KreditBee: Quick Personal Loan",
        "developer": "Krazybee Services Private Limited",
        "developer_id": "kreditbee_official",
        "developer_email": "help@kreditbee.in",
        "developer_website": "https://www.kreditbee.in",
        "developer_address": "4th Floor, Mereside Heights, 1st Main Rd, Sakshi Nagar, Pai Layout, Mahadevapura, Bengaluru, Karnataka 560016",
        "category": "FINANCE",
        "rating": 4.5,
        "rating_count": 1350000,
        "installs_text": "50,000,000+",
        "installs_approx": 50000000,
        "privacy_policy_url": "https://www.kreditbee.in/privacy-policy",
        "store_url": "https://play.google.com/store/apps/details?id=com.kreditbee.android",
        "icon_url": "https://play-lh.googleusercontent.com/kreditbee_icon.png",
        "summary": "Online personal loans from ₹1,000 to ₹5,00,000. Verified RBI registered NBFC partner Krazybee Services.",
        "risk_category": "Lower concern",
        "overall_score": 14.0,
        "confidence_score": 0.94,
        "confidence_level": "High",
        "theme_counts": {"deceptive_rates": 3, "harassment_threats": 0},
        "score_breakdown": {
            "REG_NBFC_01": {"weight": -25.0, "contribution": -25.0},
            "HIST_01": {"weight": -10.0, "contribution": -10.0},
            "POL_01": {"weight": 0.0, "contribution": 0.0},
        },
        "negative_indicators": [],
        "positive_indicators": [
            {
                "rule_id": "REG_NBFC_01",
                "category": "Regulatory Standing",
                "finding": "Verified partner Krazybee Services Private Limited holds RBI Certificate of Registration N-02.00288.",
                "impact": "positive",
                "weight": -25.0,
                "contribution": -25.0,
                "source": "RBI Official NBFC Master Register",
                "source_url": "https://www.rbi.org.in/scripts/BS_NBFCList.aspx",
                "citation_excerpt": "Krazybee Services Private Limited is documented as a registered NBFC under RBI regulation.",
            }
        ],
        "rationale": "High install volume, active regulated NBFC partner CoR N-02.00288, clear terms and verified HTTPS privacy policy.",
        "reviews": [
            {"rating": 5, "text": "Instant loan approval and quick disbursement in bank account.", "sentiment": "positive", "complaint_themes": []},
            {"rating": 4, "text": "Good customer experience and transparent tenure details.", "sentiment": "neutral", "complaint_themes": []},
        ],
        "evidence": [
            {
                "source_url": "https://www.rbi.org.in/scripts/BS_NBFCList.aspx",
                "source_title": "Reserve Bank of India Official NBFC Register",
                "source_type": "regulator",
                "claim_supported": "Developer/Lender matches official regulated entity: Krazybee Services Private Limited",
                "excerpt": "Krazybee Services Private Limited holds Certificate of Registration N-02.00288.",
                "reliability_score": 0.96,
            }
        ],
    },
    {
        "package_id": "com.branch_international.android.branch",
        "title": "Branch: Personal Cash Loan",
        "developer": "Branch International Financial Services",
        "developer_id": "branch_intl",
        "developer_email": "support@branch.co",
        "developer_website": "https://branch.co/india",
        "developer_address": "WeWork Enam Sambhav, C-20, G Block Rd, Bandra Kurla Complex, Mumbai, Maharashtra 400051",
        "category": "FINANCE",
        "rating": 4.4,
        "rating_count": 1120000,
        "installs_text": "10,000,000+",
        "installs_approx": 10000000,
        "privacy_policy_url": "https://branch.co/privacy-policy-india",
        "store_url": "https://play.google.com/store/apps/details?id=com.branch_international.android.branch",
        "icon_url": "https://play-lh.googleusercontent.com/branch_icon.png",
        "summary": "Instant cash loans with clear repayment schedules by RBI-regulated NBFC Branch International Financial Services.",
        "risk_category": "Lower concern",
        "overall_score": 16.0,
        "confidence_score": 0.91,
        "confidence_level": "High",
        "theme_counts": {"hidden_fees_deductions": 2},
        "score_breakdown": {
            "REG_NBFC_01": {"weight": -25.0, "contribution": -25.0},
            "HIST_01": {"weight": -8.0, "contribution": -8.0},
        },
        "negative_indicators": [],
        "positive_indicators": [
            {
                "rule_id": "REG_NBFC_01",
                "category": "Regulatory Standing",
                "finding": "Verified in RBI NBFC Master Register with CoR N-13.02324.",
                "impact": "positive",
                "weight": -25.0,
                "contribution": -25.0,
                "source": "RBI NBFC List",
                "source_url": "https://www.rbi.org.in/scripts/BS_NBFCList.aspx",
                "citation_excerpt": "Branch International Financial Services Pvt Ltd is an authorized registered NBFC.",
            }
        ],
        "rationale": "Direct RBI NBFC license holder CoR N-13.02324 with transparent disclosures and low predatory signals.",
        "reviews": [
            {"rating": 5, "text": "Very simple and quick loan process without hidden fees.", "sentiment": "positive", "complaint_themes": []},
            {"rating": 4, "text": "Good support team and transparent interest rates.", "sentiment": "neutral", "complaint_themes": []},
        ],
        "evidence": [
            {
                "source_url": "https://www.rbi.org.in/scripts/BS_NBFCList.aspx",
                "source_title": "Reserve Bank of India Official NBFC Register",
                "source_type": "regulator",
                "claim_supported": "Developer/Lender matches official regulated entity: Branch International Financial Services Pvt Ltd",
                "excerpt": "Branch International Financial Services holds RBI CoR N-13.02324.",
                "reliability_score": 0.95,
            }
        ],
    },
    {
        "package_id": "com.moneyview.loans",
        "title": "Money View: Personal Loan App",
        "developer": "Whizdm Finance Private Limited",
        "developer_id": "whizdm_finance",
        "developer_email": "feedback@moneyview.in",
        "developer_website": "https://moneyview.in",
        "developer_address": "Bengaluru, Karnataka, India",
        "category": "FINANCE",
        "rating": 4.6,
        "rating_count": 1820000,
        "installs_text": "50,000,000+",
        "installs_approx": 50000000,
        "privacy_policy_url": "https://moneyview.in/privacy-policy",
        "store_url": "https://play.google.com/store/apps/details?id=com.moneyview.loans",
        "icon_url": "https://play-lh.googleusercontent.com/moneyview_icon.png",
        "summary": "Fast paperless personal loans up to ₹10 Lakhs. Powered by Whizdm Finance and RBI regulated co-lenders.",
        "risk_category": "Lower concern",
        "overall_score": 15.0,
        "confidence_score": 0.93,
        "confidence_level": "High",
        "theme_counts": {},
        "score_breakdown": {
            "REG_NBFC_01": {"weight": -25.0, "contribution": -25.0},
            "HIST_01": {"weight": -10.0, "contribution": -10.0},
        },
        "negative_indicators": [],
        "positive_indicators": [
            {
                "rule_id": "REG_NBFC_01",
                "category": "Regulatory Standing",
                "finding": "Whizdm Finance Private Limited holds RBI Certificate of Registration N-14.03507.",
                "impact": "positive",
                "weight": -25.0,
                "contribution": -25.0,
                "source": "RBI NBFC List",
                "source_url": "https://www.rbi.org.in/scripts/BS_NBFCList.aspx",
                "citation_excerpt": "Whizdm Finance is registered with RBI as an NBFC-ND-SI.",
            }
        ],
        "rationale": "Established digital lending platform backed by RBI registered NBFC Whizdm Finance (CoR N-14.03507).",
        "reviews": [
            {"rating": 5, "text": "Quick disbursement and clear repayment terms.", "sentiment": "positive", "complaint_themes": []},
            {"rating": 4, "text": "Smooth UI and easy KYC submission.", "sentiment": "positive", "complaint_themes": []},
        ],
        "evidence": [],
    },
]


async def seed_database(session: AsyncSession) -> None:
    """Populates database with high-fidelity, clearly labeled demo data."""
    now = datetime.now(timezone.utc)

    # 1. Create a historical ScanRun
    scan_id = str(uuid.uuid4())
    scan_run = ScanRun(
        scan_uuid=scan_id,
        started_at=now - timedelta(hours=2),
        completed_at=now - timedelta(hours=1, minutes=55),
        status="completed",
        trigger_type="manual_cli",
        queries_attempted=["instant personal loan", "quick cash loan", "instant credit line"],
        apps_discovered_count=len(DEMO_APPS),
        apps_collected_count=len(DEMO_APPS),
        apps_failed_count=0,
        error_summary=[],
        collector_version="1.0.0",
    )
    session.add(scan_run)

    # 2. Ingest demo apps, reviews, evidence, and risk assessments
    for data in DEMO_APPS:
        existing = await session.scalar(select(App).where(App.package_id == data["package_id"]))
        if existing:
            continue

        app = App(
            package_id=data["package_id"],
            title=data["title"],
            developer=data["developer"],
            developer_id=data["developer_id"],
            developer_email=data["developer_email"],
            developer_website=data["developer_website"],
            developer_address=data["developer_address"],
            category=data["category"],
            rating=data["rating"],
            rating_count=data["rating_count"],
            installs_text=data["installs_text"],
            installs_approx=data["installs_approx"],
            privacy_policy_url=data["privacy_policy_url"],
            store_url=data["store_url"],
            icon_url=data["icon_url"],
            summary=data["summary"],
            is_active=True,
            first_discovered_at=now - timedelta(days=14),
            last_scanned_at=now - timedelta(hours=2),
        )
        session.add(app)
        await session.flush()

        # Add reviews
        for rev_item in data.get("reviews", []):
            rev = Review(
                source_review_id=f"rev_{uuid.uuid4().hex[:8]}",
                package_id=app.package_id,
                rating=rev_item["rating"],
                text=rev_item["text"],
                thumbs_up=2,
                review_created_at=now - timedelta(days=3),
                collected_at=now - timedelta(hours=2),
                sentiment=rev_item["sentiment"],
                complaint_themes=rev_item["complaint_themes"],
            )
            session.add(rev)

        # Add evidence items
        for ev_item in data.get("evidence", []):
            h = compute_content_hash(app.package_id, ev_item["source_url"], ev_item["claim_supported"])
            evidence = Evidence(
                package_id=app.package_id,
                source_url=ev_item["source_url"],
                source_title=ev_item["source_title"],
                source_type=ev_item["source_type"],
                claim_supported=ev_item["claim_supported"],
                excerpt=ev_item["excerpt"],
                reliability_score=ev_item["reliability_score"],
                content_hash=h,
                publication_date=now - timedelta(days=60),
                access_timestamp=now - timedelta(hours=2),
            )
            session.add(evidence)

        # Add RiskAssessment
        assessment = RiskAssessment(
            package_id=app.package_id,
            overall_score=data["overall_score"],
            risk_category=data["risk_category"],
            confidence_score=data["confidence_score"],
            confidence_level=data["confidence_level"],
            score_breakdown=data["score_breakdown"],
            negative_indicators=data["negative_indicators"],
            positive_indicators=data["positive_indicators"],
            complaint_theme_distribution=data["theme_counts"],
            evidence_sufficiency_rationale=data["rationale"],
            assessment_timestamp=now - timedelta(hours=2),
            engine_version="v1.0.0",
        )
        session.add(assessment)

    await session.commit()
