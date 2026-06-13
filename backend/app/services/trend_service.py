import re
from collections import Counter, defaultdict
from urllib.parse import quote, urlparse

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
    TrendLinkCandidate,
    TrendLinkImportRequest,
    TrendLinkImportTarget,
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
    "视频采集暂未启用；需要先补齐转写、版权和人工复核流程。"
)
AUTO_START_COLLECTION_MESSAGE = "已排队；安全采集浏览器会自动启动。"
URL_RE = re.compile(r"https?://[^\s<>'\"，。；、)）】]+", re.IGNORECASE)
SUPPORTED_XHS_HOSTS = {
    "xiaohongshu.com",
    "www.xiaohongshu.com",
    "xhslink.com",
    "www.xhslink.com",
}
TRAILING_URL_PUNCTUATION = ".,;:!?，。；：！？、)]）】\"'"


def _clean_import_url(url: str) -> str:
    return url.strip().rstrip(TRAILING_URL_PUNCTUATION)


def _classify_xhs_url(url: str) -> TrendLinkCandidate:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    path = parsed.path.strip("/")
    parts = [part for part in path.split("/") if part]

    if host not in SUPPORTED_XHS_HOSTS:
        return TrendLinkCandidate(
            original_url=url,
            normalized_url=url,
            link_type="unsupported",
            accepted=False,
            requires_resolution=False,
            reason="只接受 xiaohongshu.com 和 xhslink.com 链接。",
        )

    if host in {"xhslink.com", "www.xhslink.com"}:
        if not parts:
            return TrendLinkCandidate(
                original_url=url,
                normalized_url=url,
                link_type="short_link",
                accepted=False,
                requires_resolution=False,
                reason="短链需要包含分享码。",
            )
        return TrendLinkCandidate(
            original_url=url,
            normalized_url=url,
            link_type="short_link",
            accepted=True,
            requires_resolution=True,
            reason="短链需要后续由授权采集器解析详情。",
        )

    if len(parts) >= 2 and parts[0] == "explore":
        return TrendLinkCandidate(
            original_url=url,
            normalized_url=f"https://www.xiaohongshu.com/explore/{parts[1]}",
            link_type="note_detail",
            accepted=True,
            requires_resolution=False,
            note_id=parts[1],
        )

    if len(parts) >= 3 and parts[:2] == ["discovery", "item"]:
        return TrendLinkCandidate(
            original_url=url,
            normalized_url=f"https://www.xiaohongshu.com/discovery/item/{parts[2]}",
            link_type="note_detail",
            accepted=True,
            requires_resolution=False,
            note_id=parts[2],
        )

    if len(parts) >= 2 and parts[:2] == ["user", "profile"]:
        user_id = parts[2] if len(parts) >= 3 else None
        if not user_id:
            return TrendLinkCandidate(
                original_url=url,
                normalized_url=url,
                link_type="profile",
                accepted=False,
                requires_resolution=False,
                reason="主页链接需要包含用户 ID。",
            )
        note_id = parts[3] if len(parts) >= 4 else None
        normalized_path = f"user/profile/{user_id}/{note_id}" if note_id else f"user/profile/{user_id}"
        return TrendLinkCandidate(
            original_url=url,
            normalized_url=f"https://www.xiaohongshu.com/{normalized_path}",
            link_type="profile_note" if note_id else "profile",
            accepted=True,
            requires_resolution=False,
            note_id=note_id,
            reason=None if note_id else "主页链接需要后续进入笔记列表采集。",
        )

    if parts and parts[0] == "search_result":
        return TrendLinkCandidate(
            original_url=url,
            normalized_url=f"https://www.xiaohongshu.com/search_result",
            link_type="search_result",
            accepted=True,
            requires_resolution=False,
            reason="搜索结果页可作为上下文，但不是单篇笔记。",
        )

    return TrendLinkCandidate(
        original_url=url,
        normalized_url=url,
        link_type="xiaohongshu_other",
        accepted=False,
        requires_resolution=False,
        reason="暂不支持这种小红书链接形态。",
    )


def build_xhs_link_import_target(payload: TrendLinkImportRequest) -> TrendLinkImportTarget:
    seen: set[str] = set()
    links: list[TrendLinkCandidate] = []
    for match in URL_RE.findall(payload.raw_text):
        cleaned = _clean_import_url(match)
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        links.append(_classify_xhs_url(cleaned))
        if len(links) >= payload.max_links:
            break

    accepted_count = sum(1 for item in links if item.accepted)
    return TrendLinkImportTarget(
        platform="xiaohongshu",
        extracted_count=len(links),
        accepted_count=accepted_count,
        import_mode="link_detail_pending_authorized_collector",
        download_media_enabled=False,
        cookie_persistence=False,
        links=links,
        safety_notes=[
            "这里只提取并分类链接，不抓取笔记详情或媒体文件。",
            "xhslink.com 短链只通过操作者授权的登录浏览器或合规采集器解析。",
            "默认不下载媒体；先保存笔记元数据，入知识库前必须人工复核。",
            "默认不保存 Cookie；只有后续显式启用授权采集器时才会持久化。",
            "XHS-Downloader 仅作为产品和架构参考；当前实现是独立 clean-room 代码。",
        ],
    )


def build_platform_search_target(platform: str, keyword: str) -> PlatformSearchTarget:
    normalized_platform = platform.strip().lower()
    normalized_keyword = keyword.strip()
    if normalized_platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="平台只能是 xiaohongshu 或 douyin。",
        )
    if not normalized_keyword:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="请先填写关键词。",
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
            "先在采集浏览器里尝试公开搜索。",
            "只有公开结果被拦截时，才让操作者打开登录浏览器处理登录或验证码。",
            "不要绕过平台访问控制，也不要采集非公开内容。",
            "保持随机延迟和接近人工的滚动节奏。",
            "采集到的笔记先作为趋势素材保存，再人工确认后进入知识摘要。",
        ],
    )


def build_safety_profile(payload: TrendCollectionJobCreate) -> dict[str, object]:
    if payload.min_delay_seconds >= payload.max_delay_seconds:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="最小采集间隔必须小于最大采集间隔。",
        )
    if payload.content_kind != "image_text":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=VIDEO_COLLECTION_DISABLED_DETAIL,
        )

    session_label = payload.session_label or payload.platform

    return {
        "collector": "playwright_assisted",
        "human_like_scrolling": True,
        "randomized_delay_seconds": {
            "min": payload.min_delay_seconds,
            "max": payload.max_delay_seconds,
        },
        "randomized_interaction_paths": True,
        "session_persistence": payload.persist_session,
        "cookie_persistence": payload.persist_cookies or payload.persist_session,
        "session_label": session_label,
        "max_items": payload.max_items,
        "operator_wait_seconds": payload.operator_wait_seconds,
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
            "message": AUTO_START_COLLECTION_MESSAGE,
            "auto_start": True,
            "collected_items": 0,
        },
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def mark_collection_job_for_auto_start(job: TrendCollectionJob) -> None:
    summary = dict(job.result_summary or {})
    summary.update(
        {
            "message": AUTO_START_COLLECTION_MESSAGE,
            "auto_start": True,
            "collected_items": int(summary.get("collected_items") or 0),
        }
    )
    job.status = "queued"
    job.error = None
    job.result_summary = summary


def collection_job_has_pending_auto_start(job: TrendCollectionJob) -> bool:
    summary = job.result_summary or {}
    return job.status == "queued" and bool(summary.get("auto_start"))


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
            detail="没有找到符合条件的采集素材，无法生成知识摘要。",
        )

    source_ids = [item.id for item in items]
    keyword = payload.keyword or "最近采集趋势"
    platform = payload.platform or "多平台"
    title = f"趋势摘要：{keyword}（{platform}）"
    lines = [
        f"# {title}",
        "",
        "这条知识库内容汇总已采集的公开趋势素材，仅作为撰稿参考。",
        "它不是发布批准；进入内容生产前仍需要人工复核来源和结论。",
        "",
        "## 主题标签",
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
        lines.append("- 未采集到标签。")

    lines.extend(["", "## 采集样例"])
    for index, item in enumerate(items, start=1):
        metrics = (
            f"点赞={item.likes}，收藏={item.favorites}，"
            f"评论={item.comments}，分享={item.shares}"
        )
        author = item.author or "未知作者"
        url = item.url or "无来源链接"
        excerpt = re.sub(r"\s+", " ", item.content).strip()[:260]
        lines.extend(
            [
                f"{index}. {item.title}",
                f"   平台：{item.platform}；作者：{author}；互动数据：{metrics}",
                f"   来源：{url}",
                f"   摘要：{excerpt}",
            ]
        )
        if item.video_transcript:
            transcript_excerpt = re.sub(r"\s+", " ", item.video_transcript).strip()[:220]
            lines.append(f"   视频转写摘要：{transcript_excerpt}")

    lines.extend(
        [
            "",
            "## 撰稿安全边界",
            "- 趋势素材只能作为灵感和引用背景，不能直接搬运。",
            "- 不要对录取、导师匹配或申请结果做无依据承诺。",
            "- 任何生成内容发布前都必须人工复核。",
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
            detail="生成知识摘要前，请先人工确认采集来源。",
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
