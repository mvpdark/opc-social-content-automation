from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.content import Content
from app.models.content_review import ContentReview
from app.models.user import User
from app.schemas.review import ContentAiReviewRequest, ContentReviewRequest
from app.services.content_service import PromptPackage, record_generation_log
from app.services.model_router import load_prompt, model_router


EDITABLE_STATUSES = {"draft", "rewritten", "review_pending", "changes_requested"}


def get_content_or_404(db: Session, content_id: int) -> Content:
    content = db.get(Content, content_id)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content was not found.",
        )
    return content


def request_human_review(db: Session, content: Content) -> Content:
    if content.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Content cannot enter review from status: {content.status}.",
        )
    content.status = "review_pending"
    db.commit()
    db.refresh(content)
    return content


def record_human_review(
    db: Session,
    content: Content,
    payload: ContentReviewRequest,
    current_user: User,
) -> ContentReview:
    if content.status == "published":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Published content cannot be reviewed again.",
        )

    review = ContentReview(
        content_id=content.id,
        reviewer_id=current_user.id,
        review_type="human",
        status=payload.decision,
        score=payload.score,
        notes=payload.notes,
        risk_flags=payload.risk_flags,
    )
    content.status = payload.decision
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def list_reviews(db: Session, content_id: int) -> list[ContentReview]:
    statement = (
        select(ContentReview)
        .where(ContentReview.content_id == content_id)
        .order_by(desc(ContentReview.created_at))
    )
    return list(db.scalars(statement).all())


def build_ai_review_prompt_package(
    content: Content,
    payload: ContentAiReviewRequest,
    current_user: User,
) -> PromptPackage:
    return PromptPackage(
        prompt_name="review",
        prompt_template=load_prompt("review"),
        payload={
            "content_id": content.id,
            "platform": content.platform,
            "title": content.title,
            "body": content.body,
            "tags": content.tags or [],
            "instruction": payload.instruction,
            "user": {
                "id": current_user.id,
                "role": current_user.role,
            },
        },
    )


def run_ai_review(
    db: Session,
    content: Content,
    payload: ContentAiReviewRequest,
    current_user: User,
) -> ContentReview:
    package = build_ai_review_prompt_package(content, payload, current_user)
    try:
        result = model_router.review_model(package.prompt_name, package.payload)
    except HTTPException as exc:
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="content_review",
            model="review_model",
            package=package,
            result="",
            status="provider_not_configured",
            error=str(exc.detail),
        )
        raise

    review = ContentReview(
        content_id=content.id,
        reviewer_id=current_user.id,
        review_type="model",
        status="completed",
        score=None,
        notes=result,
        risk_flags=[],
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    record_generation_log(
        db=db,
        current_user=current_user,
        purpose="content_review",
        model="review_model",
        package=package,
        result=result,
        status="success",
    )
    return review
