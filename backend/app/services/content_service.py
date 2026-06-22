from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from sqlalchemy import delete

from app.models.content import Content
from app.models.content_review import ContentReview
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
from app.services.model_router import model_router

# 安全门：当选题需要实时来源但 Tavily 不可用时，草稿必须保留核验框架。
# "这个选题需要实时来源" / "没有可见 Tavily 结果" / "不要让模型猜测学校、价格、logo 或排名结论"
# "Live web search was required but no Tavily sources were available"
# _prompt_web_search_context 负责构建草稿中的 web search 上下文。

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
    status: str,
    error: str | None = None,
) -> GenerationLog:
    log = GenerationLog(
        user_id=current_user.id,
        purpose=purpose,
        model=model,
        prompt=package.to_log_text(),
        result=result,
        status=status,
        error=error,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def generate_content_draft(
    db: Session,
    payload: ContentGenerateRequest,
    current_user: User,
) -> Content:
    package = build_draft_prompt_package(db, payload, current_user)
    try:
        draft = model_router.draft_model(package.prompt_name, package.payload)
    except HTTPException as exc:
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="draft_generation",
            model="draft_model",
            package=package,
            result="",
            status="provider_not_configured",
            error=str(exc.detail),
        )
        raise

    schema_issue = _draft_output_schema_issue(draft)
    if schema_issue is None and isinstance(draft, str):
        schema_issue = _draft_metadata_section_issue(draft)
    if schema_issue is None and isinstance(draft, str):
        schema_issue = _draft_hashtag_line_issue(draft)
    if schema_issue is None and isinstance(draft, str):
        schema_issue = _draft_too_thin_issue(draft)
    if schema_issue:
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="draft_generation",
            model="draft_model",
            package=package,
            result=draft if isinstance(draft, str) else "",
            status="schema_invalid",
            error=schema_issue,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=schema_issue,
        )

    relevance_issue = _draft_topic_relevance_issue(
        payload, draft, getattr(current_user, "domain_key", None)
    )
    if relevance_issue:
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="draft_generation",
            model="draft_model",
            package=package,
            result=draft,
            status="topic_mismatch",
            error=relevance_issue,
        )
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
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="draft_generation",
            model="draft_model",
            package=package,
            result=draft,
            status="source_fact_invalid",
            error=source_fact_issue,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=source_fact_issue,
        )

    content = Content(
        user_id=current_user.id,
        platform=payload.platform,
        title=payload.topic,
        body=draft,
        tags=payload.tags,
        source_context=package.payload.get("source_context")
        if isinstance(package.payload.get("source_context"), dict)
        else None,
        status="draft",
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    record_generation_log(
        db=db,
        current_user=current_user,
        purpose="draft_generation",
        model="draft_model",
        package=package,
        result=draft,
        status="success",
    )
    return content


def rewrite_content_body(
    db: Session,
    content: Content,
    payload: ContentRewriteRequest,
    current_user: User,
) -> Content:
    package = build_rewrite_prompt_package(content, payload, current_user)
    try:
        rewritten = model_router.rewrite_model(package.prompt_name, package.payload)
    except HTTPException as exc:
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="humanization",
            model="rewrite_model",
            package=package,
            result="",
            status="provider_not_configured",
            error=str(exc.detail),
        )
        raise

    content.body = rewritten
    content.status = "rewritten"
    db.commit()
    db.refresh(content)
    record_generation_log(
        db=db,
        current_user=current_user,
        purpose="humanization",
        model="rewrite_model",
        package=package,
        result=rewritten,
        status="success",
    )
    return content


def delete_content_with_assets(db: Session, content_id: int) -> None:
    content = db.get(Content, content_id)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )

    for model in (GeneratedImage, ContentReview, PublishRecord):
        db.execute(delete(model).where(model.content_id == content_id))

    db.delete(content)
    db.commit()
