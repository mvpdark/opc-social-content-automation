import json
import logging

from fastapi import HTTPException

import httpx

from app.core.config import settings
from app.schemas.content import ContentGenerateRequest
from app.services.promotion_brief import build_promotion_brief
from app.services.web_search_service import (
    build_live_web_search_context,
    build_tavily_query,
    topic_needs_live_web_search,
)

logger = logging.getLogger(__name__)

ZSCJ_TIMEOUT_SECONDS = 10.0

# ZSCJ API 单次响应最大字节数（10MB），超过则放弃以防止内存耗尽。
MAX_ZSCJ_RESPONSE_BYTES = 10 * 1024 * 1024

SOURCE_CONTEXT_EXCERPT_LENGTH = 420
SOURCE_CARD_SUPPORTED_CLAIM_LENGTH = 220


def _safe_int(value: object, default: int = 0) -> int:
    """Safely convert value to int, returning default on failure.

    Note: Does NOT parse formatted numbers like "1.2k" or "3.5万".
    Use trend_browser_parsers._metric_count() for that purpose.
    """
    if value is None:
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def _stream_json_with_size_limit(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    params: dict[str, str | int] | None = None,
    max_bytes: int = MAX_ZSCJ_RESPONSE_BYTES,
    log_label: str = "ZSCJ API",
) -> tuple[object | None, bool]:
    """Stream an HTTP response and parse JSON with a hard byte limit.

    Uses ``client.stream()`` so the response body is read in chunks.
    Aborts as soon as the accumulated size exceeds *max_bytes*, before
    the full body is loaded into memory.

    Returns ``(parsed, ok)`` where *ok* is ``True`` only when the
    response was successfully fetched and parsed. All expected errors
    (HTTP errors, invalid URLs, JSON decode failures, size overflow)
    are caught and logged, returning ``(None, False)``.
    """
    try:
        with client.stream(method, url, params=params) as resp:
            resp.raise_for_status()
            # Pre-check Content-Length header (may be absent or inaccurate).
            content_length = resp.headers.get("content-length")
            if content_length:
                try:
                    declared = int(content_length)
                except (ValueError, TypeError):
                    declared = 0
                if declared > max_bytes:
                    logger.warning(
                        "%s response too large (Content-Length=%d bytes), skipping",
                        log_label, declared,
                    )
                    return None, False
            # Read body in chunks, enforcing the limit during streaming.
            chunks: list[bytes] = []
            total = 0
            for chunk in resp.iter_bytes():
                total += len(chunk)
                if total > max_bytes:
                    logger.warning(
                        "%s response exceeded %d bytes during streaming, aborting",
                        log_label, max_bytes,
                    )
                    return None, False
                chunks.append(chunk)
            body = b"".join(chunks)
            try:
                return json.loads(body), True
            except (ValueError, json.JSONDecodeError) as exc:
                logger.warning("%s JSON parse failed: %s", log_label, exc)
                return None, False
    except (httpx.HTTPError, httpx.InvalidURL, OSError) as exc:
        logger.warning("Failed to fetch %s: %s", log_label, exc)
        return None, False


def _source_excerpt(value: object, max_length: int = SOURCE_CONTEXT_EXCERPT_LENGTH) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= max_length:
        return text
    return f"{text[:max_length].rstrip()}..."


def _source_card_claim(value: object) -> str:
    return _source_excerpt(value, SOURCE_CARD_SUPPORTED_CLAIM_LENGTH)


def _source_cards(source_context: dict[str, object]) -> list[dict[str, object]]:
    cards: list[dict[str, object]] = []
    raw_knowledge_items = source_context.get("knowledge_items")
    if isinstance(raw_knowledge_items, list):
        for index, item in enumerate(raw_knowledge_items, start=1):
            if not isinstance(item, dict):
                continue
            cards.append(
                {
                    "id": f"knowledge:{item.get('id') or index}",
                    "source_type": "knowledge",
                    "title": _source_excerpt(item.get("title"), 160),
                    "url": None,
                    "freshness": "stored knowledge base item",
                    "supported_claim": _source_card_claim(item.get("content")),
                    "unsupported_boundary": (
                        "Do not use this card alone for current rankings, fees, logos, "
                        "policies, or market data unless the item itself contains reviewed facts."
                    ),
                    "confidence": "review_required",
                    "safe_for": ["body", "checklist"],
                }
            )

    raw_web_search = source_context.get("web_search")
    if isinstance(raw_web_search, dict):
        raw_results = raw_web_search.get("results")
        if isinstance(raw_results, list):
            for index, item in enumerate(raw_results, start=1):
                if not isinstance(item, dict):
                    continue
                cards.append(
                    {
                        "id": f"web:{index}",
                        "source_type": "web",
                        "title": _source_excerpt(item.get("title"), 160),
                        "url": _source_excerpt(item.get("url"), 600),
                        "freshness": "live Tavily search result",
                        "supported_claim": _source_card_claim(item.get("content")),
                        "unsupported_boundary": (
                            "Use only the returned title, URL, snippet, and answer summary; "
                            "open the URL for human review before publishing current facts."
                        ),
                        "confidence": "source_visible",
                        "safe_for": ["title", "body", "cover", "checklist"],
                    }
                )
            if not raw_results and raw_web_search.get("required") is True:
                cards.append(
                    {
                        "id": "web:missing-required",
                        "source_type": "web",
                        "title": "Required live web evidence missing",
                        "url": None,
                        "freshness": "missing",
                        "supported_claim": "No visible Tavily result supports current-fact conclusions.",
                        "unsupported_boundary": (
                            "Do not name schools, logos, prices, rankings, policies, or market facts; "
                            "write only a verification framework until sources are collected."
                        ),
                        "confidence": "missing_required_source",
                        "safe_for": ["checklist"],
                    }
                )
        elif raw_web_search.get("required") is True:
            cards.append(
                {
                    "id": "web:missing-required",
                    "source_type": "web",
                    "title": "Required live web evidence missing",
                    "url": None,
                    "freshness": "missing",
                    "supported_claim": "No visible Tavily result supports current-fact conclusions.",
                    "unsupported_boundary": (
                        "Do not name schools, logos, prices, rankings, policies, or market facts; "
                        "write only a verification framework until sources are collected."
                    ),
                    "confidence": "missing_required_source",
                    "safe_for": ["checklist"],
                }
            )

    return cards


def _knowledge_context(
    payload: ContentGenerateRequest,
) -> list[dict[str, object]]:
    query = payload.knowledge_query or payload.topic
    if payload.knowledge_limit == 0:
        return []

    base_url = settings.zscj_api_base_url.rstrip("/")
    search_url = f"{base_url}/knowledge/search"
    compiled_url = f"{base_url}/knowledge/compiled/latest"

    # Fetch knowledge items from ZSCJ API
    results: list[dict[str, object]] = []
    compiled: dict[str, object] | None = None

    try:
        with httpx.Client(timeout=ZSCJ_TIMEOUT_SECONDS) as client:
            # Fetch search results independently: failure must not discard compiled knowledge.
            parsed_search, search_ok = _stream_json_with_size_limit(
                client, "GET", search_url,
                params={
                    "q": query,
                    "limit": payload.knowledge_limit,
                    "mode": "hybrid",
                },
                log_label="ZSCJ knowledge search",
            )
            if search_ok:
                if not isinstance(parsed_search, list):
                    logger.warning(
                        "ZSCJ API returned non-list results: %s",
                        type(parsed_search).__name__,
                    )
                else:
                    results = parsed_search

            # Fetch compiled knowledge independently: failure must not discard search results.
            parsed_compiled, compiled_ok = _stream_json_with_size_limit(
                client, "GET", compiled_url,
                log_label="ZSCJ compiled knowledge",
            )
            if compiled_ok:
                compiled = parsed_compiled
    except (httpx.HTTPError, httpx.InvalidURL, OSError) as exc:
        logger.warning("Failed to connect to ZSCJ API: %s", exc)
        return []

    # Only return empty when both search results and compiled knowledge are unavailable.
    if not results and compiled is None:
        return []

    # Merge compiled + search results (dedup by id)
    merged_results: list[dict[str, object]] = []
    seen_ids: set[str] = set()
    if compiled and isinstance(compiled, dict) and compiled.get("id") is not None:
        merged_results.append(compiled)
        seen_ids.add(str(compiled["id"]))
    for item in results:
        if isinstance(item, dict) and str(item.get("id")) not in seen_ids:
            merged_results.append(item)
            item_id = item.get("id")
            if item_id is not None:
                seen_ids.add(str(item_id))

    return merged_results[: payload.knowledge_limit]


def _popular_posts_context(
    payload: ContentGenerateRequest,
    limit: int = 3,
) -> list[dict[str, object]]:
    """Fetch high-engagement posts from ZSCJ to use as structural references."""
    base_url = settings.zscj_api_base_url.rstrip("/")
    popular_url = f"{base_url}/trends/popular"
    try:
        with httpx.Client(timeout=ZSCJ_TIMEOUT_SECONDS) as client:
            params: dict[str, str | int] = {"limit": limit}
            if payload.platform:
                params["platform"] = payload.platform
            posts, posts_ok = _stream_json_with_size_limit(
                client, "GET", popular_url,
                params=params,
                log_label="ZSCJ popular posts",
            )
            if not posts_ok:
                return []
    except (httpx.HTTPError, httpx.InvalidURL, OSError) as exc:
        logger.warning("Failed to fetch popular posts from ZSCJ: %s", exc)
        return []

    if not isinstance(posts, list):
        logger.warning("ZSCJ popular posts API returned non-list: %s", type(posts).__name__)
        return []

    references: list[dict[str, object]] = []
    for post in posts:
        if not isinstance(post, dict):
            continue
        content = post.get("content", "")
        references.append({
            "id": post.get("id"),
            "title": post.get("title", ""),
            "content_preview": (content[:300] + "...") if isinstance(content, str) and len(content) > 300 else (content if isinstance(content, str) else ""),
            "content_length": len(content) if isinstance(content, str) else 0,
            "author": post.get("author"),
            "platform": post.get("platform"),
            "likes": post.get("likes", 0),
            "favorites": post.get("favorites", 0),
            "comments": post.get("comments", 0),
            "shares": post.get("shares", 0),
            "tags": post.get("tags", []),
            "url": post.get("url"),
            "engagement_score": (
                _safe_int(post.get("likes", 0))
                + _safe_int(post.get("comments", 0))
                + _safe_int(post.get("favorites", 0))
                + _safe_int(post.get("shares", 0))
            ),
        })
    return references


def _admission_notices_context(
    payload: ContentGenerateRequest,
    limit: int = 3,
) -> list[dict[str, object]]:
    """Fetch admission notices from ZSCJ as a knowledge source for informational posts."""
    base_url = settings.zscj_api_base_url.rstrip("/")
    search_url = f"{base_url}/admissions/notices/search"
    try:
        with httpx.Client(timeout=ZSCJ_TIMEOUT_SECONDS) as client:
            params: dict[str, str | int] = {"q": payload.knowledge_query or payload.topic, "limit": limit}
            notices, notices_ok = _stream_json_with_size_limit(
                client, "GET", search_url,
                params=params,
                log_label="ZSCJ admission notices",
            )
            if not notices_ok:
                return []
    except (httpx.HTTPError, httpx.InvalidURL, OSError) as exc:
        logger.warning("Failed to fetch admission notices from ZSCJ: %s", exc)
        return []

    if not isinstance(notices, list):
        logger.warning("ZSCJ admission notices API returned non-list: %s", type(notices).__name__)
        return []

    results: list[dict[str, object]] = []
    for notice in notices:
        if not isinstance(notice, dict):
            continue
        results.append({
            "id": notice.get("id"),
            "title": notice.get("title", ""),
            "school_name": notice.get("school_name", ""),
            "publish_date": notice.get("publish_date"),
            "summary": notice.get("summary", ""),
            "detail_content": notice.get("detail_content", ""),
            "url": notice.get("url"),
            "extracted_fields": notice.get("extracted_fields"),
            "extract_status": notice.get("extract_status"),
        })
    return results


def _extract_structure_pattern(post: dict[str, object]) -> dict[str, object]:
    """Extract structural patterns from a popular post for mimicry."""
    content = post.get("content_preview", "")
    if not isinstance(content, str) or not content:
        return {}

    lines = [l.strip() for l in content.split("\n") if l.strip()]
    line_count = len(lines)
    avg_line_length = sum(len(l) for l in lines) // max(line_count, 1)

    emoji_prefixes = ("📍", "✅", "❌", "🔴", "🔵", "👉", "💡", "🔥", "⭐", "Step", "1.", "2.", "3.")
    has_bullets = any(l.startswith(emoji_prefixes) for l in lines) if lines else False
    has_emoji_hook = bool(lines) and any(ord(c) > 0x1F000 for c in lines[0])

    return {
        "line_count": line_count,
        "avg_line_length": avg_line_length,
        "has_bullets": has_bullets,
        "has_emoji_hook": has_emoji_hook,
        "total_length": post.get("content_length", len(content)),
        "engagement_score": post.get("engagement_score", 0),
        "title": post.get("title", ""),
    }


def _public_source_context(
    payload: ContentGenerateRequest,
    knowledge_context: list[dict[str, object]],
    web_search_context: dict[str, object] | None,
) -> dict[str, object]:
    web_search_required = topic_needs_live_web_search(payload.topic, payload.tags)
    web_results: list[dict[str, object]] = []
    if isinstance(web_search_context, dict):
        raw_results = web_search_context.get("results")
        if isinstance(raw_results, list):
            for raw_result in raw_results:
                if not isinstance(raw_result, dict):
                    continue
                web_results.append(
                    {
                        "title": _source_excerpt(raw_result.get("title"), 160),
                        "url": _source_excerpt(raw_result.get("url"), 600),
                        "content": _source_excerpt(raw_result.get("content")),
                        "score": raw_result.get("score"),
                    }
                )
    review_note = (
        "这些是本次生成可见的检索依据。需要排名、学校、logo、学费或认证时，"
        "请先人工核对来源，再复制到平台发布。"
    )
    if web_search_required and not web_results:
        review_note = (
            "这个选题需要实时来源，但本次没有可见 Tavily 结果；请先检查 Tavily 配置、"
            "换更具体关键词，或只输出维度框架，不要让模型猜测学校、价格、logo 或排名结论。"
        )

    source_context = {
        "knowledge_query": payload.knowledge_query or payload.topic,
        "knowledge_items": [
            {
                "id": item.get("id"),
                "title": _source_excerpt(item.get("title"), 160),
                "category": item.get("category"),
                "content": _source_excerpt(item.get("content")),
                "score": item.get("score"),
                "match_type": item.get("match_type"),
            }
            for item in knowledge_context
        ],
        "web_search": {
            "required": web_search_required,
            "provider": (
                web_search_context.get("provider")
                if isinstance(web_search_context, dict)
                else None
            ),
            "query": (
                web_search_context.get("query")
                if isinstance(web_search_context, dict)
                else build_tavily_query(payload.topic, payload.platform, payload.tags)
                if web_search_required
                else None
            ),
            "answer": (
                _source_excerpt(web_search_context.get("answer"), 700)
                if isinstance(web_search_context, dict) and web_search_context.get("answer")
                else None
            ),
            "results": web_results,
        },
        "review_note": review_note,
    }
    source_context["source_cards"] = _source_cards(source_context)
    return source_context


def _source_context_with_promotion_brief(
    payload: ContentGenerateRequest,
    source_context: dict[str, object],
) -> dict[str, object]:
    promotion_brief = build_promotion_brief(payload, source_context)
    return {
        **source_context,
        "promotion_brief": promotion_brief,
    }


def build_content_source_context(
    payload: ContentGenerateRequest,
) -> dict[str, object]:
    try:
        knowledge_context = _knowledge_context(payload)
        popular_posts = _popular_posts_context(payload, limit=3)
        web_search_context = build_live_web_search_context(
            platform=payload.platform,
            topic=payload.topic,
            tags=payload.tags,
        )
        source_context = _public_source_context(payload, knowledge_context, web_search_context)
        source_context = _source_context_with_promotion_brief(payload, source_context)
        source_context["popular_posts"] = popular_posts
        source_context["structure_references"] = [
            _extract_structure_pattern(post)
            for post in popular_posts
            if isinstance(post, dict) and post.get("content_preview")
        ]
        source_context["admission_notices"] = _admission_notices_context(payload, limit=3)
        return source_context
    except (TypeError, AttributeError, KeyError, ValueError) as exc:
        # Programming errors must not be silently swallowed; re-raise so
        # bugs surface during development instead of degrading silently.
        logger.error(
            "build_content_source_context hit a programming error for "
            "topic=%s platform=%s: %s: %s",
            getattr(payload, "topic", "?"),
            getattr(payload, "platform", "?"),
            type(exc).__name__,
            exc,
            exc_info=True,
        )
        raise
    except HTTPException:
        raise
    except (httpx.HTTPError, OSError, ConnectionError, TimeoutError) as exc:
        logger.warning(
            "build_content_source_context failed for topic=%s platform=%s: "
            "%s: %s",
            getattr(payload, "topic", "?"),
            getattr(payload, "platform", "?"),
            type(exc).__name__,
            exc,
            exc_info=True,
        )
        return {"error": "源上下文构建失败"}


# Maximum characters for generated content body (word count control)
MAX_BODY_CHARS = 800
MIN_BODY_CHARS = 200
