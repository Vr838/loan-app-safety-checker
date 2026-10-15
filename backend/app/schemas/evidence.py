"""Evidence schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class EvidenceBase(BaseModel):
    source_url: Optional[str] = None
    source_title: str
    source_type: str = Field(..., description="regulator, legal_registry, journalism, app_store, user_report")
    claim_supported: str
    excerpt: str
    reliability_score: float = Field(default=0.5, ge=0.0, le=1.0)
    publication_date: Optional[datetime] = None


class EvidenceCreate(EvidenceBase):
    package_id: str
    content_hash: str


class EvidenceResponse(EvidenceBase):
    id: int
    package_id: str
    content_hash: str
    access_timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
