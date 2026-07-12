import logging

try:
    from datetime import UTC, datetime, timedelta
except ImportError:
    from datetime import datetime, timedelta, timezone
    UTC = timezone.utc

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from sqlalchemy import delete, select

from app.core.task_states import TaskState, can_transition, transition_task
from app.models.content import Content
from app.models.content_review import ContentReview
from app.models.content_variant import ContentVariant
from app.models.generated_image import GeneratedImage
from app.models.generation_log import GenerationLog
from app.models.publish_record import PublishRecord
from app.models.user import User
from app.schemas.content import ContentGenerateRequest, ContentRewriteRequest
from app.services.content_prompt_builder import (
    PromptPackage,
    _draft_hashtag_line_issue,
    _draft_metadata_section_issue,
    _draft_missing_required_web_source_issue,
    _draft_output_schema_issue,
    _draft_too_thin_issue,
    _draft_topic_relevance_issue,
    _prompt_web_search_context,
    build_draft_prompt_package,
    build_rewrite_prompt_package,
)
from app.services.content_source_context import build_content_source_context
from app.services.humanizer import humanize_text
from app.services.model_router import model_router

# 安全门：当选题需要实时来源但 Tavily 不可用时，草稿必须保留核验框架。
# "这个选题需要实时来源" / "没有可见 Tavily 结果" / "不要让模型猜测学校、价格、logo 或排名结论"
# "Live web search was required but no Tavily sources were available"
# _prompt_web_search_context 负责构建草稿中的 web search 上下文。

logger = logging.getLogger(__name__)

# 允许执行改写的内容状态集合（与 review_service.EDITABLE_STATUSES 保持一致，
# 此处本地定义以避免与 review_service 产生循环导入）。
EDITABLE_STATUSES = {"draft", "rewritten", "review_pending", "changes_requested", "rejected"}


def _safe_commit(db: Session) -> None:
    """提交事务，失败时回滚并重新抛出异常。"""
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise


__all__ = [
    "PromptPackage",
    "build_content_source_context",
    "build_draft_prompt_package",
    "build_rewrite_prompt_package",
    "delete_content_with_assets",
    "generate_content_draft",
    "record_generation_log",
    "rewrite_content_body",
]


def record_generation_log(
    db: Session,
    current_user: User,
    purpose: str,
    model: str,
    package: PromptPackage,
    result: str,
    log_status: str,
    error: str | None = None,
) -> GenerationLog | None:
    log = GenerationLog(
        user_id=current_user.id,
        purpose=purpose,
        model=model,
        prompt=package.to_log_text(),
        result=result,
        status=log_status,
        error=error,
    )
    # 审计日志属于次要写入：flush/refresh 失败不应阻断主流程（如草稿生成）。
    # 使用 savepoint 隔离：失败时自动回滚 savepoint，不影响外层事务。
    try:
        with db.begin_nested():
            db.add(log)
            db.flush()
            db.refresh(log)
    except Exception:
        logger.warning("Failed to flush/refresh generation log", exc_info=True)
        return None
    return log


def generate_content_draft(
    db: Session,
    payload: ContentGenerateRequest,
    current_user: User,
) -> Content:
    package = build_draft_prompt_package(payload, current_user)
    try:
        draft = model_router.draft_model(package.prompt_name, package.payload)
    except HTTPException as exc:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="draft_generation",
                model="draft_model",
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
                purpose="draft_generation",
                model="draft_model",
                package=package,
                result="",
                log_status="error",
                error=str(exc),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise

    schema_issue = _draft_output_schema_issue(draft)
    if schema_issue is None and isinstance(draft, str):
        schema_issue = _draft_metadata_section_issue(draft)
    if schema_issue is None and isinstance(draft, str):
        schema_issue = _draft_hashtag_line_issue(draft)
    if schema_issue is None and isinstance(draft, str):
        schema_issue = _draft_too_thin_issue(draft)
    if schema_issue:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="draft_generation",
                model="draft_model",
                package=package,
                result=draft if isinstance(draft, str) else "",
                log_status="schema_invalid",
                error=schema_issue,
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=schema_issue,
        )

    relevance_issue = _draft_topic_relevance_issue(
        payload, draft, getattr(current_user, "domain_key", None)
    )
    if relevance_issue:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="draft_generation",
                model="draft_model",
                package=package,
                result=draft,
                log_status="topic_mismatch",
                error=relevance_issue,
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=relevance_issue,
        )

    source_fact_issue = _draft_missing_required_web_source_issue(
        package.payload.get("source_context"),
        draft,
        getattr(current_user, "domain_key", None),
    )
    if source_fact_issue:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="draft_generation",
                model="draft_model",
                package=package,
                result=draft,
                log_status="source_fact_invalid",
                error=source_fact_issue,
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=source_fact_issue,
        )

    # Apply local AIGC humanization (no API call needed)
    if isinstance(draft, str) and draft.strip():
        original_draft = draft
        try:
            draft = humanize_text(draft, intensity="medium")
        except Exception as exc:
            logger.warning(
                "humanize_text failed (topic=%r), keeping original draft",
                payload.topic,
                exc_info=True,
            )
            try:
                record_generation_log(
                    db=db,
                    current_user=current_user,
                    purpose="draft_generation",
                    model="draft_model",
                    package=package,
                    result=original_draft,
                    log_status="humanizer_failed",
                    error=str(exc),
                )
                _safe_commit(db)
            except Exception:
                logger.error(
                    "Failed to record humanizer_failed generation log",
                    exc_info=True,
                )
            draft = original_draft
        else:
            # Re-validate after humanization: humanizer may strip content
            post_issue = _draft_too_thin_issue(draft)
            if post_issue:
                logger.warning(
                    "Draft became too thin after humanization (topic=%r), keeping original",
                    payload.topic,
                )
                draft = original_draft

    if not isinstance(draft, str) or not draft.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="草稿内容不能为空",
        )

    raw_source_context = package.payload.get("source_context")
    content = Content(
        user_id=current_user.id,
        platform=payload.platform,
        title=payload.topic,
        body=draft,
        tags=payload.tags,
        source_context=raw_source_context
        if isinstance(raw_source_context, dict)
        else None,
        status="draft",
        task_state=TaskState.DRAFT_READY.value,
        task_state_updated_at=datetime.now(UTC),
    )
    db.add(content)
    try:
        db.flush()
        db.refresh(content)
    except Exception as exc:
        db.rollback()
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="draft_generation",
                model="draft_model",
                package=package,
                result=draft,
                log_status="db_error",
                error=str(exc),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record db_error generation log", exc_info=True)
        raise
    _gen_log = record_generation_log(
        db=db,
        current_user=current_user,
        purpose="draft_generation",
        model="draft_model",
        package=package,
        result=draft,
        log_status="success",
    )
    if _gen_log is None:
        logger.warning(
            "record_generation_log returned None for draft_generation (user=%s)",
            current_user.id,
        )
    _safe_commit(db)
    return content


def rewrite_content_body(
    db: Session,
    content: Content,
    payload: ContentRewriteRequest,
    current_user: User,
) -> Content:
    if content.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"当前状态不能改写：{content.status}。",
        )
    # Pre-check task_state transition BEFORE calling LLM to avoid wasting model calls.
    _target_state = TaskState.DRAFT_READY
    _current_state = content.task_state or TaskState.NEW.value
    if _current_state != _target_state.value and not can_transition(_current_state, _target_state):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"当前任务状态不允许改写：{_current_state} -> {_target_state.value}。",
        )
    package = build_rewrite_prompt_package(content, payload, current_user)
    try:
        rewritten = model_router.rewrite_model(package.prompt_name, package.payload)
    except HTTPException as exc:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="humanization",
                model="rewrite_model",
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
                purpose="humanization",
                model="rewrite_model",
                package=package,
                result="",
                log_status="error",
                error=str(exc),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise

    if not isinstance(rewritten, str) or not rewritten.strip():
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="改写结果为空")
    content.body = rewritten
    content.status = "rewritten"
    _gen_log = record_generation_log(
        db=db,
        current_user=current_user,
        purpose="humanization",
        model="rewrite_model",
        package=package,
        result=rewritten,
        log_status="success",
    )
    if _gen_log is None:
        logger.error(
            "record_generation_log returned None for humanization (user=%s) \u2013 audit trail incomplete",
            current_user.id,
        )
    # 同步更新 task_state 到 DRAFT_READY（改写后回到草稿就绪，等待审核或发布）。
    # 使用 savepoint 包裹 transition_task，保证原子性（参考 record_human_review 做法）。
    target_state = TaskState.DRAFT_READY
    current_state = content.task_state or TaskState.NEW.value
    if current_state != target_state.value:
        with db.begin_nested():
            content = transition_task(db, content.id, target_state, user_id=current_user.id)
        _safe_commit(db)
        try:
            db.refresh(content)
        except Exception:
            logger.warning("db.refresh failed after successful commit", exc_info=True)
    else:
        _safe_commit(db)
        try:
            db.refresh(content)
        except Exception:
            logger.warning("db.refresh failed after successful commit", exc_info=True)
    return content


def delete_content_with_assets(db: Session, content_id: int, *, user_id: int) -> None:
    content = db.get(Content, content_id)
    if content is None or content.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )

    # Collect image URLs before deleting DB records so files can be cleaned
    # up only after the transaction commits successfully. This avoids orphan
    # DB records when commit fails after files are already deleted.
    from app.services.image_service import _cleanup_local_image_file
    existing_images = db.scalars(
        select(GeneratedImage).where(GeneratedImage.content_id == content_id)
    ).all()
    image_urls_to_cleanup = [img.image_url for img in existing_images if img.image_url]

    # Delete DB records first and commit successfully before removing local files.
    # Defense-in-depth: only delete associated records whose content_id belongs to
    # the authenticated user (content ownership already validated above).
    user_content_ids = select(Content.id).where(Content.user_id == user_id)
    for model in (GeneratedImage, ContentReview, ContentVariant, PublishRecord):
        db.execute(
            delete(model).where(
                model.content_id == content_id,
                model.content_id.in_(user_content_ids),
            )
        )

    db.delete(content)
    _safe_commit(db)

    # Now safe to delete local image files — DB records are already committed.
    for image_url in image_urls_to_cleanup:
        _cleanup_local_image_file(image_url)
