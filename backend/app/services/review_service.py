from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.task_states import TaskState
from app.models.content import Content
from app.models.content_review import ContentReview
from app.models.user import User
from app.schemas.review import (
    ContentAiReviewRequest,
    ContentReviewRequest,
    FeedbackCategoryStats,
    FeedbackStatsRead,
    VALID_FEEDBACK_CATEGORIES,
)
from app.services.content_service import PromptPackage, record_generation_log
from app.services.model_router import load_prompt, model_router

EDITABLE_STATUSES = {"draft", "rewritten", "review_pending", "changes_requested"}
HUMAN_REVIEWABLE_STATUSES = {"draft", "rewritten", "review_pending"}


def get_content_or_404(db: Session, content_id: int) -> Content:
    content = db.get(Content, content_id)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    return content


def request_human_review(db: Session, content: Content) -> Content:
    if content.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"当前状态不能进入审核：{content.status}。",
        )
    content.status = "review_pending"
    content.task_state = TaskState.REVIEWING.value
    content.task_state_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(content)
    return content


def record_human_review(
    db: Session,
    content: Content,
    payload: ContentReviewRequest,
    current_user: User,
) -> ContentReview:
    if content.status not in HUMAN_REVIEWABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"当前状态不能记录人工审核：{content.status}。请先回到草稿、改写或待确认流程。",
        )

    feedback_category = payload.feedback_category
    if feedback_category is not None and feedback_category not in VALID_FEEDBACK_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"feedback_category 取值无效：{feedback_category}，"
                f"仅支持 {', '.join(sorted(VALID_FEEDBACK_CATEGORIES))}。"
            ),
        )

    feedback_tags = payload.feedback_tags
    if feedback_tags is not None:
        feedback_tags = [str(tag).strip() for tag in feedback_tags if str(tag).strip()]
        if not feedback_tags:
            feedback_tags = None

    review = ContentReview(
        content_id=content.id,
        reviewer_id=current_user.id,
        review_type="human",
        status=payload.decision,
        score=payload.score,
        notes=payload.notes,
        risk_flags=payload.risk_flags,
        feedback_tags=feedback_tags,
        feedback_category=feedback_category,
    )
    content.status = payload.decision
    if payload.decision == "approved":
        content.task_state = TaskState.READY_TO_PUBLISH.value
    else:
        # rejected / changes_requested -> 回到草稿就绪，等待修改后重新提交。
        content.task_state = TaskState.DRAFT_READY.value
    content.task_state_updated_at = datetime.now(timezone.utc)
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


def list_human_review_queue(
    db: Session,
    *,
    limit: int,
    platform: str | None = None,
) -> list[Content]:
    statement = (
        select(Content)
        .where(Content.status.in_(HUMAN_REVIEWABLE_STATUSES))
        .order_by(desc(Content.created_at))
        .limit(limit)
    )
    if platform:
        statement = statement.where(Content.platform == platform)
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

    record_generation_log(
        db=db,
        current_user=current_user,
        purpose="content_review",
        model="review_model",
        package=package,
        result=result,
        status="success",
    )
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
    return review


def get_feedback_tag_stats(db: Session, limit: int = 100) -> FeedbackStatsRead:
    """统计最近审核的反馈标签分布（SSB-8）。

    只统计人工审核（review_type=human）且带有 feedback_category 的记录。
    返回各分类的标签使用次数，用于指导未来生成。
    """
    statement = (
        select(ContentReview)
        .where(
            ContentReview.review_type == "human",
            ContentReview.feedback_category.is_not(None),
        )
        .order_by(desc(ContentReview.created_at))
        .limit(limit)
    )
    reviews = list(db.scalars(statement).all())

    # 按分类聚合标签计数。
    category_tags: dict[str, dict[str, int]] = {}
    category_totals: dict[str, int] = {}
    for review in reviews:
        category = review.feedback_category or ""
        if not category:
            continue
        bucket = category_tags.setdefault(category, {})
        category_totals[category] = category_totals.get(category, 0) + 1
        tags = review.feedback_tags or []
        for tag in tags:
            tag_text = str(tag).strip()
            if not tag_text:
                continue
            bucket[tag_text] = bucket.get(tag_text, 0) + 1

    categories: list[FeedbackCategoryStats] = []
    for category in VALID_FEEDBACK_CATEGORIES:
        tags = category_tags.get(category, {})
        categories.append(
            FeedbackCategoryStats(
                category=category,
                total=category_totals.get(category, 0),
                tags=dict(sorted(tags.items(), key=lambda item: (-item[1], item[0]))),
            )
        )

    # 同时收录未归入预设分类的自定义分类。
    for category in category_tags:
        if category in VALID_FEEDBACK_CATEGORIES:
            continue
        tags = category_tags[category]
        categories.append(
            FeedbackCategoryStats(
                category=category,
                total=category_totals.get(category, 0),
                tags=dict(sorted(tags.items(), key=lambda item: (-item[1], item[0]))),
            )
        )

    return FeedbackStatsRead(
        total_reviews=len(reviews),
        categories=categories,
    )
