"""Scan management and status endpoints."""

from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, select

from app.core.security import verify_admin_token
from app.db.session import AsyncSessionLocal, get_db
from app.db.models import ScanRun
from app.schemas.scan import ScanRunResponse, ScanTriggerRequest
from app.services.scans import ScanService

router = APIRouter(prefix="/scans", tags=["Scans"])


async def _run_background_scan(
    queries: Optional[list],
    max_apps_per_query: int,
    max_reviews_per_app: int,
):
    """Background task worker for authorized scans."""
    async with AsyncSessionLocal() as session:
        service = ScanService(session)
        await service.execute_scan(
            queries=queries,
            max_apps_per_query=max_apps_per_query,
            max_reviews_per_app=max_reviews_per_app,
            trigger_type="admin_api",
        )


@router.get("", response_model=list[ScanRunResponse])
async def list_scan_runs(
    limit: int = 8,
    db: AsyncSession = Depends(get_db),
):
    """Returns recent scan runs so users can understand data freshness and changes."""
    safe_limit = min(max(limit, 1), 30)
    result = await db.execute(select(ScanRun).order_by(desc(ScanRun.started_at)).limit(safe_limit))
    return [ScanRunResponse.model_validate(scan) for scan in result.scalars().all()]


@router.get("/latest", response_model=Optional[ScanRunResponse])
async def get_latest_scan(db: AsyncSession = Depends(get_db)):
    """Returns the most recent scan run summary, coverage, and error counts."""
    stmt = select(ScanRun).order_by(desc(ScanRun.started_at)).limit(1)
    result = await db.execute(stmt)
    scan = result.scalar_one_or_none()
    if not scan:
        return None
    return ScanRunResponse.model_validate(scan)


@router.post("/admin/trigger", response_model=dict, status_code=status.HTTP_202_ACCEPTED)
async def trigger_admin_scan(
    payload: ScanTriggerRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token),
):
    """Protected endpoint to trigger a bounded scan in the background.

    Requires Bearer token matching ADMIN_API_TOKEN.
    Never exposed publicly without authentication.
    """
    active_scan = await db.scalar(
        select(ScanRun.id).where(ScanRun.status == "running").limit(1)
    )
    if active_scan is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A scan is already running. Wait for it to finish before starting another one.",
        )

    background_tasks.add_task(
        _run_background_scan,
        queries=payload.queries,
        max_apps_per_query=payload.max_apps_per_query or 5,
        max_reviews_per_app=payload.max_reviews_per_app or 30,
    )

    return {
        "message": "Scan execution accepted and launched in background.",
        "status": "accepted",
        "budget": {
            "max_apps_per_query": payload.max_apps_per_query or 5,
            "max_reviews_per_app": payload.max_reviews_per_app or 30,
        },
    }
