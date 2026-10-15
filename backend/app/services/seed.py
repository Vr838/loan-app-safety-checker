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
        "package_id": "com.speedyloan.instantcredit",
        "title": "Speedy Rupee - Instant Quick Cash",
        "developer": "Apex Cloud Fintech Holdings Ltd",
        "developer_id": "apex_cloud_fintech",
        "developer_email": "apexsupport2023@gmail.com",
        "developer_website": None,
        "developer_address": "Suite 401, Grand Cayman, Cayman Islands",
        "category": "FINANCE",
        "rating": 3.1,
        "rating_count": 1420,
        "installs_text": "50,000+",
        "installs_approx": 50000,
        "privacy_policy_url": "http://speedyrupee.blogspot.com/p/privacy.html",
        "store_url": "https://play.google.com/store/apps/details?id=com.speedyloan.instantcredit",
        "icon_url": "https://play-lh.googleusercontent.com/speedy_mock_icon.png",
        "summary": "Get cash in 5 minutes! No paperwork needed. Direct transfer to account with minimal verification.",
        "risk_category": "High concern",
        "overall_score": 88.0,
        "confidence_score": 0.74,
        "confidence_level": "High",
        "theme_counts": {"harassment_threats": 8, "privacy_contact_abuse": 6, "short_cycle_extortion": 7, "hidden_fees_deductions": 5},
        "score_breakdown": {
            "HARASS_01": {"weight": 30.0, "contribution": 30.0, "count": 8},
            "PRIV_01": {"weight": 25.0, "contribution": 25.0, "count": 6},
            "PRED_01": {"weight": 20.0, "contribution": 20.0, "count": 7},
            "POL_01": {"weight": 15.0, "contribution": 15.0},
            "REV_01": {"weight": 10.0, "contribution": 10.0},
            "REG_ADV_01": {"weight": 35.0, "contribution": 35.0},
        },
        "negative_indicators": [
            {
                "rule_id": "HARASS_01",
                "category": "Conduct & Collection",
                "finding": "8 user reviews report abusive collection calls, vulgar messages, and threatening family members.",
                "impact": "negative",
                "weight": 30.0,
                "contribution": 30.0,
                "source": "Google Play Reviews",
                "source_url": "https://play.google.com/store/apps/details?id=com.speedyloan.instantcredit",
                "citation_excerpt": "Reviewers allege collection agents sent abusive WhatsApp messages and called parents demanding immediate extortionate repayment.",
            },
            {
                "rule_id": "PRIV_01",
                "category": "Privacy & Permissions",
                "finding": "Reports of unauthorized contact list harvesting and photo gallery access.",
                "impact": "negative",
                "weight": 25.0,
                "contribution": 25.0,
                "source": "Google Play Reviews",
                "source_url": "https://play.google.com/store/apps/details?id=com.speedyloan.instantcredit",
                "citation_excerpt": "Multiple users confirm the app accessed their full contact list and sent defamatory messages to contacts upon 6th day.",
            },
            {
                "rule_id": "PRED_01",
                "category": "Loan Terms & Transparency",
                "finding": "Predatory 7-day loan trap with 38% upfront fee deduction.",
                "impact": "negative",
                "weight": 20.0,
                "contribution": 20.0,
                "source": "Google Play Reviews",
                "source_url": "https://play.google.com/store/apps/details?id=com.speedyloan.instantcredit",
                "citation_excerpt": "Applied for Rs 5000, received only Rs 3100, and forced to pay back Rs 5200 within 7 days.",
            },
            {
                "rule_id": "REG_ADV_01",
                "category": "Regulatory Notices",
                "finding": "Named in State Cyber Cell Advisory on Unregulated Digital Lending.",
                "impact": "negative",
                "weight": 35.0,
                "contribution": 35.0,
                "source": "State Cyber Cell Advisory",
                "source_url": "https://cybercrime.gov.in/advisories/unauthorized_lending_apps",
                "citation_excerpt": "Public advisory alerting citizens against illegal digital lending applications practicing contact extortion.",
            },
        ],
        "positive_indicators": [],
        "rationale": "Severe composite risk signals present including verified public cyber advisories, repeated allegations of harassment and contact abuse, and predatory 7-day terms.",
        "reviews": [
            {"rating": 1, "text": "FRAUD APP! They promised 90 days but on 6th day started calling my mother and friends with abusive threats!", "sentiment": "negative", "complaint_themes": ["harassment_threats", "short_cycle_extortion", "privacy_contact_abuse"]},
            {"rating": 1, "text": "They deducted 40% processing fee upfront and gave only 3000 out of 5000. Blackmail calls started immediately.", "sentiment": "negative", "complaint_themes": ["hidden_fees_deductions", "harassment_threats"]},
            {"rating": 1, "text": "They hacked my contact list and sent vulgar messages to all my relatives. Do not install!", "sentiment": "negative", "complaint_themes": ["privacy_contact_abuse", "harassment_threats"]},
            {"rating": 5, "text": "Fast money loan very good app nice service.", "sentiment": "positive", "complaint_themes": []},
            {"rating": 5, "text": "Fast money loan very good app nice service.", "sentiment": "positive", "complaint_themes": []},
        ],
        "evidence": [
            {
                "source_url": "https://cybercrime.gov.in/advisories/unauthorized_lending_apps",
                "source_title": "State Cyber Cell Advisory on Unregulated Digital Lending",
                "source_type": "regulator",
                "claim_supported": "Named in public cautionary advisory regarding non-compliant short-term lending practices.",
                "excerpt": "Borrowers advised against transacting with unregistered digital lending applications practicing 7-day repayment harassment.",
                "reliability_score": 0.90,
            }
        ],
    },
    {
        "package_id": "com.creditflex.pocketloan",
        "title": "CreditFlex: Personal Credit",
        "developer": "FlexiTech Softwares",
        "developer_id": "flexitech_soft",
        "developer_email": "contact@flexitechsoft.in",
        "developer_website": "https://flexitechsoft.in",
        "developer_address": "Bengaluru, Karnataka, India",
        "category": "FINANCE",
        "rating": 3.7,
        "rating_count": 8900,
        "installs_text": "100,000+",
        "installs_approx": 100000,
        "privacy_policy_url": "https://flexitechsoft.in/privacy",
        "store_url": "https://play.google.com/store/apps/details?id=com.creditflex.pocketloan",
        "icon_url": "https://play-lh.googleusercontent.com/creditflex_mock_icon.png",
        "summary": "Fast digital personal loan provider for salaried professionals. Easy documentation.",
        "risk_category": "Caution",
        "overall_score": 46.0,
        "confidence_score": 0.62,
        "confidence_level": "Medium",
        "theme_counts": {"hidden_fees_deductions": 4, "deceptive_rates": 3, "harassment_threats": 0},
        "score_breakdown": {
            "PRED_01": {"weight": 20.0, "contribution": 16.0, "count": 4},
            "POL_01": {"weight": 0.0, "contribution": 0.0},
            "REV_01": {"weight": 10.0, "contribution": 10.0},
        },
        "negative_indicators": [
            {
                "rule_id": "PRED_01",
                "category": "Loan Terms & Transparency",
                "finding": "Multiple user reports of unexpected fee deductions and elevated processing charges.",
                "impact": "negative",
                "weight": 20.0,
                "contribution": 16.0,
                "source": "Google Play Reviews",
                "source_url": "https://play.google.com/store/apps/details?id=com.creditflex.pocketloan",
                "citation_excerpt": "Users note disbursal amounts were smaller than advertised due to undisclosed convenience and onboarding fees.",
            },
            {
                "rule_id": "REV_01",
                "category": "Listing Anomalies",
                "finding": "Bimodal star polarization detected across recent review batches.",
                "impact": "negative",
                "weight": 10.0,
                "contribution": 10.0,
                "source": "Review Distribution Analysis",
                "source_url": "https://play.google.com/store/apps/details?id=com.creditflex.pocketloan",
                "citation_excerpt": "Cluster of 1-star complaints regarding deductions juxtaposed against boilerplate 5-star ratings.",
            },
        ],
        "positive_indicators": [],
        "rationale": "App exhibits elevated risk indicators due to undisclosed upfront fees and uncorroborated regulatory lender disclosures, warranting consumer caution.",
        "reviews": [
            {"rating": 1, "text": "They deducted 800 rupees as upfront fee before even approving the loan. Very deceptive charges.", "sentiment": "negative", "complaint_themes": ["hidden_fees_deductions"]},
            {"rating": 2, "text": "Interest rate calculated is very high compared to bank personal loans.", "sentiment": "negative", "complaint_themes": ["deceptive_rates"]},
            {"rating": 4, "text": "Disbursal was quick within 2 hours, but fees were a bit high.", "sentiment": "positive", "complaint_themes": []},
            {"rating": 5, "text": "Good emergency fund when bank takes too long.", "sentiment": "positive", "complaint_themes": []},
        ],
        "evidence": [],
    },
    {
        "package_id": "com.quickpeso.earlycash",
        "title": "QuickPeso: Emergency Cash Loan",
        "developer": "New Dawn Mobile Apps",
        "developer_id": "new_dawn_apps",
        "developer_email": "newdawnappdev@outlook.com",
        "developer_website": None,
        "developer_address": None,
        "category": "FINANCE",
        "rating": 5.0,
        "rating_count": 3,
        "installs_text": "100+",
        "installs_approx": 100,
        "privacy_policy_url": None,
        "store_url": "https://play.google.com/store/apps/details?id=com.quickpeso.earlycash",
        "icon_url": "https://play-lh.googleusercontent.com/quickpeso_mock_icon.png",
        "summary": "Simple mobile loan for anyone in need of emergency cash. Low interest and quick approval.",
        "risk_category": "Insufficient evidence",
        "overall_score": 15.0,
        "confidence_score": 0.12,
        "confidence_level": "Insufficient",
        "theme_counts": {},
        "score_breakdown": {
            "POL_01": {"weight": 15.0, "contribution": 15.0},
        },
        "negative_indicators": [
            {
                "rule_id": "POL_01",
                "category": "Privacy Transparency",
                "finding": "Missing privacy policy URL on store listing.",
                "impact": "negative",
                "weight": 15.0,
                "contribution": 15.0,
                "source": "Store Listing Metadata",
                "source_url": "https://play.google.com/store/apps/details?id=com.quickpeso.earlycash",
                "citation_excerpt": "Application has no linked privacy policy document.",
            }
        ],
        "positive_indicators": [],
        "rationale": "Sample contains only 2 reviews and 3 ratings with no corroborated external records (confidence score 0.12). System cannot make a reliable heuristic assessment.",
        "reviews": [
            {"rating": 5, "text": "Good app.", "sentiment": "positive", "complaint_themes": []},
            {"rating": 5, "text": "Fast loan.", "sentiment": "positive", "complaint_themes": []},
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
