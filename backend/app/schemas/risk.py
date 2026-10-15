"""Risk Assessment schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class IndicatorItem(BaseModel):
    rule_id: str
    category: str
    finding: str
    impact: str  # negative or positive
    weight: float
    contribution: float
    source: str
    source_url: Optional[str] = None
    citation_excerpt: Optional[str] = None


class RiskAssessmentBase(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=100.0)
    risk_category: str = Field(..., description="Lower concern, Caution, High concern, Insufficient evidence")
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    confidence_level: str = Field(..., description="High, Medium, Low, Insufficient")
    score_breakdown: Dict[str, Any] = Field(default_factory=dict)
    negative_indicators: List[IndicatorItem] = Field(default_factory=list)
    positive_indicators: List[IndicatorItem] = Field(default_factory=list)
    complaint_theme_distribution: Dict[str, int] = Field(default_factory=dict)
    evidence_sufficiency_rationale: str
    engine_version: str = "v1.0.0"


class RiskAssessmentCreate(RiskAssessmentBase):
    package_id: str


class RiskAssessmentResponse(RiskAssessmentBase):
    id: int
    package_id: str
    assessment_timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
