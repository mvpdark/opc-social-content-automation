import json

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.content import Content
from app.models.publish_record import PublishRecord
from app.models.user import User
from app.core.config import settings
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


def approved_content_items(db: Session, limit: int) -> list[Content]:
    statement = (
        select(Content)
        .where(Content.status.in_(EXPORTABLE_STATUSES))
        .order_by(desc(Content.created_at))
        .limit(limit)
    )
    return list(db.scalars(statement).all())


def list_publish_records(
    db: Session,
    platform: str | None,
    limit: int,
) -> list[PublishRecord]:
    statement = select(PublishRecord).order_by(desc(PublishRecord.created_at)).limit(limit)
    if platform:
        statement = statement.where(PublishRecord.platform == platform)
    return list(db.scalars(statement).all())


def _load_export_contents(db: Session, content_ids: list[int]) -> list[Content]:
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
    blocked_ids = [
        content.id for content in loaded if content.status not in EXPORTABLE_STATUSES
    ]
    if blocked_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Only human-approved content can be exported.",
                "blocked_content_ids": blocked_ids,
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
    _ = current_user
    contents = _load_export_contents(db, payload.content_ids)
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

    image_note = "演示图片服务已就绪。"
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
                else "演示撰稿服务已就绪。"
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
    ]


def _clean_provider_key(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def apply_provider_key_settings(payload: ProviderKeyUpdateRequest) -> list[ProviderStatusItem]:
    draft_api_key = _clean_provider_key(payload.draft_api_key)
    image_api_key = _clean_provider_key(payload.image_api_key)
    deepseek_api_key = _clean_provider_key(payload.deepseek_api_key)

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
            detail="Only draft provider checks are available.",
        )

    configured = settings.draft_provider == "codex_test" or bool(
        settings.openai_compatible_api_key
    )
    if not configured:
        return ProviderConnectionCheckResponse(
            target=payload.target,
            configured=False,
            status="missing_key",
            message="撰稿服务还没有填写服务密钥。",
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
            message="撰稿服务返回为空，请检查服务配置或中转站配置。",
        )

    return ProviderConnectionCheckResponse(
        target=payload.target,
        configured=True,
        status="ok",
        message="撰稿服务连接成功，可以回到内容生产页开始生成。",
    )
