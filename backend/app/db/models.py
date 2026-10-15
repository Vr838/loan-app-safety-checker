"""SQLAlchemy declarative models for Loan App Safety Checker."""

from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def utc_now() -> datetime:
    """Returns current UTC datetime with timezone awareness."""
    return datetime.now(timezone.utc)


class App(Base):
    """Represents a discovered and analyzed mobile application."""

    __tablename__ = "apps"

    package_id = Column(String(255), primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    developer = Column(String(255), nullable=False, index=True)
    developer_id = Column(String(255), nullable=True, index=True)
    developer_email = Column(String(255), nullable=True)
    developer_website = Column(String(512), nullable=True)
    developer_address = Column(Text, nullable=True)

    category = Column(String(100), nullable=False, default="FINANCE", index=True)
    rating = Column(Float, nullable=False, default=0.0)
    rating_count = Column(Integer, nullable=False, default=0)
    installs_text = Column(String(100), nullable=True)
    installs_approx = Column(Integer, nullable=False, default=0)

    privacy_policy_url = Column(String(1024), nullable=True)
    store_url = Column(String(1024), nullable=False)
    icon_url = Column(String(1024), nullable=True)
    summary = Column(Text, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    first_discovered_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_scanned_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    reviews = relationship("Review", back_populates="app", cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="app", cascade="all, delete-orphan")
    assessments = relationship(
        "RiskAssessment",
        back_populates="app",
        order_by="desc(RiskAssessment.assessment_timestamp)",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_apps_rating", "rating"),
        Index("ix_apps_last_scanned", "last_scanned_at"),
    )


class Review(Base):
    """Sampled user review for sentiment and financial complaint analysis."""

    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_review_id = Column(String(255), nullable=True, index=True)
    package_id = Column(String(255), ForeignKey("apps.package_id", ondelete="CASCADE"), nullable=False, index=True)

    rating = Column(Integer, nullable=False)  # 1 to 5
    text = Column(Text, nullable=False)
    thumbs_up = Column(Integer, nullable=False, default=0)
    review_created_at = Column(DateTime(timezone=True), nullable=True)
    collected_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # NLP / Classification attributes
    sentiment = Column(String(50), nullable=True)  # positive, neutral, negative
    complaint_themes = Column(JSON, nullable=False, default=list)  # e.g. ["harassment_threats", "hidden_fees"]

    app = relationship("App", back_populates="reviews")

    __table_args__ = (
        Index("ix_reviews_package_rating", "package_id", "rating"),
    )


class Evidence(Base):
    """Corroborating external or store evidence item supporting a finding."""

    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    package_id = Column(String(255), ForeignKey("apps.package_id", ondelete="CASCADE"), nullable=False, index=True)

    source_url = Column(String(1024), nullable=True)
    source_title = Column(String(512), nullable=False)
    source_type = Column(String(100), nullable=False)  # regulator, legal_registry, journalism, app_store, user_report
    claim_supported = Column(String(512), nullable=False)
    excerpt = Column(Text, nullable=False)

    reliability_score = Column(Float, nullable=False, default=0.5)  # 0.0 to 1.0
    content_hash = Column(String(64), nullable=False, index=True)
    publication_date = Column(DateTime(timezone=True), nullable=True)
    access_timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    app = relationship("App", back_populates="evidence_items")

    __table_args__ = (
        UniqueConstraint("package_id", "content_hash", name="uq_app_evidence_hash"),
        Index("ix_evidence_source_type", "source_type"),
    )


class ScanRun(Base):
    """Records metadata and accounting for an execution of the collection scan."""

    __tablename__ = "scan_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_uuid = Column(String(64), unique=True, nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    status = Column(String(50), nullable=False, default="running")  # running, completed, partial, failed
    trigger_type = Column(String(50), nullable=False, default="manual_cli")  # manual_cli, admin_api, scheduled

    queries_attempted = Column(JSON, nullable=False, default=list)
    apps_discovered_count = Column(Integer, nullable=False, default=0)
    apps_collected_count = Column(Integer, nullable=False, default=0)
    apps_failed_count = Column(Integer, nullable=False, default=0)

    error_summary = Column(JSON, nullable=True, default=list)
    collector_version = Column(String(50), nullable=False, default="1.0.0")

    __table_args__ = (
        Index("ix_scan_runs_status", "status"),
        Index("ix_scan_runs_started_at", "started_at"),
    )


class RiskAssessment(Base):
    """Snapshot of a deterministic risk score calculation for an app."""

    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    package_id = Column(String(255), ForeignKey("apps.package_id", ondelete="CASCADE"), nullable=False, index=True)

    overall_score = Column(Float, nullable=False)  # 0.0 to 100.0
    risk_category = Column(String(50), nullable=False)  # Lower concern, Caution, High concern, Insufficient evidence

    confidence_score = Column(Float, nullable=False)  # 0.0 to 1.0
    confidence_level = Column(String(50), nullable=False)  # High, Medium, Low, Insufficient

    score_breakdown = Column(JSON, nullable=False, default=dict)
    negative_indicators = Column(JSON, nullable=False, default=list)
    positive_indicators = Column(JSON, nullable=False, default=list)
    complaint_theme_distribution = Column(JSON, nullable=False, default=dict)
    evidence_sufficiency_rationale = Column(Text, nullable=False)

    assessment_timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    engine_version = Column(String(50), nullable=False, default="v1.0.0")

    app = relationship("App", back_populates="assessments")

    __table_args__ = (
        Index("ix_risk_assessments_category", "risk_category"),
        Index("ix_risk_assessments_timestamp", "assessment_timestamp"),
    )
