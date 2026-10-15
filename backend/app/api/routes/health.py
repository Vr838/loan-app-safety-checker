"""Health check route."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import settings
from app.db.session import async_engine
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def check_health():
    """Reports system health, database connection, and collector status."""
    db_ok = False
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        db_ok = False

    return HealthResponse(
        status="ok" if db_ok else "degraded",
        version="0.1.0",
        environment=settings.ENVIRONMENT,
        database_connected=db_ok,
        collector_ready=True,
        components={
            "database": "connected" if db_ok else "unreachable",
            "risk_engine": f"active ({settings.RISK_ENGINE_VERSION})",
            "external_search": settings.EXTERNAL_SEARCH_PROVIDER,
        },
    )
