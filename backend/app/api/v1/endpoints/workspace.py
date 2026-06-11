from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.content import Content
from app.models.knowledge_base import KnowledgeBase
from app.models.publish_record import PublishRecord
from app.models.trend_content import TrendContent
from app.models.user import User
from app.schemas.workspace import (
    DependencyReport,
    ExportRequest,
    ExportResponse,
    PublishRecordCreate,
    PublishRecordRead,
    ProviderKeyUpdateRequest,
    ProviderStatusItem,
    WorkspaceContentItem,
)
from app.services.dependency_service import dependency_report
from app.services.workspace_service import (
    apply_provider_key_settings,
    approved_content_items,
    create_export_package,
    list_publish_records,
    provider_status_items,
)


router = APIRouter()


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)) -> dict[str, object]:
    counts = {
        "users": db.scalar(select(func.count(User.id))) or 0,
        "contents": db.scalar(select(func.count(Content.id))) or 0,
        "approved_contents": db.scalar(
            select(func.count(Content.id)).where(Content.status == "approved")
        )
        or 0,
        "review_pending_contents": db.scalar(
            select(func.count(Content.id)).where(Content.status == "review_pending")
        )
        or 0,
        "published_contents": db.scalar(
            select(func.count(Content.id)).where(Content.status == "published")
        )
        or 0,
        "knowledge_items": db.scalar(select(func.count(KnowledgeBase.id))) or 0,
        "trend_items": db.scalar(select(func.count(TrendContent.id))) or 0,
        "publish_records": db.scalar(select(func.count(PublishRecord.id))) or 0,
    }
    pipeline = [
        {"name": "Data", "status": "foundation"},
        {"name": "Knowledge Base", "status": "next"},
        {"name": "Content", "status": "planned"},
        {"name": "Review", "status": "planned"},
        {"name": "Publishing", "status": "human_approval_required"},
    ]
    return {"counts": counts, "pipeline": pipeline}


@router.get("/provider-status", response_model=list[ProviderStatusItem])
def get_provider_status() -> list[ProviderStatusItem]:
    return provider_status_items()


@router.get("/dependencies", response_model=DependencyReport)
def get_dependency_report() -> DependencyReport:
    return DependencyReport.model_validate(dependency_report())


@router.post("/provider-keys", response_model=list[ProviderStatusItem])
def update_provider_keys(
    payload: ProviderKeyUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> list[ProviderStatusItem]:
    _ = current_user
    return apply_provider_key_settings(payload)


@router.get("/approved-content", response_model=list[WorkspaceContentItem])
def get_approved_content(
    db: Session = Depends(get_db),
    limit: int = 20,
) -> list[WorkspaceContentItem]:
    return [
        WorkspaceContentItem(
            id=content.id,
            platform=content.platform,
            title=content.title,
            tags=content.tags,
            status=content.status,
        )
        for content in approved_content_items(db, limit=limit)
    ]


@router.post("/export", response_model=ExportResponse)
def export_workspace(
    payload: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExportResponse:
    return create_export_package(db=db, payload=payload, current_user=current_user)


@router.get("/publish-records", response_model=list[PublishRecordRead])
def get_publish_records(
    db: Session = Depends(get_db),
    platform: str | None = None,
    limit: int = 20,
) -> list[PublishRecordRead]:
    return [
        PublishRecordRead.model_validate(record)
        for record in list_publish_records(db=db, platform=platform, limit=limit)
    ]


@router.post("/publish-record")
def create_publish_record(
    payload: PublishRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    content = db.get(Content, payload.content_id)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content was not found.",
        )
    if content.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only human-approved content can be recorded as published.",
        )

    record = PublishRecord(
        content_id=payload.content_id,
        user_id=current_user.id,
        platform=payload.platform,
        external_url=payload.external_url,
        status="published",
    )
    db.add(record)
    content.status = "published"
    db.commit()
    db.refresh(record)
    return {
        "id": record.id,
        "content_id": record.content_id,
        "platform": record.platform,
        "status": record.status,
    }
