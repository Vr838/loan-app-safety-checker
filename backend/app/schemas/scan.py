"""Scan run and scan trigger schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ScanTriggerRequest(BaseModel):
    queries: Optional[List[str]] = Field(
        default=None,
        description="Optional list of search queries to execute. Defaults to standard loan queries if empty.",
    )
    max_apps_per_query: Optional[int] = Field(
        default=5,
        ge=1,
        le=50,
        description="Bounded cap on apps fetched per query to prevent rate limits.",
    )
    max_reviews_per_app: Optional[int] = Field(
        default=30,
        ge=5,
        le=100,
        description="Bounded sample of user reviews per app.",
    )


class ScanRunResponse(BaseModel):
    id: int
    scan_uuid: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    trigger_type: str
    queries_attempted: List[str]
    apps_discovered_count: int
    apps_collected_count: int
    apps_new_count: int = 0
    apps_refreshed_count: int = 0
    apps_failed_count: int
    error_summary: Optional[List[Dict[str, Any]]] = None
    collector_version: str

    model_config = ConfigDict(from_attributes=True)
