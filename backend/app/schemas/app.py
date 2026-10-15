"""App profile schemas."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.risk import RiskAssessmentResponse
from app.schemas.evidence import EvidenceResponse


class AppBase(BaseModel):
    title: str
    developer: str
    developer_id: Optional[str] = None
    developer_email: Optional[str] = None
    developer_website: Optional[str] = None
    developer_address: Optional[str] = None
    category: str = "FINANCE"
    rating: float = Field(default=0.0, ge=0.0, le=5.0)
    rating_count: int = Field(default=0, ge=0)
    installs_text: Optional[str] = None
    installs_approx: int = Field(default=0, ge=0)
    privacy_policy_url: Optional[str] = None
    store_url: str
    icon_url: Optional[str] = None
    summary: Optional[str] = None
    is_active: bool = True


class AppCreate(AppBase):
    package_id: str


class AppListItem(AppBase):
    package_id: str
    first_discovered_at: datetime
    last_scanned_at: datetime
    latest_assessment: Optional[RiskAssessmentResponse] = None

    model_config = ConfigDict(from_attributes=True)


class AppDetail(AppListItem):
    evidence_items: List[EvidenceResponse] = Field(default_factory=list)
    recent_assessments: List[RiskAssessmentResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class AppListResponse(BaseModel):
    items: List[AppListItem]
    total: int
    page: int
    page_size: int
    total_pages: int
