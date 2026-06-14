from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


LIVE_SEARCH_FACT_TERMS = (
    "最新",
    "今天",
    "今年",
    "2025",
    "2026",
    "官网",
    "logo",
    "政策",
    "费用",
    "学费",
    "预算",
    "认证",
)

LIVE_SEARCH_LIST_TERMS = (
    "排名",
    "排行",
    "排行榜",
    "榜单",
    "清单",
    "名单",
    "哪些",
    "有哪些",
    "哪几所",
    "哪几个",
    "哪个学校",
    "哪所学校",
    "哪个院校",
    "哪所院校",
    "哪个项目",
)

LIVE_SEARCH_SCOPE_TERMS = (
    "全球",
    "学校",
    "院校",
    "项目",
    "水博",
    "海外博士",
    "境外博士",
)


@dataclass(frozen=True)
class WebSearchResult:
    title: str
    url: str
    content: str
    score: float | None = None


@dataclass(frozen=True)
class WebSearchContext:
    provider: str
    query: str
    answer: str | None
    results: list[WebSearchResult]

    def to_prompt_payload(self) -> dict[str, object]:
        return {
            "provider": self.provider,
            "query": self.query,
            "answer": self.answer,
            "results": [
                {
                    "title": item.title,
                    "url": item.url,
                    "content": item.content,
                    "score": item.score,
                }
                for item in self.results
            ],
            "usage_note": (
                "These are live web search results. Use them as source context, "
                "keep uncertainty visible, and do not invent facts not present in sources."
            ),
        }


def topic_needs_live_web_search(topic: str, tags: list[str] | None = None) -> bool:
    haystack = " ".join([topic, *(tags or [])]).lower()
    has_fact_term = any(term.lower() in haystack for term in LIVE_SEARCH_FACT_TERMS)
    has_list_term = any(term.lower() in haystack for term in LIVE_SEARCH_LIST_TERMS)
    has_scope_term = any(term.lower() in haystack for term in LIVE_SEARCH_SCOPE_TERMS)
    return has_fact_term or (has_list_term and has_scope_term)


def build_tavily_query(topic: str, platform: str, tags: list[str] | None = None) -> str:
    tag_text = " ".join(tags or [])
    topic_text = f"{topic} {tag_text}".strip()
    if any(term in topic_text for term in ("水博", "水资源")):
        return (
            "global water resources PhD programs university rankings official sources "
            "tuition accreditation in-service doctoral program "
            f"{topic_text} 全球 博士 项目 学校 排名 认证 学费 官网"
        ).strip()
    if any(term in topic_text for term in ("海外博士", "境外博士", "在职博士", "低预算")):
        return (
            "overseas doctoral programs official sources tuition accreditation "
            "in-service doctoral program budget application requirements "
            f"{topic_text} 博士 项目 学校 认证 学费 费用 官网"
        ).strip()
    if platform == "xiaohongshu":
        return f"official sources current facts Xiaohongshu content research {topic_text}".strip()
    return f"official sources current facts {topic_text}".strip()


def _clean_text(value: object, max_length: int) -> str:
    text = " ".join(str(value or "").split())
    return text[:max_length]


def _safe_max_results(value: int) -> int:
    return max(1, min(value, 10))


def _parse_tavily_results(data: dict[str, Any], query: str) -> WebSearchContext:
    raw_results = data.get("results")
    results: list[WebSearchResult] = []
    if isinstance(raw_results, list):
        for raw_item in raw_results:
            if not isinstance(raw_item, dict):
                continue
            title = _clean_text(raw_item.get("title"), 180)
            url = _clean_text(raw_item.get("url"), 600)
            content = _clean_text(raw_item.get("content") or raw_item.get("raw_content"), 900)
            if not title or not url or not content:
                continue
            raw_score = raw_item.get("score")
            score = float(raw_score) if isinstance(raw_score, int | float) else None
            results.append(WebSearchResult(title=title, url=url, content=content, score=score))

    answer = data.get("answer")
    return WebSearchContext(
        provider="tavily",
        query=query,
        answer=_clean_text(answer, 1200) if answer else None,
        results=results,
    )


def tavily_search(query: str, *, max_results: int | None = None) -> WebSearchContext | None:
    if not settings.tavily_search_enabled or not settings.tavily_api_key:
        return None

    request_payload: dict[str, object] = {
        "query": query,
        "auto_parameters": True,
        "include_answer": False,
        "include_raw_content": False,
        "include_images": False,
        "include_image_descriptions": False,
        "max_results": _safe_max_results(max_results or settings.tavily_max_results),
        "search_depth": "basic",
        "topic": "general",
    }

    try:
        response = httpx.post(
            f"{settings.tavily_base_url.rstrip('/')}/search",
            headers={
                "Authorization": f"Bearer {settings.tavily_api_key}",
                "Content-Type": "application/json",
            },
            json=request_payload,
            timeout=settings.tavily_timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        detail = (
            f"Tavily 联网检索失败（HTTP {status_code}）。"
            if status_code
            else "Tavily 联网检索失败。"
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Tavily 联网检索暂时不可用，请稍后重试。",
        ) from exc

    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Tavily 联网检索返回格式异常。",
        )

    context = _parse_tavily_results(data, query)
    if not context.results:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Tavily 联网检索没有返回可用来源，请换一个更具体的选题或关键词。",
        )
    return context


def build_live_web_search_context(
    *,
    platform: str,
    topic: str,
    tags: list[str] | None = None,
) -> dict[str, object] | None:
    if not topic_needs_live_web_search(topic, tags):
        return None

    context = tavily_search(build_tavily_query(topic=topic, platform=platform, tags=tags))
    return context.to_prompt_payload() if context else None
