import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.services.model_router import GENERATED_ASSET_ROOT, model_router


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

    assert "【测试草稿】硕升博申请节奏" in result
    assert "codex_test 测试 Provider" in result
    assert "申请时间线" in result


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
    assert "OPC TEST ASSET" in generated_file.read_text(encoding="utf-8")
    generated_file.unlink()


def test_openai_compatible_draft_provider_requires_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", None)

    with pytest.raises(HTTPException) as exc:
        model_router.draft_model("draft_generation", {"topic": "test"})

    assert exc.value.status_code == 501
    assert "OpenAI-compatible draft provider" in exc.value.detail


def test_openai_compatible_draft_provider_calls_chat_completion(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[dict[str, object]] = []
    secret = "test-compatible-key"
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", secret)
    monkeypatch.setattr(settings, "openai_compatible_base_url", "https://example.test/v1")
    monkeypatch.setattr(settings, "draft_model", "gpt-5.5")

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
    assert secret not in str(request_json)


def test_openai_compatible_image_provider_requires_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "image_provider", "openai_compatible")
    monkeypatch.setattr(settings, "image_openai_compatible_api_key", None)
    monkeypatch.setattr(settings, "openai_compatible_api_key", None)

    with pytest.raises(HTTPException) as exc:
        model_router.image_model("image_generation", {"title": "test"})

    assert exc.value.status_code == 501
    assert "OpenAI-compatible image provider" in exc.value.detail


def test_openai_compatible_image_provider_accepts_remote_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[dict[str, object]] = []
    secret = "test-image-key"
    monkeypatch.setattr(settings, "image_provider", "openai_compatible")
    monkeypatch.setattr(settings, "image_openai_compatible_api_key", secret)
    monkeypatch.setattr(settings, "image_openai_compatible_base_url", "https://image.test/v1")
    monkeypatch.setattr(settings, "image_model", "gpt-image-2")
    monkeypatch.setattr(settings, "image_size", None)
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
        {"title": "硕升博封面", "platform": "xiaohongshu", "aspect_ratio": "3:4"},
    )

    assert result == "https://cdn.test/image.png"
    assert requests[0]["url"] == "https://image.test/v1/images/generations"
    request_json = requests[0]["json"]
    assert isinstance(request_json, dict)
    assert request_json["model"] == "gpt-image-2"
    assert request_json["size"] == "1024x1536"
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
    assert "DeepSeek rewrite provider" in exc.value.detail


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
