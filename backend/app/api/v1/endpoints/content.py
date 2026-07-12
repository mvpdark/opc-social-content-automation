import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.task_states import (
    TaskState,
    allowed_next_states,
    task_state_label,
    transition_task,
)
from app.db.session import get_db
from app.models.content import Content
from app.models.user import User
from app.schemas.content import (
    ContentGenerateRequest,
    ContentRead,
    ContentRewriteRequest,
    ContentSourcePreviewRead,
    TaskStateRead,
    TaskStateTransitionRequest,
)
from app.schemas.content_variant import (
    ContentVariantRead,
    VariantGenerateRequest,
    VariantGenerateResponse,
    VariantSelectResponse,
)
from app.schemas.review import (
    ContentAiReviewRequest,
    ContentReviewRead,
    ContentReviewRequest,
    FeedbackStatsRead,
)
from app.services.content_service import (
    build_content_source_context,
    delete_content_with_assets,
    generate_content_draft,
    rewrite_content_body,
)
from app.services.review_service import (
    get_content_or_404,
    get_feedback_tag_stats,
    list_human_review_queue,
    list_reviews,
    record_human_review,
    request_human_review,
    run_ai_review,
)
from app.services.variant_service import (
    generate_variants_for_content,
    list_variants_for_content,
    select_variant,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/generate", response_model=ContentRead)
def generate_content(
    payload: ContentGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRead:
    content = generate_content_draft(db, payload, current_user)
    return ContentRead.model_validate(content)


@router.post("/generate-variants", response_model=VariantGenerateResponse)
def generate_variants(
    payload: VariantGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VariantGenerateResponse:
    """生成多个标题/开头/封面标签变体并自动评分（SSB-7）。"""
    content = db.get(Content, payload.content_id, with_for_update=True)
    if content is None or content.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    variants = generate_variants_for_content(db, content, payload, current_user)
    return VariantGenerateResponse(
        content_id=content.id,
        variants=[ContentVariantRead.model_validate(item) for item in variants],
    )


@router.get("/feedback-stats", response_model=FeedbackStatsRead)
def get_feedback_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(default=100, ge=1, le=500),
) -> FeedbackStatsRead:
    """返回最近审核的反馈标签分布，用于指导未来生成（SSB-8）。"""
    return get_feedback_tag_stats(db, limit=limit, user_id=current_user.id)


@router.post("/source-preview", response_model=ContentSourcePreviewRead)
def preview_content_sources(
    payload: ContentGenerateRequest,
    current_user: User = Depends(get_current_user),
) -> ContentSourcePreviewRead:
    # current_user 依赖用于强制 AUTH_REQUIRED 认证。source context 基于
    # 共享 ZSCJ 知识库，暂未按 user_id 隔离；未来改进：为
    # build_content_source_context 增加 user_id 参数以支持按用户过滤。
    _ = current_user  # noqa: F841 — 保留认证依赖
    source_context = build_content_source_context(payload)
    if isinstance(source_context, dict) and "error" in source_context:
        logger.warning(
            "build_content_source_context 返回错误: %s",
            source_context.get("error"),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=source_context.get("error", "源上下文构建失败"),
        )
    return ContentSourcePreviewRead(source_context=source_context)


@router.post("/rewrite", response_model=ContentRead)
def rewrite_content(
    payload: ContentRewriteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRead:
    content = db.get(Content, payload.content_id, with_for_update=True)
    if content is None or content.user_id != current_user.id:
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
    content = db.get(Content, content_id)
    if content is None or content.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到这条内容。")
    content = request_human_review(db, content, current_user)
    return ContentRead.model_validate(content)


@router.post("/{content_id}/reviews", response_model=ContentReviewRead)
def create_human_review(
    content_id: int,
    payload: ContentReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentReviewRead:
    content = db.get(Content, content_id)
    if content is None or content.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到这条内容。")
    review = record_human_review(db, content, payload, current_user)
    return ContentReviewRead.model_validate(review)


@router.get("/{content_id}/reviews", response_model=list[ContentReviewRead])
def get_reviews(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ContentReviewRead]:
    content = db.get(Content, content_id)
    if content is None or content.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    return [
        ContentReviewRead.model_validate(review)
        for review in list_reviews(db, content_id, current_user.id)
    ]


@router.post("/{content_id}/ai-review", response_model=ContentReviewRead)
def create_ai_review(
    content_id: int,
    payload: ContentAiReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentReviewRead:
    content = db.get(Content, content_id)
    if content is None or content.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到这条内容。")
    review = run_ai_review(db, content, payload, current_user)
    return ContentReviewRead.model_validate(review)


@router.get("/{content_id}/variants", response_model=list[ContentVariantRead])
def list_variants(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ContentVariantRead]:
    """列出指定内容的所有变体（SSB-7）。"""
    content = db.get(Content, content_id)
    if content is None or content.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    return [
        ContentVariantRead.model_validate(item)
        for item in list_variants_for_content(db, content_id, current_user.id)
    ]


@router.post(
    "/{content_id}/variants/{variant_id}/select",
    response_model=VariantSelectResponse,
)
def select_content_variant(
    content_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VariantSelectResponse:
    """标记选中的变体，同类型其他变体自动取消选中（SSB-7）。"""
    content = db.get(Content, content_id)
    if content is None or content.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到这条内容。")
    variant = select_variant(db, content_id, variant_id, current_user.id)
    return VariantSelectResponse.model_validate(variant)


@router.get("/list", response_model=list[ContentRead])
def list_contents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    platform: str | None = Query(default=None, max_length=40),
    status_filter: str | None = Query(default=None, alias="status", max_length=40),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[ContentRead]:
    statement = (
        select(Content)
        .where(Content.user_id == current_user.id)
        .order_by(desc(Content.created_at))
        .limit(limit)
        .offset(offset)
    )
    if platform:
        statement = statement.where(Content.platform == platform)
    if status_filter:
        statement = statement.where(Content.status == status_filter)
    return [ContentRead.model_validate(item) for item in db.scalars(statement).all()]


@router.get("/review-queue", response_model=list[ContentRead])
def list_review_queue_contents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    platform: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=20, ge=1, le=50),
) -> list[ContentRead]:
    return [
        ContentRead.model_validate(item)
        for item in list_human_review_queue(db, platform=platform, limit=limit, user_id=current_user.id)
    ]


@router.get("/{content_id}", response_model=ContentRead)
def get_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRead:
    content = db.get(Content, content_id)
    if content is None or content.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    return ContentRead.model_validate(content)


@router.get("/{content_id}/task-state", response_model=TaskStateRead)
def get_task_state(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskStateRead:
    """返回当前任务状态和可转换状态列表（BACKLOG #14）。"""
    content = db.get(Content, content_id)
    if content is None or content.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    current_state = content.task_state or TaskState.NEW.value
    return TaskStateRead(
        content_id=content.id,
        task_state=current_state,
        task_state_label=task_state_label(current_state),
        allowed_next_states=allowed_next_states(current_state),
    )


@router.post("/{content_id}/task-state", response_model=TaskStateRead)
def transition_task_state(
    content_id: int,
    payload: TaskStateTransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskStateRead:
    """手动转换任务状态（BACKLOG #14）。"""
    # 使用悲观锁加载，消除 TOCTOU 窗口（低危）：避免无锁读取后
    # transition_task 内部重新加锁期间记录被并发修改或删除。
    existing = db.get(Content, content_id, with_for_update=True)
    if existing is None or existing.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到这条内容。")
    with db.begin_nested():
        content = transition_task(db, content_id, payload.to_state, user_id=current_user.id)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return TaskStateRead(
        content_id=content.id,
        task_state=content.task_state or TaskState.NEW.value,
        task_state_label=task_state_label(content.task_state or TaskState.NEW.value),
        allowed_next_states=allowed_next_states(
            content.task_state or TaskState.NEW.value
        ),
    )


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    content = db.get(Content, content_id)
    if content is None or content.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    delete_content_with_assets(db, content_id, user_id=current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
