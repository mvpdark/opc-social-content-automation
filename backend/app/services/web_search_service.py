from __future__ import annotations

import re
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
    "official source",
    "official sources",
    "official website",
    "logo",
    "emblem",
    "校徽",
    "标志",
    "来源",
    "核验",
    "官方",
    "项目页",
    "费用页",
    "学费表",
    "收费",
    "政策",
    "policy",
    "recognition",
    "价格",
    "费用",
    "学费",
    "tuition",
    "tuition fee",
    "tuition fees",
    "fees",
    "cost",
    "costs",
    "total cost",
    "预算",
    "budget",
    "认证",
    "accreditation",
)

LIVE_SEARCH_LIST_TERMS = (
    "排名",
    "排行",
    "排行榜",
    "ranking",
    "rankings",
    "榜单",
    "清单",
    "名单",
    "school list",
    "program list",
    "which schools",
    "which programs",
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
    "global",
    "学校",
    "school",
    "schools",
    "院校",
    "university",
    "universities",
    "项目",
    "program",
    "programs",
    "phd",
    "doctoral",
    "doctorate",
    "水博",
    "water resources",
    "海外博士",
    "overseas phd",
    "overseas doctorate",
    "overseas doctoral",
    "境外博士",
)

LOGO_QUERY_TERMS = ("logo", "emblem", "校徽", "标志")
PRICE_QUERY_TERMS = (
    "price",
    "cost",
    "costs",
    "fees",
    "tuition",
    "tuition fee",
    "tuition fees",
    "total cost",
    "budget",
    "价格",
    "费用",
    "学费",
    "预算",
    "费用页",
    "学费表",
    "收费",
)
POLICY_QUERY_TERMS = (
    "accreditation",
    "policy",
    "recognition",
    "recognized",
    "credential",
    "认证",
    "政策",
    "认可",
    "资质",
)


def _contains_search_term(text: str, term: str) -> bool:
    normalized_term = term.lower().strip()
    if not normalized_term:
        return False
    if normalized_term.isascii():
        return re.search(rf"(?<![a-z0-9]){re.escape(normalized_term)}(?![a-z0-9])", text) is not None
    return normalized_term in text


def _contains_any_search_term(text: str, terms: tuple[str, ...]) -> bool:
    return any(_contains_search_term(text, term) for term in terms)


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
                "These are live web search results. Use titles, URLs, snippets, and "
                "answer summary as source context; treat the answer as orientation, "
                "not standalone proof. Keep uncertainty visible, and do not invent "
                "facts not present in sources."
            ),
        }


def topic_needs_live_web_search(topic: str, tags: list[str] | None = None) -> bool:
    haystack = " ".join([topic, *(tags or [])]).lower()
    has_fact_term = _contains_any_search_term(haystack, LIVE_SEARCH_FACT_TERMS)
    has_list_term = _contains_any_search_term(haystack, LIVE_SEARCH_LIST_TERMS)
    has_scope_term = _contains_any_search_term(haystack, LIVE_SEARCH_SCOPE_TERMS)
    return has_fact_term or (has_list_term and has_scope_term)


def _query_focus_terms(topic_text: str) -> str:
    normalized = topic_text.lower()
    focus_terms: list[str] = []
    if _contains_any_search_term(normalized, LOGO_QUERY_TERMS):
        focus_terms.append("official logo school emblem brand identity 校徽 官方 标志")
    if _contains_any_search_term(normalized, PRICE_QUERY_TERMS):
        focus_terms.append("tuition fees total cost budget 学费 费用 价格")
    if _contains_any_search_term(normalized, POLICY_QUERY_TERMS):
        focus_terms.append("official accreditation policy recognition 认证 政策 认可")
    return " ".join(focus_terms)


def _join_query_parts(*parts: str) -> str:
    return " ".join(part.strip() for part in parts if part.strip())


def build_tavily_query(topic: str, platform: str, tags: list[str] | None = None) -> str:
    tag_text = " ".join(tags or [])
    topic_text = f"{topic} {tag_text}".strip()
    focus_terms = _query_focus_terms(topic_text)
    if any(term in topic_text for term in ("水博", "水资源")):
        return _join_query_parts(
            "global water resources PhD programs university rankings official sources "
            "tuition accreditation in-service doctoral program",
            focus_terms,
            f"{topic_text} 全球 博士 项目 学校 排名 认证 学费 官网",
        )
    if any(term in topic_text for term in ("海外博士", "境外博士", "在职博士", "低预算")):
        return _join_query_parts(
            "overseas doctoral programs official sources tuition accreditation "
            "in-service doctoral program budget application requirements",
            focus_terms,
            f"{topic_text} 博士 项目 学校 认证 学费 费用 官网",
        )
    if platform == "xiaohongshu":
        return _join_query_parts(
            "official sources current facts Xiaohongshu content research",
            focus_terms,
            topic_text,
        )
    return _join_query_parts("official sources current facts", focus_terms, topic_text)


def _clean_text(value: object, max_length: int) -> str:
    text = " ".join(str(value or "").split())
    return text[:max_length]


def _safe_max_results(value: int) -> int:
    return max(1, min(value, 10))


def _tavily_status_error_detail(status_code: int | None) -> str:
    if status_code in {401, 403}:
        return "Tavily 授权失败，请检查 Tavily 服务授权是否已保存并有效。"
    if status_code == 429:
        return "Tavily 联网检索触发额度或频率限制，请稍后重试，或减少批量检索请求。"
    if status_code and status_code >= 500:
        return f"Tavily 服务暂时不可用（HTTP {status_code}），请稍后重试。"
    if status_code:
        return f"Tavily 联网检索失败（HTTP {status_code}），请检查关键词或服务配置。"
    return "Tavily 联网检索失败，请稍后重试。"


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
        "include_answer": True,
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
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_tavily_status_error_detail(status_code),
        ) from exc
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
