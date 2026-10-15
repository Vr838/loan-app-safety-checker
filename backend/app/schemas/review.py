"""Review schemas."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    text: str
    thumbs_up: int = Field(default=0, ge=0)
    review_created_at: Optional[datetime] = None


class ReviewCreate(ReviewBase):
    source_review_id: Optional[str] = None
    package_id: str
    sentiment: Optional[str] = None
    complaint_themes: List[str] = Field(default_factory=list)


class ReviewResponse(ReviewBase):
    id: int
    source_review_id: Optional[str] = None
    package_id: str
    collected_at: datetime
    sentiment: Optional[str] = None
    complaint_themes: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
