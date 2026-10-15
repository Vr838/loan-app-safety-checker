"""Application endpoints for listing, details, evidence, and historical assessments."""

import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, func, select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import App, Evidence, RiskAssessment
from app.schemas.app import AppDetail, AppListItem, AppListResponse
from app.schemas.evidence import EvidenceResponse
from app.schemas.risk import RiskAssessmentResponse

router = APIRouter(prefix="/apps", tags=["Apps"])


@router.get("", response_model=AppListResponse)
async def list_apps(
    q: Optional[str] = Query(None, description="Search query across app title, package ID, or developer"),
    risk_category: Optional[str] = Query(None, description="Filter by risk category (Lower concern, Caution, High concern, Insufficient evidence)"),
    min_rating: Optional[float] = Query(None, ge=0.0, le=5.0, description="Minimum Google Play rating"),
    sort_by: str = Query("risk_desc", description="Sort order: risk_desc, risk_asc, rating_desc, rating_asc, name_asc, last_scanned"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
):
    """Returns a paginated list of analyzed apps with search, filters, and latest risk assessments."""
    # Build base query
    stmt = select(App).options(
        selectinload(App.assessments),
    )

    # 1. Search filter
    if q:
        search_term = f"%{q.strip()}%"
        stmt = stmt.where(
            (App.title.ilike(search_term))
            | (App.package_id.ilike(search_term))
            | (App.developer.ilike(search_term))
        )

    # 2. Rating filter
    if min_rating is not None:
        stmt = stmt.where(App.rating >= min_rating)

    # Execute total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    await db.scalar(count_stmt) or 0

    # Fetch all matching apps for ordering
    result = await db.execute(stmt)
    apps = result.scalars().all()

    # Attach latest assessment to each app
    items_with_assessment = []
    for app in apps:
        latest_assessment = app.assessments[0] if app.assessments else None

        # Risk category filter
        if risk_category:
            if not latest_assessment or latest_assessment.risk_category.lower() != risk_category.strip().lower():
                continue

        app_item = AppListItem(
            package_id=app.package_id,
            title=app.title,
            developer=app.developer,
            developer_id=app.developer_id,
            developer_email=app.developer_email,
            developer_website=app.developer_website,
            developer_address=app.developer_address,
            category=app.category,
            rating=app.rating,
            rating_count=app.rating_count,
            installs_text=app.installs_text,
            installs_approx=app.installs_approx,
            privacy_policy_url=app.privacy_policy_url,
            store_url=app.store_url,
            icon_url=app.icon_url,
            summary=app.summary,
            is_active=app.is_active,
            first_discovered_at=app.first_discovered_at,
            last_scanned_at=app.last_scanned_at,
            latest_assessment=RiskAssessmentResponse.model_validate(latest_assessment) if latest_assessment else None,
        )
        items_with_assessment.append(app_item)

    # 3. Sorting
    if sort_by == "risk_desc":
        items_with_assessment.sort(key=lambda x: (x.latest_assessment.overall_score if x.latest_assessment else -1), reverse=True)
    elif sort_by == "risk_asc":
        items_with_assessment.sort(key=lambda x: (x.latest_assessment.overall_score if x.latest_assessment else 999))
    elif sort_by == "rating_desc":
        items_with_assessment.sort(key=lambda x: x.rating, reverse=True)
    elif sort_by == "rating_asc":
        items_with_assessment.sort(key=lambda x: x.rating)
    elif sort_by == "name_asc":
        items_with_assessment.sort(key=lambda x: x.title.lower())
    elif sort_by == "last_scanned":
        items_with_assessment.sort(key=lambda x: x.last_scanned_at, reverse=True)

    # Adjusted total after category filter
    filtered_total = len(items_with_assessment)
    total_pages = math.ceil(filtered_total / page_size) if filtered_total > 0 else 1

    # 4. Pagination slice
    start_idx = (page - 1) * page_size
    paginated_items = items_with_assessment[start_idx : start_idx + page_size]

    return AppListResponse(
        items=paginated_items,
        total=filtered_total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{package_id}", response_model=AppDetail)
async def get_app_detail(package_id: str, db: AsyncSession = Depends(get_db)):
    """Returns comprehensive app profile, latest score breakdown, evidence, and history."""
    stmt = (
        select(App)
        .where(App.package_id == package_id)
        .options(
            selectinload(App.assessments),
            selectinload(App.evidence_items),
        )
    )
    result = await db.execute(stmt)
    app = result.scalar_one_or_none()

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with package ID '{package_id}' not found in registry.",
        )

    latest_assessment = app.assessments[0] if app.assessments else None

    return AppDetail(
        package_id=app.package_id,
        title=app.title,
        developer=app.developer,
        developer_id=app.developer_id,
        developer_email=app.developer_email,
        developer_website=app.developer_website,
        developer_address=app.developer_address,
        category=app.category,
        rating=app.rating,
        rating_count=app.rating_count,
        installs_text=app.installs_text,
        installs_approx=app.installs_approx,
        privacy_policy_url=app.privacy_policy_url,
        store_url=app.store_url,
        icon_url=app.icon_url,
        summary=app.summary,
        is_active=app.is_active,
        first_discovered_at=app.first_discovered_at,
        last_scanned_at=app.last_scanned_at,
        latest_assessment=RiskAssessmentResponse.model_validate(latest_assessment) if latest_assessment else None,
        evidence_items=[EvidenceResponse.model_validate(e) for e in app.evidence_items],
        recent_assessments=[RiskAssessmentResponse.model_validate(a) for a in app.assessments[:10]],
    )


@router.get("/{package_id}/evidence", response_model=List[EvidenceResponse])
async def get_app_evidence(package_id: str, db: AsyncSession = Depends(get_db)):
    """Returns all verifiable external and regulatory evidence records associated with an app."""
    # Check app exists
    app_exists = await db.scalar(select(func.count(App.package_id)).where(App.package_id == package_id))
    if not app_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with package ID '{package_id}' not found.",
        )

    stmt = select(Evidence).where(Evidence.package_id == package_id).order_by(desc(Evidence.access_timestamp))
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [EvidenceResponse.model_validate(r) for r in records]


@router.get("/{package_id}/history", response_model=List[RiskAssessmentResponse])
async def get_app_history(package_id: str, db: AsyncSession = Depends(get_db)):
    """Returns historical snapshots of risk assessments for change tracking."""
    app_exists = await db.scalar(select(func.count(App.package_id)).where(App.package_id == package_id))
    if not app_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with package ID '{package_id}' not found.",
        )

    stmt = select(RiskAssessment).where(RiskAssessment.package_id == package_id).order_by(desc(RiskAssessment.assessment_timestamp))
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [RiskAssessmentResponse.model_validate(r) for r in records]
