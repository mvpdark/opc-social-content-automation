import httpx
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.services.web_search_service import (
    build_tavily_query,
    tavily_search,
    topic_needs_live_web_search,
)


def test_topic_needs_live_web_search_for_ranking_topic() -> None:
    assert topic_needs_live_web_search("全球水博排名必看", ["水博", "排名"]) is True
    assert topic_needs_live_web_search("硕升博申请节奏", ["规划"]) is False
    assert topic_needs_live_web_search("硕升博申请第一步，不是先套磁", ["硕升博", "水博"]) is False
    assert topic_needs_live_web_search("低预算海外博士怎么筛", ["预算榜单"]) is True
    assert topic_needs_live_web_search(
        "低预算海外博士怎么筛",
        ["海外博士", "低预算博士", "在职博士", "博士项目"],
    ) is True
    assert topic_needs_live_web_search("水博有哪些学校", ["水博", "博士项目"]) is True
    assert topic_needs_live_web_search("海外博士哪些项目适合在职", ["海外博士"]) is True
    assert topic_needs_live_web_search("水博哪个学校好", ["水博"]) is True
    assert topic_needs_live_web_search("海外博士哪个项目适合在职", ["海外博士"]) is True


def test_build_tavily_query_expands_water_phd_topic() -> None:
    query = build_tavily_query("全球水博排名必看", "xiaohongshu", ["水博"])

    assert "全球水博排名必看" in query
    assert "认证" in query
    assert "official sources" in query
    assert query.startswith("global water resources PhD programs")


def test_build_tavily_query_keeps_budget_overseas_doctorate_general() -> None:
    query = build_tavily_query(
        "低预算海外博士怎么筛",
        "xiaohongshu",
        ["海外博士", "低预算博士", "在职博士", "博士项目"],
    )

    assert "低预算海外博士怎么筛" in query
    assert "tuition" in query
    assert "accreditation" in query
    assert "water resources" not in query
    assert query.startswith("overseas doctoral programs")


def test_tavily_search_returns_none_when_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "tavily_search_enabled", False)
    monkeypatch.setattr(settings, "tavily_api_key", "test-key")

    assert tavily_search("全球水博排名必看") is None


def test_tavily_search_posts_to_api_and_parses_results(monkeypatch: pytest.MonkeyPatch) -> None:
    requests: list[dict[str, object]] = []

    def fake_post(url: str, **kwargs: object) -> httpx.Response:
        requests.append({"url": url, **kwargs})
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={
                "results": [
                    {
                        "title": "World university water resources program",
                        "url": "https://example.edu/water-phd",
                        "content": "Official doctoral program page with water resources research.",
                        "score": 0.88,
                    }
                ]
            },
        )

    monkeypatch.setattr(settings, "tavily_search_enabled", True)
    monkeypatch.setattr(settings, "tavily_api_key", "test-key")
    monkeypatch.setattr(settings, "tavily_base_url", "https://api.tavily.test")
    monkeypatch.setattr(settings, "tavily_max_results", 3)
    monkeypatch.setattr("app.services.web_search_service.httpx.post", fake_post)

    context = tavily_search("全球水博排名必看")

    assert context is not None
    assert context.provider == "tavily"
    assert context.results[0].title == "World university water resources program"
    assert context.results[0].url == "https://example.edu/water-phd"
    assert requests[0]["url"] == "https://api.tavily.test/search"
    payload = requests[0]["json"]
    assert isinstance(payload, dict)
    assert payload["include_answer"] is False
    assert payload["include_raw_content"] is False
    assert payload["max_results"] == 3


def test_tavily_search_rejects_empty_results(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_post(url: str, **kwargs: object) -> httpx.Response:
        return httpx.Response(200, request=httpx.Request("POST", url), json={"results": []})

    monkeypatch.setattr(settings, "tavily_search_enabled", True)
    monkeypatch.setattr(settings, "tavily_api_key", "test-key")
    monkeypatch.setattr("app.services.web_search_service.httpx.post", fake_post)

    with pytest.raises(HTTPException) as exc:
        tavily_search("全球水博排名必看")

    assert exc.value.status_code == 502
    assert "没有返回可用来源" in exc.value.detail
