"""API Router assembling all v1 routes."""

from fastapi import APIRouter
from app.api.routes import apps, scans

api_router = APIRouter()
api_router.include_router(apps.router)
api_router.include_router(scans.router)
