import re
from collections import Counter, defaultdict
from urllib.parse import quote

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.knowledge_base import KnowledgeBase
from app.models.trend_collection_job import TrendCollectionJob
from app.models.trend_content import TrendContent
from app.models.user import User
from app.schemas.knowledge import KnowledgeUploadRequest
from app.schemas.trend import (
    KeywordAnalysisItem,
    PlatformSearchTarget,
    TrendCollectRequest,
    TrendCollectionJobCreate,
    TrendKnowledgeDigestRequest,
    TrendKnowledgeDigestResponse,
)
from app.services.knowledge_service import create_knowledge_item


TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)
STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "一个",
    "什么",
    "如何",
    "怎么",
    "我们",
}
SUPPORTED_PLATFORMS = {"xiaohongshu", "douyin"}
VIDEO_COLLECTION_DISABLED_DETAIL = (
    "Video collection is disabled until a separate transcript and rights review workflow is implemented."
)


def build_platform_search_target(platform: str, keyword: str) -> PlatformSearchTarget:
    normalized_platform = platform.strip().lower()
    normalized_keyword = keyword.strip()
    if normalized_platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="platform must be xiaohongshu or douyin.",
        )
    if not normalized_keyword:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="keyword is required.",
        )

    encoded_keyword = quote(normalized_keyword)
    search_url = (
        f"https://www.xiaohongshu.com/search_result?keyword={encoded_keyword}"
        if normalized_platform == "xiaohongshu"
        else f"https://www.douyin.com/search/{encoded_keyword}"
    )
    return PlatformSearchTarget(
        platform=normalized_platform,
        keyword=normalized_keyword,
        content_kind="image_text",
        video_collection_enabled=False,
        search_url=search_url,
        requires_manual_login=False,
        automation_mode="public_first_visible_browser",
        safety_notes=[
            "Try public search first in a visible browser session.",
            "Ask the operator to complete login or captcha only if public results are blocked.",
            "Do not bypass platform access controls or collect private content.",
            "Keep randomized delays and human-like scrolling enabled.",
            "Store collected notes as trend assets before summarizing them into the knowledge base.",
        ],
    )


def build_safety_profile(payload: TrendCollectionJobCreate) -> dict[str, object]:
    if payload.min_delay_seconds >= payload.max_delay_seconds:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="min_delay_seconds must be lower than max_delay_seconds.",
        )
    if payload.content_kind != "image_text":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=VIDEO_COLLECTION_DISABLED_DETAIL,
        )

    return {
        "collector": "playwright_assisted",
        "human_like_scrolling": True,
        "randomized_delay_seconds": {
            "min": payload.min_delay_seconds,
            "max": payload.max_delay_seconds,
        },
        "randomized_interaction_paths": True,
        "session_persistence": payload.persist_session,
        "cookie_persistence": payload.persist_cookies,
        "session_label": payload.session_label,
        "max_items": payload.max_items,
        "content_kind": payload.content_kind,
        "video_collection_enabled": False,
        "speed_policy": "account_safety_first",
        "target": build_platform_search_target(payload.platform, payload.keyword).model_dump(),
    }


def create_collection_job(
    db: Session,
    payload: TrendCollectionJobCreate,
    current_user: User,
) -> TrendCollectionJob:
    job = TrendCollectionJob(
        platform=payload.platform,
        keyword=payload.keyword,
        requested_by=current_user.id,
        status="queued",
        safety_profile=build_safety_profile(payload),
        result_summary={
            "message": "Queued for safe Playwright-assisted collection.",
            "collected_items": 0,
        },
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def list_collection_jobs(
    db: Session,
    platform: str | None,
    status_filter: str | None,
    limit: int,
) -> list[TrendCollectionJob]:
    statement = select(TrendCollectionJob).order_by(desc(TrendCollectionJob.created_at)).limit(limit)
    if platform:
        statement = statement.where(TrendCollectionJob.platform == platform)
    if status_filter:
        statement = statement.where(TrendCollectionJob.status == status_filter)
    return list(db.scalars(statement).all())


def create_trend_asset(
    db: Session,
    payload: TrendCollectRequest,
    current_user: User,
) -> TrendContent:
    _ = current_user
    item = TrendContent(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _trend_filter_statement(payload: TrendKnowledgeDigestRequest):
    statement = select(TrendContent).order_by(desc(TrendContent.created_at)).limit(payload.limit)
    if payload.trend_ids:
        statement = statement.where(TrendContent.id.in_(payload.trend_ids))
    if payload.platform:
        statement = statement.where(TrendContent.platform == payload.platform)
    if payload.keyword:
        pattern = f"%{payload.keyword}%"
        statement = statement.where(
            TrendContent.title.ilike(pattern) | TrendContent.content.ilike(pattern)
        )
    return statement


def render_trend_knowledge_digest(
    items: list[TrendContent],
    payload: TrendKnowledgeDigestRequest,
) -> tuple[str, str, list[int]]:
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No collected trend assets matched the digest request.",
        )

    source_ids = [item.id for item in items]
    keyword = payload.keyword or "recent collected trends"
    platform = payload.platform or "multi-platform"
    title = f"Trend digest: {keyword} ({platform})"
    lines = [
        f"# {title}",
        "",
        "This knowledge entry summarizes collected public trend assets for drafting reference.",
        "It is not a publishing approval and should be reviewed before use in content production.",
        "",
        "## Source themes",
    ]

    tag_counts: Counter[str] = Counter()
    for item in items:
        for tag in item.tags or []:
            normalized = str(tag).strip("# ").lower()
            if normalized:
                tag_counts[normalized] += 1

    if tag_counts:
        lines.extend(f"- {tag}: {count}" for tag, count in tag_counts.most_common(12))
    else:
        lines.append("- No tags were captured.")

    lines.extend(["", "## Collected examples"])
    for index, item in enumerate(items, start=1):
        metrics = (
            f"likes={item.likes}, favorites={item.favorites}, "
            f"comments={item.comments}, shares={item.shares}"
        )
        author = item.author or "unknown author"
        url = item.url or "no url"
        excerpt = re.sub(r"\s+", " ", item.content).strip()[:260]
        lines.extend(
            [
                f"{index}. {item.title}",
                f"   Platform: {item.platform}; Author: {author}; Metrics: {metrics}",
                f"   Source: {url}",
                f"   Notes: {excerpt}",
            ]
        )
        if item.video_transcript:
            transcript_excerpt = re.sub(r"\s+", " ", item.video_transcript).strip()[:220]
            lines.append(f"   Video transcript: {transcript_excerpt}")

    lines.extend(
        [
            "",
            "## Drafting guardrails",
            "- Treat trend assets as inspiration and citation context, not direct copy.",
            "- Avoid making unsupported outcome promises about admissions or supervisors.",
            "- Use human review before any generated content is published.",
        ]
    )
    return title, "\n".join(lines), source_ids


def create_trend_knowledge_digest(
    db: Session,
    payload: TrendKnowledgeDigestRequest,
    current_user: User,
) -> TrendKnowledgeDigestResponse:
    _ = current_user
    ensure_trend_sources_reviewed(payload.source_reviewed)

    items = list(db.scalars(_trend_filter_statement(payload)).all())
    title, content, source_ids = render_trend_knowledge_digest(items, payload)
    knowledge: KnowledgeBase = create_knowledge_item(
        db,
        KnowledgeUploadRequest(
            title=title,
            content=content,
            category=payload.category,
        ),
    )
    return TrendKnowledgeDigestResponse(
        knowledge_id=knowledge.id,
        title=knowledge.title,
        category=knowledge.category or payload.category,
        source_trend_ids=source_ids,
        item_count=len(source_ids),
        content=knowledge.content,
    )


def ensure_trend_sources_reviewed(source_reviewed: bool) -> None:
    if not source_reviewed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Trend sources must be reviewed before creating a knowledge digest.",
        )


def trend_report(db: Session) -> dict[str, object]:
    rows = db.execute(
        select(
            TrendContent.platform,
            func.count(TrendContent.id),
            func.coalesce(func.sum(TrendContent.likes), 0),
            func.coalesce(func.sum(TrendContent.favorites), 0),
            func.coalesce(func.sum(TrendContent.comments), 0),
            func.coalesce(func.sum(TrendContent.shares), 0),
        ).group_by(TrendContent.platform)
    ).all()
    return {
        "platforms": [
            {
                "platform": row[0],
                "items": row[1],
                "likes": row[2],
                "favorites": row[3],
                "comments": row[4],
                "shares": row[5],
            }
            for row in rows
        ]
    }


def analyze_keywords(
    db: Session,
    platform: str | None,
    limit: int,
) -> list[KeywordAnalysisItem]:
    statement = select(TrendContent)
    if platform:
        statement = statement.where(TrendContent.platform == platform)
    items = db.scalars(statement).all()

    counts: Counter[str] = Counter()
    platforms: dict[str, set[str]] = defaultdict(set)
    for item in items:
        tokens = list(item.tags or [])
        tokens.extend(TOKEN_RE.findall(f"{item.title} {item.content}".lower()))
        for token in tokens:
            normalized = token.strip("#").lower()
            if len(normalized) < 2 or normalized in STOP_WORDS:
                continue
            counts[normalized] += 1
            platforms[normalized].add(item.platform)

    return [
        KeywordAnalysisItem(
            keyword=keyword,
            count=count,
            platforms=sorted(platforms[keyword]),
        )
        for keyword, count in counts.most_common(limit)
    ]
