import json
import re
import threading
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy import desc, exists, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.content import Content
from app.models.content_review import ContentReview
from app.models.publish_record import PublishRecord
from app.models.user import User
from app.schemas.workspace import (
    ExportItem,
    ExportRequest,
    ExportResponse,
    ProviderConnectionCheckRequest,
    ProviderConnectionCheckResponse,
    ProviderKeyUpdateRequest,
    ProviderStatusItem,
)
from app.services.model_router import model_router

EXPORTABLE_STATUSES = {"approved", "published"}

# Serializes .env read-modify-write operations to prevent race conditions
_env_write_lock = threading.Lock()


def has_human_approved_review(db: Session, content_id: int) -> bool:
    return (
        db.scalar(
            select(ContentReview.id)
            .where(
                ContentReview.content_id == content_id,
                ContentReview.review_type == "human",
                ContentReview.status == "approved",
            )
            .limit(1)
        )
        is not None
    )


def approved_content_items(db: Session, limit: int, user_id: int | None = None) -> list[Content]:
    human_approved_review_exists = (
        exists()
        .where(ContentReview.content_id == Content.id)
        .where(ContentReview.review_type == "human")
        .where(ContentReview.status == "approved")
    )
    statement = (
        select(Content)
        .where(Content.status.in_(EXPORTABLE_STATUSES), human_approved_review_exists)
        .order_by(desc(Content.created_at))
        .limit(limit)
    )
    if user_id is not None:
        statement = statement.where(Content.user_id == user_id)
    return list(db.scalars(statement).all())


def list_publish_records(
    db: Session,
    platform: str | None,
    limit: int,
    user_id: int | None = None,
) -> list[PublishRecord]:
    statement = select(PublishRecord).order_by(desc(PublishRecord.created_at)).limit(limit)
    if platform:
        statement = statement.where(PublishRecord.platform == platform)
    if user_id is not None:
        statement = statement.where(PublishRecord.user_id == user_id)
    return list(db.scalars(statement).all())


def _load_export_contents(db: Session, content_ids: list[int], user_id: int) -> list[Content]:
    contents = [db.get(Content, content_id) for content_id in content_ids]
    missing_ids = [
        content_id
        for content_id, content in zip(content_ids, contents, strict=False)
        if content is None
    ]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"missing_content_ids": missing_ids},
        )

    loaded = [content for content in contents if content is not None]
    unauthorized_ids = [content.id for content in loaded if content.user_id != user_id]
    if unauthorized_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"unauthorized_content_ids": unauthorized_ids},
        )
    blocked_ids = [
        content.id for content in loaded if content.status not in EXPORTABLE_STATUSES
    ]
    if blocked_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "只有人工批准后的内容可以导出。",
                "blocked_content_ids": blocked_ids,
            },
        )
    unreviewed_ids = [
        content.id for content in loaded if not has_human_approved_review(db, content.id)
    ]
    if unreviewed_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "只有人工确认通过的内容可以导出。",
                "blocked_content_ids": unreviewed_ids,
            },
        )
    return loaded


def _to_export_item(content: Content) -> ExportItem:
    return ExportItem(
        id=content.id,
        platform=content.platform,
        title=content.title,
        body=content.body,
        tags=content.tags,
    )


def _render_markdown(items: list[ExportItem]) -> str:
    sections = []
    for item in items:
        tags = " ".join(f"#{tag}" for tag in item.tags or [])
        sections.append(
            "\n".join(
                [
                    f"# {item.title}",
                    "",
                    f"Platform: {item.platform}",
                    f"Tags: {tags}" if tags else "Tags:",
                    "",
                    item.body,
                ]
            )
        )
    return "\n\n---\n\n".join(sections)


def _render_plain(items: list[ExportItem]) -> str:
    return "\n\n".join(f"{item.title}\n{item.body}" for item in items)


def create_export_package(
    db: Session,
    payload: ExportRequest,
    current_user: User,
) -> ExportResponse:
    contents = _load_export_contents(db, payload.content_ids, current_user.id)
    items = [_to_export_item(content) for content in contents]

    if payload.format == "json":
        rendered = json.dumps([item.model_dump() for item in items], ensure_ascii=False, indent=2)
    elif payload.format == "plain":
        rendered = _render_plain(items)
    else:
        rendered = _render_markdown(items)

    return ExportResponse(
        format=payload.format,
        status="ready",
        content_ids=payload.content_ids,
        items=items,
        payload=rendered,
    )


def provider_status_items() -> list[ProviderStatusItem]:
    draft_configured = settings.draft_provider == "codex_test" or bool(
        settings.openai_compatible_api_key
    )
    rewrite_configured = bool(settings.deepseek_api_key)
    image_configured = settings.image_provider == "codex_test" or bool(
        settings.image_openai_compatible_api_key or settings.openai_compatible_api_key
    )
    web_search_configured = settings.tavily_search_enabled and bool(settings.tavily_api_key)

    image_note = "本地连通性检查可用；正式封面仍需真实图片服务。"
    if settings.image_provider == "openai_compatible":
        image_note = "图片服务已配置，可用于生成封面。"

    return [
        ProviderStatusItem(
            name="Draft generation",
            provider=settings.draft_provider,
            model=settings.draft_model if settings.draft_provider != "codex_test" else None,
            configured=draft_configured,
            status="configured" if draft_configured else "missing_key",
            note=(
                "撰稿服务已配置。"
                if settings.draft_provider == "openai_compatible"
                else "本地草稿检查可用；正式撰稿仍需真实模型服务。"
            ),
        ),
        ProviderStatusItem(
            name="Humanization rewrite",
            provider="deepseek",
            model=settings.deepseek_rewrite_model,
            configured=rewrite_configured,
            status="configured" if rewrite_configured else "missing_key",
            note="改写服务用于口吻润色和降低模板感。",
        ),
        ProviderStatusItem(
            name="Image generation",
            provider=settings.image_provider,
            model=settings.image_model if settings.image_provider != "codex_test" else None,
            configured=image_configured,
            status="configured" if image_configured else "missing_key",
            note=image_note,
        ),
        ProviderStatusItem(
            name="Web search",
            provider="tavily",
            model=None,
            configured=web_search_configured,
            status="configured" if web_search_configured else "missing_key",
            note=(
                "联网检索已配置；需要实时资料的选题会先检索来源。"
                if web_search_configured
                else "联网检索未配置；需要实时资料时只能使用知识库和已采集素材。"
            ),
        ),
    ]


def _clean_provider_key(value: str | None) -> str | None:
    if value is None:
        return None
    # Filter newline characters to prevent .env injection attacks
    sanitized = value.replace("\n", "").replace("\r", "")
    stripped = sanitized.strip()
    return stripped or None


def _write_env_keys(updates: dict[str, str]) -> None:
    """将键值对写回 PROJECT_ROOT/.env（存在则更新，不存在则追加）。"""
    from app.core.config import PROJECT_ROOT

    with _env_write_lock:
        env_path = Path(PROJECT_ROOT) / ".env"
        text = env_path.read_text(encoding="utf-8") if env_path.exists() else ""

        for key, value in updates.items():
            pattern = rf"^{re.escape(key)}\s*=.*$"
            replacement = f"{key}={value}"
            if re.search(pattern, text, flags=re.MULTILINE):
                text = re.sub(pattern, replacement, text, flags=re.MULTILINE)
            else:
                text = text.rstrip("\n") + f"\n{replacement}\n"

        env_path.write_text(text, encoding="utf-8")


def apply_provider_key_settings(payload: ProviderKeyUpdateRequest) -> list[ProviderStatusItem]:
    draft_api_key = _clean_provider_key(payload.draft_api_key)
    image_api_key = _clean_provider_key(payload.image_api_key)
    deepseek_api_key = _clean_provider_key(payload.deepseek_api_key)

    env_updates: dict[str, str] = {}

    if draft_api_key:
        env_updates["OPENAI_COMPATIBLE_API_KEY"] = draft_api_key
        env_updates["DRAFT_PROVIDER"] = "openai_compatible"
    if image_api_key:
        env_updates["IMAGE_OPENAI_COMPATIBLE_API_KEY"] = image_api_key
        env_updates["IMAGE_PROVIDER"] = "openai_compatible"
    if deepseek_api_key:
        env_updates["DEEPSEEK_API_KEY"] = deepseek_api_key

    # Persist to .env first; only update in-memory settings after successful write
    if env_updates:
        _write_env_keys(env_updates)

    if draft_api_key:
        settings.draft_provider = "openai_compatible"
        settings.openai_compatible_api_key = draft_api_key
    if image_api_key:
        settings.image_provider = "openai_compatible"
        settings.image_openai_compatible_api_key = image_api_key
    if deepseek_api_key:
        settings.deepseek_api_key = deepseek_api_key

    return provider_status_items()


def check_provider_connection(
    payload: ProviderConnectionCheckRequest,
) -> ProviderConnectionCheckResponse:
    if payload.target != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前只支持检测撰稿服务。",
        )

    configured = settings.draft_provider == "codex_test" or bool(
        settings.openai_compatible_api_key
    )
    if not configured:
        return ProviderConnectionCheckResponse(
            target=payload.target,
            configured=False,
            status="missing_key",
            message="撰稿服务还没有填写服务授权。",
        )

    try:
        result = model_router.draft_model(
            "draft_generation",
            {
                "platform": "xiaohongshu",
                "topic": "服务连接检测",
                "tags": ["连接检测"],
                "tone": "简短、明确、合规",
                "target_audience": "系统管理员",
                "knowledge_query": "服务连接检测",
                "knowledge_context": [],
                "style_reference": "",
                "user": {"id": None, "role": "system_check"},
            },
        )
    except HTTPException as exc:
        return ProviderConnectionCheckResponse(
            target=payload.target,
            configured=True,
            status="failed",
            message=str(exc.detail),
        )

    if not result.strip():
        return ProviderConnectionCheckResponse(
            target=payload.target,
            configured=True,
            status="failed",
            message="撰稿服务返回为空，请检查服务配置或服务地址。",
        )

    return ProviderConnectionCheckResponse(
        target=payload.target,
        configured=True,
        status="ok",
        message="撰稿服务连接成功，可以回到内容生产页开始生成。",
    )
