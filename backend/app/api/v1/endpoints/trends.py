from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import SessionLocal, get_db
from app.models.trend_collection_job import TrendCollectionJob
from app.models.trend_content import TrendContent
from app.models.user import User
from app.schemas.trend import (
    KeywordAnalysisItem,
    PlatformSearchTarget,
    TrendCollectRequest,
    TrendCollectionJobCreate,
    TrendCollectionJobRead,
    TrendLinkImportRequest,
    TrendLinkImportTarget,
    TrendKnowledgeDigestRequest,
    TrendKnowledgeDigestResponse,
    TrendRead,
)
from app.services.trend_service import (
    analyze_keywords,
    build_platform_search_target,
    build_xhs_link_import_target,
    create_collection_job,
    create_trend_knowledge_digest,
    create_trend_asset,
    list_collection_jobs,
    trend_report as build_trend_report,
)
from app.services.trend_browser_collector import run_browser_collection_job


router = APIRouter()


def _run_collection_job_in_background(job_id: int) -> None:
    db = SessionLocal()
    try:
        run_browser_collection_job(
            db=db,
            job_id=job_id,
            headless=False,
            operator_wait_seconds=0,
            max_scrolls=6,
        )
    except HTTPException as exc:
        job = db.get(TrendCollectionJob, job_id)
        if job is not None and job.status in {"queued", "running"}:
            job.status = "failed"
            job.error = str(exc.detail)
            job.result_summary = {
                "message": str(exc.detail),
                "collected_items": 0,
            }
            db.commit()
    except Exception:
        job = db.get(TrendCollectionJob, job_id)
        if job is not None and job.status in {"queued", "running"}:
            job.status = "failed"
            job.error = "Background collection failed. Check local browser setup and session state."
            job.result_summary = {
                "message": job.error,
                "collected_items": 0,
            }
            db.commit()
    finally:
        db.close()


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


@router.get("/search-target", response_model=PlatformSearchTarget)
def get_platform_search_target(
    platform: str = Query(pattern="^(xiaohongshu|douyin)$"),
    keyword: str = Query(min_length=1, max_length=120),
) -> PlatformSearchTarget:
    return build_platform_search_target(platform=platform, keyword=keyword)


@router.post("/link-import-target", response_model=TrendLinkImportTarget)
def get_link_import_target(payload: TrendLinkImportRequest) -> TrendLinkImportTarget:
    return build_xhs_link_import_target(payload)


@router.post("/jobs", response_model=TrendCollectionJobRead)
def create_trend_collection_job(
    payload: TrendCollectionJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrendCollectionJobRead:
    job = create_collection_job(db, payload, current_user)
    background_tasks.add_task(_run_collection_job_in_background, job.id)
    return TrendCollectionJobRead.model_validate(job)


@router.post("/knowledge-digest", response_model=TrendKnowledgeDigestResponse)
def create_knowledge_digest(
    payload: TrendKnowledgeDigestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrendKnowledgeDigestResponse:
    return create_trend_knowledge_digest(
        db=db,
        payload=payload,
        current_user=current_user,
    )


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


@router.get("/jobs/{job_id}", response_model=TrendCollectionJobRead)
def get_trend_collection_job(
    job_id: int,
    db: Session = Depends(get_db),
) -> TrendCollectionJobRead:
    job = db.get(TrendCollectionJob, job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trend collection job was not found.",
        )
    return TrendCollectionJobRead.model_validate(job)


@router.post("/collect", response_model=TrendRead)
def collect_trend(
    payload: TrendCollectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrendRead:
    item = create_trend_asset(db, payload, current_user)
    return TrendRead.model_validate(item)
