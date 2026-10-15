"""Main FastAPI Application entrypoint for Loan App Safety Checker."""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.core.config import settings
from app.db.models import ScanRun
from app.db.session import AsyncSessionLocal, Base, async_engine
from app.api.routes import health
from app.api.router import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("loan_safety_checker")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown routines."""
    logger.info("Initializing Loan App Safety Checker Backend...")
    # Initialize database tables
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # BackgroundTasks run only in this process. A process restart therefore
    # cannot resume a previous task, so make that state visible and allow a
    # new scan to start.
    async with AsyncSessionLocal() as session:
        interrupted_scans = list(
            await session.scalars(select(ScanRun).where(ScanRun.status == "running"))
        )
        for scan in interrupted_scans:
            scan.status = "failed"
            scan.completed_at = datetime.now(timezone.utc)
            scan.error_summary = [
                *(scan.error_summary or []),
                {"error": "Scan stopped because the analysis service restarted."},
            ]
        if interrupted_scans:
            await session.commit()
            logger.warning("Marked %d interrupted scan(s) as failed.", len(interrupted_scans))

    yield
    logger.info("Shutting down Loan App Safety Checker Backend...")
    await async_engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Evidence-driven research and risk analysis engine for public loan applications.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler ensuring consistent error responses without leaking internal credentials."""
    logger.exception("Unhandled server exception processing request %s: %s", request.url.path, str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing the request.",
            "path": request.url.path,
        },
    )


# Attach routes
app.include_router(health.router)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Root entrypoint linking to documentation and health check."""
    return {
        "name": settings.PROJECT_NAME,
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
        "api_v1": settings.API_V1_PREFIX,
    }
