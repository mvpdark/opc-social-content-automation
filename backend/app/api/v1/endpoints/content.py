from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.content import Content
from app.models.user import User
from app.schemas.content import (
    ContentGenerateRequest,
    ContentRead,
    ContentSourcePreviewRead,
    ContentRewriteRequest,
)
from app.schemas.review import (
    ContentAiReviewRequest,
    ContentReviewRead,
    ContentReviewRequest,
)
from app.services.content_service import (
    build_content_source_context,
    delete_content_with_assets,
    generate_content_draft,
    rewrite_content_body,
)
from app.services.review_service import (
    get_content_or_404,
    list_human_review_queue,
    list_reviews,
    record_human_review,
    request_human_review,
    run_ai_review,
)


router = APIRouter()


@router.post("/generate", response_model=ContentRead)
def generate_content(
    payload: ContentGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRead:
    content = generate_content_draft(db, payload, current_user)
    return ContentRead.model_validate(content)


@router.post("/source-preview", response_model=ContentSourcePreviewRead)
def preview_content_sources(
    payload: ContentGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentSourcePreviewRead:
    _ = current_user
    source_context = build_content_source_context(db, payload)
    return ContentSourcePreviewRead(source_context=source_context)


@router.post("/rewrite", response_model=ContentRead)
def rewrite_content(
    payload: ContentRewriteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRead:
    content = db.get(Content, payload.content_id)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )

    content = rewrite_content_body(db, content, payload, current_user)
    return ContentRead.model_validate(content)


@router.post("/{content_id}/review-request", response_model=ContentRead)
def request_review(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRead:
    _ = current_user
    content = get_content_or_404(db, content_id)
    content = request_human_review(db, content)
    return ContentRead.model_validate(content)


@router.post("/{content_id}/reviews", response_model=ContentReviewRead)
def create_human_review(
    content_id: int,
    payload: ContentReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentReviewRead:
    content = get_content_or_404(db, content_id)
    review = record_human_review(db, content, payload, current_user)
    return ContentReviewRead.model_validate(review)


@router.get("/{content_id}/reviews", response_model=list[ContentReviewRead])
def get_reviews(content_id: int, db: Session = Depends(get_db)) -> list[ContentReviewRead]:
    get_content_or_404(db, content_id)
    return [ContentReviewRead.model_validate(review) for review in list_reviews(db, content_id)]


@router.post("/{content_id}/ai-review", response_model=ContentReviewRead)
def create_ai_review(
    content_id: int,
    payload: ContentAiReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentReviewRead:
    content = get_content_or_404(db, content_id)
    review = run_ai_review(db, content, payload, current_user)
    return ContentReviewRead.model_validate(review)


@router.get("/list", response_model=list[ContentRead])
def list_contents(
    db: Session = Depends(get_db),
    platform: str | None = Query(default=None, max_length=40),
    status_filter: str | None = Query(default=None, alias="status", max_length=40),
) -> list[ContentRead]:
    statement = select(Content).order_by(desc(Content.created_at))
    if platform:
        statement = statement.where(Content.platform == platform)
    if status_filter:
        statement = statement.where(Content.status == status_filter)
    return [ContentRead.model_validate(item) for item in db.scalars(statement).all()]


@router.get("/review-queue", response_model=list[ContentRead])
def list_review_queue_contents(
    db: Session = Depends(get_db),
    platform: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=20, ge=1, le=50),
) -> list[ContentRead]:
    return [
        ContentRead.model_validate(item)
        for item in list_human_review_queue(db, platform=platform, limit=limit)
    ]


@router.get("/{content_id}", response_model=ContentRead)
def get_content(content_id: int, db: Session = Depends(get_db)) -> ContentRead:
    content = db.get(Content, content_id)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    return ContentRead.model_validate(content)


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    _ = current_user
    delete_content_with_assets(db, content_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
