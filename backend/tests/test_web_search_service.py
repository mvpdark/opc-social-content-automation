import httpx
import pytest
from fastapi import HTTPException
from topic_preset_helpers import load_generation_topic_presets, split_topic_tags

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
    assert topic_needs_live_web_search("水博项目校徽怎么找", ["水博"]) is True
    assert topic_needs_live_web_search("海外博士价格怎么对比", ["海外博士"]) is True
    assert topic_needs_live_web_search("博士项目官方来源怎么查", ["来源核验"]) is True
    assert topic_needs_live_web_search("海外博士来源核验清单", ["官网核验"]) is True
    assert topic_needs_live_web_search("官方来源清单怎么看", ["官网核验", "认证政策"]) is True
    assert topic_needs_live_web_search(
        "海外博士官方来源和费用怎么查",
        ["海外博士", "官方来源", "官网核验", "学费费用", "认证政策"],
    ) is True
    assert topic_needs_live_web_search("博士项目费用页怎么核验", ["海外博士"]) is True
    assert topic_needs_live_web_search("学校官网学费表怎么查", ["博士项目"]) is True
    assert topic_needs_live_web_search("Global water resources PhD rankings", ["PhD programs"]) is True
    assert topic_needs_live_web_search("Overseas doctoral program tuition fees", ["official sources"]) is True
    assert topic_needs_live_web_search("Doctoral program accreditation policy", ["official website"]) is True
    assert topic_needs_live_web_search("PhD mentor outreach timeline", ["planning"]) is False
    assert topic_needs_live_web_search("Costume design moodboard", ["creative planning"]) is False
    assert topic_needs_live_web_search("Homeschool ranking anxiety", ["family planning"]) is False


def test_split_topic_tags_handles_chinese_delimiters() -> None:
    assert split_topic_tags("水博，海外博士、在职博士；博士项目") == [
        "水博",
        "海外博士",
        "在职博士",
        "博士项目",
    ]


def test_fact_sensitive_recommended_topics_require_live_web_search() -> None:
    fact_sensitive_labels = {"榜单型", "来源型"}

    for preset in load_generation_topic_presets():
        if preset["desktopLabel"] not in fact_sensitive_labels:
            continue

        assert topic_needs_live_web_search(
            preset["topic"],
            split_topic_tags(preset["tags"]),
        ), preset["key"]


def test_build_tavily_query_expands_water_phd_topic() -> None:
    query = build_tavily_query("全球水博排名必看", "xiaohongshu", ["水博"])

    assert "全球水博排名必看" in query
    assert "认证" in query
    assert "official sources" in query
    assert query.startswith("global water resources PhD programs")


def test_build_tavily_query_preserves_logo_and_price_intent() -> None:
    logo_query = build_tavily_query("水博项目校徽怎么找", "xiaohongshu", ["水博"])
    price_query = build_tavily_query("海外博士价格怎么对比", "xiaohongshu", ["海外博士"])
    tuition_page_query = build_tavily_query("学校官网学费表怎么查", "xiaohongshu", ["博士项目"])
    accreditation_query = build_tavily_query("海外博士认证政策怎么核验", "xiaohongshu", ["来源核验"])
    english_tuition_query = build_tavily_query(
        "overseas doctoral program tuition fees",
        "xiaohongshu",
        ["official sources"],
    )
    official_fee_query = build_tavily_query(
        "海外博士官方来源和费用怎么查",
        "xiaohongshu",
        ["海外博士", "官方来源", "官网核验", "学费费用", "认证政策"],
    )
    official_source_checklist_query = build_tavily_query(
        "官方来源清单怎么看",
        "xiaohongshu",
        ["官网核验", "认证政策"],
    )
    english_policy_query = build_tavily_query(
        "doctoral program accreditation recognition policy",
        "xiaohongshu",
        ["official sources"],
    )

    assert "official logo" in logo_query
    assert "school emblem" in logo_query
    assert "校徽" in logo_query
    assert "total cost" in price_query
    assert "tuition fees" in price_query
    assert "价格" in price_query
    assert "tuition fees" in tuition_page_query
    assert "学费" in tuition_page_query
    assert "official accreditation policy" in accreditation_query
    assert "认证" in accreditation_query
    assert "政策" in accreditation_query
    assert "tuition fees total cost" in english_tuition_query
    assert "海外博士官方来源和费用怎么查" in official_fee_query
    assert "official sources" in official_fee_query
    assert "tuition fees" in official_fee_query
    assert "official accreditation policy" in official_fee_query
    assert "官方来源清单怎么看" in official_source_checklist_query
    assert "official sources" in official_source_checklist_query
    assert "official accreditation policy" in official_source_checklist_query
    assert "official accreditation policy" in english_policy_query


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
                "answer": "Official sources should be checked before using a ranking summary.",
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
    payload_context = context.to_prompt_payload()
    assert context.provider == "tavily"
    assert context.answer == "Official sources should be checked before using a ranking summary."
    assert "answer summary" in str(payload_context["usage_note"])
    assert "not standalone proof" in str(payload_context["usage_note"])
    assert context.results[0].title == "World university water resources program"
    assert context.results[0].url == "https://example.edu/water-phd"
    assert requests[0]["url"] == "https://api.tavily.test/search"
    payload = requests[0]["json"]
    assert isinstance(payload, dict)
    assert payload["include_answer"] is True
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


@pytest.mark.parametrize(
    ("status_code", "expected_detail"),
    [
        (401, "授权失败"),
        (403, "授权失败"),
        (429, "额度或频率限制"),
        (503, "服务暂时不可用"),
    ],
)
def test_tavily_search_explains_http_failures(
    monkeypatch: pytest.MonkeyPatch,
    status_code: int,
    expected_detail: str,
) -> None:
    def fake_post(url: str, **kwargs: object) -> httpx.Response:
        return httpx.Response(status_code, request=httpx.Request("POST", url))

    monkeypatch.setattr(settings, "tavily_search_enabled", True)
    monkeypatch.setattr(settings, "tavily_api_key", "test-key")
    monkeypatch.setattr("app.services.web_search_service.httpx.post", fake_post)

    with pytest.raises(HTTPException) as exc:
        tavily_search("全球水博排名必看")

    assert exc.value.status_code == 502
    assert expected_detail in exc.value.detail
