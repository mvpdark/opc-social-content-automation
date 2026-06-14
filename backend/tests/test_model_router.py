import httpx
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.services.model_router import (
    GENERATED_ASSET_ROOT,
    load_platform_style_reference,
    model_router,
)


def test_embedding_model_is_deterministic() -> None:
    first = model_router.embedding_model("硕升博 内容 自动化")
    second = model_router.embedding_model("硕升博 内容 自动化")

    assert first == second
    assert len(first) == settings.embedding_dimensions


def test_embedding_model_handles_empty_text() -> None:
    vector = model_router.embedding_model("")

    assert len(vector) == settings.embedding_dimensions
    assert set(vector) == {0.0}


def test_codex_test_draft_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")

    result = model_router.draft_model(
        "draft_generation",
        {
            "platform": "xiaohongshu",
            "topic": "硕升博申请节奏",
            "tags": ["规划", "申请"],
            "knowledge_context": [{"title": "申请时间线"}],
        },
    )

    assert "【本地检查草稿】硕升博申请节奏" in result
    assert "本地检查模式生成的草稿" in result
    assert "codex_test 测试 Provider" not in result
    assert "申请时间线" in result


def test_codex_test_draft_provider_does_not_echo_hidden_tone_rules(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")

    result = model_router.draft_model(
        "draft_generation",
        {
            "platform": "xiaohongshu",
            "topic": "硕升博申请节奏",
            "tone": "偏女性可爱风；隐藏撰稿规则：自动使用 [笑哭R]，不要解释字符码。",
        },
    )

    assert "偏女性可爱风" in result
    assert "隐藏撰稿规则" not in result
    assert "[笑哭R]" not in result


def test_codex_test_draft_provider_uses_xhs_expression_layer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")

    result = model_router.draft_model(
        "draft_generation",
        {
            "platform": "xiaohongshu",
            "topic": "硕升博申请节奏",
            "tone": "偏女性可爱风；必须有表情包感和活泼标点。",
        },
    )

    assert "姐妹们" in result
    assert "👉" in result
    assert "👇" in result
    assert "📍" in result
    assert "✅" in result
    assert "🎓" in result
    assert "😎" in result
    assert "[哇R]" in result
    assert "！！" in result
    assert "（真的会累）" in result


def test_codex_test_draft_provider_keeps_water_ranking_topic(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")

    result = model_router.draft_model(
        "draft_generation",
        {
            "platform": "xiaohongshu",
            "topic": "全球水博排名必看",
            "tags": ["水博", "排名"],
        },
    )

    assert "全球水博排名必看" in result
    assert "水博" in result
    assert "认证" in result
    assert "预算" in result
    assert "榜" in result
    assert "研究方向、目标导师和时间节点" not in result


def test_codex_test_draft_provider_warns_missing_sources_for_water_ranking_topic(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")

    result = model_router.draft_model(
        "draft_generation",
        {
            "platform": "xiaohongshu",
            "topic": "全球水博排名必看",
            "tags": ["水博", "排名"],
            "web_search_context": {
                "required": True,
                "query": "global water resources PhD programs official sources",
                "results": [],
                "usage_note": "Live web search was required but no Tavily sources were available.",
            },
        },
    )

    assert "全球水博排名必看" in result
    assert "没有可见 Tavily 来源" in result
    assert "核验框架" in result
    assert "硬编学校名" in result
    assert "研究方向、目标导师和时间节点" not in result


def test_codex_test_draft_provider_keeps_colloquial_school_list_topic(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")

    result = model_router.draft_model(
        "draft_generation",
        {
            "platform": "xiaohongshu",
            "topic": "水博哪个学校好",
            "tags": ["水博", "博士项目"],
        },
    )

    assert "水博哪个学校好" in result
    assert "认证" in result
    assert "预算" in result
    assert "硬编学校名" in result
    assert "研究方向、目标导师和时间节点" not in result


def test_codex_test_draft_provider_handles_missing_required_web_sources(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")

    result = model_router.draft_model(
        "draft_generation",
        {
            "platform": "xiaohongshu",
            "topic": "水博项目校徽和价格怎么对比",
            "tags": ["水博", "价格", "校徽"],
            "web_search_context": {
                "required": True,
                "query": "global water resources PhD programs official logo tuition",
                "results": [],
                "usage_note": "Live web search was required but no Tavily sources were available.",
            },
        },
    )

    assert "水博项目校徽和价格怎么对比" in result
    assert "没有可见 Tavily 来源" in result
    assert "核验框架" in result
    assert "学校/项目名、价格、logo/校徽" in result
    assert "研究方向、目标导师和时间节点" not in result


@pytest.mark.parametrize(
    ("topic", "expected_terms", "forbidden_terms"),
    [
        ("硕升博申请路线怎么选", ("路线", "选择", "适配"), ("群发邮件",)),
        ("导师匹配前要做的方向自查", ("导师", "匹配", "论文"), ("12-9 个月",)),
        ("研究方向太散怎么收", ("关键词", "问题意识", "收敛"), ("预算友好榜",)),
        ("没有论文还能读博吗", ("项目经历", "工作成果", "背景补强"), ("预算友好榜",)),
        ("在职博士申请时间线怎么排", ("时间线", "12-9 个月", "DDL"), ("预算友好榜",)),
        ("什么时候开始联系导师", ("时间线", "12-9 个月", "联系导师"), ("导师不是被模板打动",)),
        ("适合上班族的博士项目怎么咨询", ("咨询", "需求", "转化"), ("近期论文",)),
        ("别人问博士含金量怎么回答", ("含金量", "价值", "异议"), ("近期论文",)),
    ],
)
def test_codex_test_draft_provider_matches_recommended_topic_intent(
    monkeypatch: pytest.MonkeyPatch,
    topic: str,
    expected_terms: tuple[str, ...],
    forbidden_terms: tuple[str, ...],
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")

    result = model_router.draft_model(
        "draft_generation",
        {
            "platform": "xiaohongshu",
            "topic": topic,
            "tags": [],
        },
    )

    assert topic in result
    for term in expected_terms:
        assert term in result
    for term in forbidden_terms:
        assert term not in result


def test_codex_test_image_provider_creates_svg(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "image_provider", "codex_test")
    monkeypatch.setattr(settings, "test_static_url_prefix", "/static/generated")

    image_url = model_router.image_model(
        "image_generation",
        {
            "content_id": 1,
            "platform": "xiaohongshu",
            "title": "硕升博申请节奏",
            "template": {"name": "Xiaohongshu cover"},
            "aspect_ratio": "3:4",
        },
    )

    assert image_url.startswith("/static/generated/codex-test-")
    filename = image_url.rsplit("/", 1)[-1]
    generated_file = GENERATED_ASSET_ROOT / filename
    assert generated_file.exists()
    svg_text = generated_file.read_text(encoding="utf-8")
    assert 'width="2048"' in svg_text
    assert 'height="2736"' in svg_text
    assert "本地检查素材" in svg_text
    assert "流程联调" not in svg_text
    generated_file.unlink()


def test_load_platform_style_reference_for_xiaohongshu() -> None:
    reference = load_platform_style_reference("xiaohongshu")

    assert "Xiaohongshu Style Reference" in reference
    assert "not as proof of platform performance" in reference


def test_openai_compatible_draft_provider_requires_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", None)

    with pytest.raises(HTTPException) as exc:
        model_router.draft_model("draft_generation", {"topic": "test"})

    assert exc.value.status_code == 501
    assert "撰稿服务尚未配置服务授权" in exc.value.detail


def test_openai_compatible_draft_provider_calls_chat_completion(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[dict[str, object]] = []
    secret = "test-compatible-key"
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", secret)
    monkeypatch.setattr(settings, "openai_compatible_base_url", "https://example.test/v1")
    monkeypatch.setattr(settings, "draft_model", "gpt-5.5")
    monkeypatch.setattr(settings, "draft_max_tokens", 1234)
    monkeypatch.setattr(settings, "draft_temperature", 0.55)

    class FakeResponse:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {"choices": [{"message": {"content": "draft output"}}]}

    class FakeClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(
            self,
            url: str,
            headers: dict[str, str],
            json: dict[str, object],
        ) -> FakeResponse:
            requests.append({"url": url, "headers": headers, "json": json})
            return FakeResponse()

    monkeypatch.setattr("app.services.model_router.httpx.Client", FakeClient)

    result = model_router.draft_model("draft_generation", {"topic": "硕升博"})

    assert result == "draft output"
    assert requests[0]["url"] == "https://example.test/v1/chat/completions"
    request_json = requests[0]["json"]
    assert isinstance(request_json, dict)
    assert request_json["model"] == "gpt-5.5"
    assert request_json["store"] is False
    assert request_json["max_tokens"] == 1234
    assert request_json["temperature"] == 0.55
    messages = request_json["messages"]
    assert isinstance(messages, list)
    user_message = messages[1]
    assert isinstance(user_message, dict)
    assert "\\u" in str(user_message["content"])
    assert "硕升博" not in str(user_message["content"])
    assert secret not in str(request_json)


def test_openai_compatible_draft_provider_reports_timeout(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    secret = "test-compatible-key"
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", secret)
    monkeypatch.setattr(settings, "openai_compatible_base_url", "https://example.test/v1")
    monkeypatch.setattr(settings, "draft_timeout_seconds", 12.0)

    class FakeClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(
            self,
            url: str,
            headers: dict[str, str],
            json: dict[str, object],
        ) -> object:
            request = httpx.Request("POST", url)
            raise httpx.ReadTimeout("timed out", request=request)

    monkeypatch.setattr("app.services.model_router.httpx.Client", FakeClient)

    with pytest.raises(HTTPException) as exc:
        model_router.draft_model("draft_generation", {"topic": "test"})

    assert exc.value.status_code == 504
    assert "响应超时" in exc.value.detail
    assert "12" in exc.value.detail
    assert secret not in exc.value.detail


def test_openai_compatible_draft_provider_reports_invalid_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    secret = "test-compatible-key"
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", secret)
    monkeypatch.setattr(settings, "openai_compatible_base_url", "https://example.test/v1")

    class FakeResponse:
        status_code = 401

        def raise_for_status(self) -> None:
            request = httpx.Request("POST", "https://example.test/v1/chat/completions")
            response = httpx.Response(
                401,
                request=request,
                json={"code": "INVALID_API_KEY", "message": "Invalid API key"},
            )
            raise httpx.HTTPStatusError(
                "invalid api key",
                request=request,
                response=response,
            )

        def json(self) -> dict[str, object]:
            return {}

    class FakeClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(
            self,
            url: str,
            headers: dict[str, str],
            json: dict[str, object],
        ) -> FakeResponse:
            return FakeResponse()

    monkeypatch.setattr("app.services.model_router.httpx.Client", FakeClient)

    with pytest.raises(HTTPException) as exc:
        model_router.draft_model("draft_generation", {"topic": "test"})

    assert exc.value.status_code == 502
    assert "撰稿服务授权无效" in exc.value.detail
    assert secret not in exc.value.detail


def test_openai_compatible_image_provider_requires_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "image_provider", "openai_compatible")
    monkeypatch.setattr(settings, "image_openai_compatible_api_key", None)
    monkeypatch.setattr(settings, "openai_compatible_api_key", None)

    with pytest.raises(HTTPException) as exc:
        model_router.image_model("image_generation", {"title": "test"})

    assert exc.value.status_code == 501
    assert "图片服务尚未配置服务授权" in exc.value.detail


def test_openai_compatible_image_provider_accepts_remote_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[dict[str, object]] = []
    secret = "test-image-key"
    monkeypatch.setattr(settings, "image_provider", "openai_compatible")
    monkeypatch.setattr(settings, "image_openai_compatible_api_key", secret)
    monkeypatch.setattr(settings, "image_openai_compatible_base_url", "https://image.test/v1")
    monkeypatch.setattr(settings, "image_model", "gpt-image-2")
    monkeypatch.setattr(settings, "image_size", "1024x1024")
    monkeypatch.setattr(settings, "image_response_format", None)

    class FakeResponse:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {"data": [{"url": "https://cdn.test/image.png"}]}

    class FakeClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(
            self,
            url: str,
            headers: dict[str, str],
            json: dict[str, object],
        ) -> FakeResponse:
            requests.append({"url": url, "headers": headers, "json": json})
            return FakeResponse()

    monkeypatch.setattr("app.services.model_router.httpx.Client", FakeClient)

    result = model_router.image_model(
        "image_generation",
        {
            "title": "硕升博封面",
            "platform": "xiaohongshu",
            "aspect_ratio": "3:4",
            "visual_direction": {
                "id": "dark-academic-blueprint",
                "name": "深色学术蓝图",
                "instructions": "Use a dark navy academic blueprint look.",
                "avoid": "Avoid warm daylight sticky-note desk scenes.",
            },
            "style_reference": "Use strong mobile cover hooks.",
        },
    )

    assert result == "https://cdn.test/image.png"
    assert requests[0]["url"] == "https://image.test/v1/images/generations"
    request_json = requests[0]["json"]
    assert isinstance(request_json, dict)
    assert request_json["model"] == "gpt-image-2"
    assert request_json["size"] == "2048x2736"
    assert "primary cover headline must copy the content title verbatim" in str(
        request_json["prompt"]
    )
    assert "High-attraction Xiaohongshu cover formula" in str(request_json["prompt"])
    assert "Selected visual direction" in str(request_json["prompt"])
    assert "dark-academic-blueprint" in str(request_json["prompt"])
    assert "Use strong mobile cover hooks." in str(request_json["prompt"])
    assert secret not in str(request_json)


def test_openai_compatible_image_provider_stores_b64_png(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "image_provider", "openai_compatible")
    monkeypatch.setattr(settings, "image_openai_compatible_api_key", "test-image-key")
    monkeypatch.setattr(settings, "image_openai_compatible_base_url", "https://image.test/v1")
    monkeypatch.setattr(settings, "test_static_url_prefix", "/static/generated")
    monkeypatch.setattr(settings, "image_size", "1024x1024")
    monkeypatch.setattr(settings, "image_response_format", "b64_json")

    class FakeResponse:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {"data": [{"b64_json": "iVBORw0KGgo="}]}

    class FakeClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, *args: object, **kwargs: object) -> FakeResponse:
            return FakeResponse()

    monkeypatch.setattr("app.services.model_router.httpx.Client", FakeClient)

    result = model_router.image_model("image_generation", {"title": "硕升博封面"})

    assert result.startswith("/static/generated/image2-")
    generated_file = GENERATED_ASSET_ROOT / result.rsplit("/", 1)[-1]
    assert generated_file.exists()
    assert generated_file.suffix == ".png"
    generated_file.unlink()


def test_rewrite_model_requires_deepseek_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "deepseek_api_key", None)

    with pytest.raises(HTTPException) as exc:
        model_router.rewrite_model("humanization", {"body": "test"})

    assert exc.value.status_code == 501
    assert "改写服务尚未配置" in exc.value.detail


def test_rewrite_model_calls_deepseek_without_exposing_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[dict[str, object]] = []
    secret = "test-secret-key"
    monkeypatch.setattr(settings, "deepseek_api_key", secret)
    monkeypatch.setattr(settings, "deepseek_base_url", "https://api.deepseek.com")
    monkeypatch.setattr(settings, "deepseek_rewrite_model", "deepseek-v4-pro")

    class FakeResponse:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {"choices": [{"message": {"content": "humanized output"}}]}

    class FakeClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(
            self,
            url: str,
            headers: dict[str, str],
            json: dict[str, object],
        ) -> FakeResponse:
            requests.append({"url": url, "headers": headers, "json": json})
            return FakeResponse()

    monkeypatch.setattr("app.services.model_router.httpx.Client", FakeClient)

    result = model_router.rewrite_model("humanization", {"body": "AI draft"})

    assert result == "humanized output"
    assert requests[0]["url"] == "https://api.deepseek.com/chat/completions"
    request_json = requests[0]["json"]
    assert isinstance(request_json, dict)
    assert request_json["model"] == "deepseek-v4-pro"
    assert request_json["thinking"] == {"type": "disabled"}
    assert secret not in str(request_json)
