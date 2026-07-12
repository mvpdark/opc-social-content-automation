import logging

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.task_states import TaskState, can_transition, transition_task
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
from app.services.content_service import PromptPackage, _safe_commit, record_generation_log
from app.services.model_router import load_prompt, model_router

logger = logging.getLogger(__name__)

EDITABLE_STATUSES = {"draft", "rewritten", "review_pending", "changes_requested", "rejected"}
HUMAN_REVIEWABLE_STATUSES = {"draft", "rewritten", "review_pending"}


def get_content_or_404(db: Session, content_id: int, user_id: int) -> Content:
    content = db.get(Content, content_id)
    if content is None or content.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    return content


def request_human_review(db: Session, content: Content, current_user: User) -> Content:
    if content.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"当前状态不能进入审核：{content.status}。",
        )
    target_state = TaskState.REVIEWING
    current_state = content.task_state or TaskState.NEW.value
    if not can_transition(current_state, target_state):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"不允许的状态转换：{current_state} -> {target_state.value}",
        )
    if current_state != target_state.value:
        # 使用悲观锁重新加载 content，避免基于过期数据检查 status（TOCTOU）
        content = db.get(Content, content.id, with_for_update=True)
        if content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="未找到这条内容。",
            )
        # 悲观锁重载后重新检查 status，防止并发修改
        if content.status not in EDITABLE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"当前状态不能进入审核：{content.status}。",
            )
        with db.begin_nested():
            content = transition_task(db, content.id, target_state, user_id=current_user.id)
        # Set status *after* the savepoint succeeds so that a transition_task
        # failure (which rolls back the savepoint) does not leave a stale
        # "review_pending" on the Python object.
        content.status = "review_pending"
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
        try:
            db.refresh(content)
        except Exception:
            logger.warning("db.refresh failed after successful commit", exc_info=True)
    else:
        # 即使状态相同也使用悲观锁重新加载，避免并发修改（低危 TOCTOU）。
        content = db.get(Content, content.id, with_for_update=True)
        if content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="未找到这条内容。",
            )
        content.status = "review_pending"
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
        try:
            db.refresh(content)
        except Exception:
            logger.warning("db.refresh failed after successful commit", exc_info=True)
    return content


def record_human_review(
    db: Session,
    content: Content,
    payload: ContentReviewRequest,
    current_user: User,
) -> ContentReview:
    # Re-load with pessimistic lock to prevent concurrent review race conditions.
    # SQLite silently ignores with_for_update; PostgreSQL enforces row-level locking.
    content = db.get(Content, content.id, with_for_update=True)
    if content is None:
        # 并发删除可能导致记录不存在，避免 AttributeError（中危）。
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    # 悲观锁重载后必须重新校验归属，防止 content.user_id 被并发篡改（中危）。
    if content.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
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

    # 先确定目标状态并校验 task_state 是否允许转换，避免修改 status 后
    # transition_task 失败导致整个事务回滚、审核记录丢失。
    if payload.decision == "approved":
        target_state = TaskState.READY_TO_PUBLISH
    else:
        # rejected / changes_requested -> 回到草稿就绪，等待修改后重新提交。
        target_state = TaskState.DRAFT_READY
    current_state = content.task_state or TaskState.NEW.value
    if not can_transition(current_state, target_state):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"不允许的状态转换：{current_state} -> {target_state.value}，"
                "请确认内容已进入审核流程。"
            ),
        )

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
    db.add(review)
    if current_state != target_state.value:
        # 使用 savepoint 包裹 transition_task：其内部 db.flush() 会释放
        # savepoint 而非提前提交外层事务，使外层失败时可整体回滚，
        # 保证 review 记录与 task_state 转换的原子性（BUG-8，参考
        # workspace.py 的 create_publish_record 做法）。
        with db.begin_nested():
            content = transition_task(db, content.id, target_state, user_id=current_user.id)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    try:
        db.refresh(review)
    except Exception:
        logger.warning("db.refresh(review) failed after commit", exc_info=True)
    return review


def list_reviews(db: Session, content_id: int, user_id: int) -> list[ContentReview]:
    # Defense-in-depth: only return reviews whose content belongs to the user.
    user_content_ids = select(Content.id).where(Content.user_id == user_id)
    statement = (
        select(ContentReview)
        .where(
            ContentReview.content_id == content_id,
            ContentReview.content_id.in_(user_content_ids),
        )
        .order_by(desc(ContentReview.created_at))
    )
    return list(db.scalars(statement).all())


def list_human_review_queue(
    db: Session,
    *,
    limit: int,
    platform: str | None = None,
    user_id: int,
) -> list[Content]:
    statement = (
        select(Content)
        .where(Content.status.in_(HUMAN_REVIEWABLE_STATUSES))
        .where(Content.user_id == user_id)
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
    # 悲观锁重新加载并校验归属，防止 TOCTOU 竞态条件
    # 与 record_human_review 保持一致的安全模式
    content = db.get(Content, content.id, with_for_update=True)
    if content is None or content.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    if content.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"当前状态不能执行AI审核：{content.status}。",
        )
    package = build_ai_review_prompt_package(content, payload, current_user)
    try:
        result = model_router.review_model(package.prompt_name, package.payload)
    except HTTPException as exc:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="content_review",
                model="review_model",
                package=package,
                result="",
                log_status="provider_not_configured",
                error=str(exc.detail),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise
    except Exception as exc:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="content_review",
                model="review_model",
                package=package,
                result="",
                log_status="error",
                error=str(exc),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
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
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        # commit 失败时记录 failure 审计日志，避免 success 日志先于 commit 提交后不可回滚。
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="content_review",
                model="review_model",
                package=package,
                result=result,
                log_status="db_error",
                error=str(exc),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log after commit failure", exc_info=True)
        raise
    # 审计日志在 ContentReview commit 成功后再记录 success，确保只有真正成功时才写 success。
    _gen_log = record_generation_log(
        db=db,
        current_user=current_user,
        purpose="content_review",
        model="review_model",
        package=package,
        result=result,
        log_status="success",
    )
    if _gen_log is None:
        logger.warning(
            "record_generation_log returned None for content_review (user=%s)",
            current_user.id,
        )
    _safe_commit(db)
    try:
        db.refresh(review)
    except Exception:
        logger.warning("db.refresh(review) failed after commit", exc_info=True)
    return review


def get_feedback_tag_stats(db: Session, *, user_id: int, limit: int = 100) -> FeedbackStatsRead:
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
    user_content_ids = select(Content.id).where(Content.user_id == user_id)
    statement = statement.where(ContentReview.content_id.in_(user_content_ids))
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
