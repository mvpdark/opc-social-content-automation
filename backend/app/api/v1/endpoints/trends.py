from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.trend_content import TrendContent
from app.models.user import User
from app.schemas.trend import (
    KeywordAnalysisItem,
    TrendCollectRequest,
    TrendCollectionJobCreate,
    TrendCollectionJobRead,
    TrendRead,
)
from app.services.trend_service import (
    analyze_keywords,
    create_collection_job,
    create_trend_asset,
    list_collection_jobs,
    trend_report as build_trend_report,
)


router = APIRouter()


@router.get("/list", response_model=list[TrendRead])
def list_trends(
    db: Session = Depends(get_db),
    platform: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[TrendRead]:
    statement = select(TrendContent).order_by(desc(TrendContent.created_at)).limit(limit)
    if platform:
        statement = statement.where(TrendContent.platform == platform)
    return [TrendRead.model_validate(item) for item in db.scalars(statement).all()]


@router.get("/report")
def trend_report(db: Session = Depends(get_db)) -> dict[str, object]:
    return build_trend_report(db)


@router.get("/keywords", response_model=list[KeywordAnalysisItem])
def keyword_analysis(
    db: Session = Depends(get_db),
    platform: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[KeywordAnalysisItem]:
    return analyze_keywords(db=db, platform=platform, limit=limit)


@router.post("/jobs", response_model=TrendCollectionJobRead)
def create_trend_collection_job(
    payload: TrendCollectionJobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrendCollectionJobRead:
    job = create_collection_job(db, payload, current_user)
    return TrendCollectionJobRead.model_validate(job)


@router.get("/jobs", response_model=list[TrendCollectionJobRead])
def get_trend_collection_jobs(
    db: Session = Depends(get_db),
    platform: str | None = Query(default=None, max_length=40),
    status_filter: str | None = Query(default=None, alias="status", max_length=40),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[TrendCollectionJobRead]:
    return [
        TrendCollectionJobRead.model_validate(job)
        for job in list_collection_jobs(
            db=db,
            platform=platform,
            status_filter=status_filter,
            limit=limit,
        )
    ]


@router.post("/collect", response_model=TrendRead)
def collect_trend(
    payload: TrendCollectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrendRead:
    item = create_trend_asset(db, payload, current_user)
    return TrendRead.model_validate(item)
