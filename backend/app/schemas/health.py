"""Health check schemas."""

from typing import Dict
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    environment: str
    database_connected: bool
    collector_ready: bool
    components: Dict[str, str]
