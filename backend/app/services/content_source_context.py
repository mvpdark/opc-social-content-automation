from sqlalchemy.orm import Session

from app.schemas.content import ContentGenerateRequest
from app.services.knowledge_service import latest_knowledge_compilation, search_knowledge_items
from app.services.promotion_brief import build_promotion_brief
from app.services.web_search_service import (
    build_live_web_search_context,
    build_tavily_query,
    topic_needs_live_web_search,
)

SOURCE_CONTEXT_EXCERPT_LENGTH = 420
SOURCE_CARD_SUPPORTED_CLAIM_LENGTH = 220


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
    db: Session,
    payload: ContentGenerateRequest,
) -> list[dict[str, object]]:
    query = payload.knowledge_query or payload.topic
    if payload.knowledge_limit == 0:
        return []

    results = search_knowledge_items(
        db=db,
        query=query,
        category=payload.category,
        limit=payload.knowledge_limit,
        mode="hybrid",
    )
    compiled = latest_knowledge_compilation(db)
    merged_results = []
    if compiled is not None:
        merged_results.append(compiled)
    merged_results.extend(item for item in results if compiled is None or item.id != compiled.id)
    return [
        {
            "id": item.id,
            "title": item.title,
            "category": item.category,
            "content": item.content,
            "score": item.score,
            "match_type": item.match_type,
        }
        for item in merged_results[: payload.knowledge_limit]
    ]


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
                "id": item["id"],
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
    db: Session,
    payload: ContentGenerateRequest,
) -> dict[str, object]:
    knowledge_context = _knowledge_context(db, payload)
    web_search_context = build_live_web_search_context(
        platform=payload.platform,
        topic=payload.topic,
        tags=payload.tags,
    )
    source_context = _public_source_context(payload, knowledge_context, web_search_context)
    return _source_context_with_promotion_brief(payload, source_context)
