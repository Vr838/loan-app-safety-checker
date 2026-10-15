"""Pytest configuration and async test fixtures."""

import os
import sys
from datetime import datetime, timezone
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure backend directory in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.models import App, RiskAssessment, ScanRun
from app.db.session import Base, get_db
from app.main import app

# In-memory SQLite async engine for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    future=True,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function")
async def test_db():
    """Creates a clean in-memory database with tables for each test function."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        # Minimal test-only records. Production never seeds applications.
        now = datetime.now(timezone.utc)
        app = App(
            package_id="org.altruist.BajajExperia",
            title="Bajaj Finance",
            developer="Bajaj Finance Limited",
            category="FINANCE",
            rating=4.5,
            rating_count=1000,
            installs_approx=1_000_000,
            store_url="https://play.google.com/store/apps/details?id=org.altruist.BajajExperia",
            first_discovered_at=now,
            last_scanned_at=now,
        )
        session.add(app)
        session.add(RiskAssessment(
            package_id=app.package_id,
            overall_score=0.0,
            risk_category="Lower concern",
            confidence_score=0.7,
            confidence_level="High",
            score_breakdown={},
            negative_indicators=[],
            positive_indicators=[],
            complaint_theme_distribution={},
            evidence_sufficiency_rationale="Test fixture.",
            assessment_timestamp=now,
            engine_version="test",
        ))
        high_risk_app = App(
            package_id="com.test.high-risk",
            title="High Risk Test App",
            developer="Test Developer",
            category="FINANCE",
            rating=1.0,
            rating_count=10,
            installs_approx=100,
            store_url="https://play.google.com/store/apps/details?id=com.test.high-risk",
            first_discovered_at=now,
            last_scanned_at=now,
        )
        session.add(high_risk_app)
        session.add(RiskAssessment(
            package_id=high_risk_app.package_id,
            overall_score=80.0,
            risk_category="High concern",
            confidence_score=0.7,
            confidence_level="High",
            score_breakdown={},
            negative_indicators=[],
            positive_indicators=[],
            complaint_theme_distribution={},
            evidence_sufficiency_rationale="Test fixture.",
            assessment_timestamp=now,
            engine_version="test",
        ))
        session.add(ScanRun(
            scan_uuid="test-scan",
            started_at=now,
            completed_at=now,
            status="completed",
            trigger_type="manual_cli",
            queries_attempted=["test"],
            apps_discovered_count=2,
            apps_collected_count=2,
            apps_failed_count=0,
            error_summary=[],
            collector_version="test",
        ))
        await session.commit()
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(test_db: AsyncSession):
    """Provides an AsyncClient bound to the FastAPI test app with overridden DB dependency."""
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
