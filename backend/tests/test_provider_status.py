from fastapi import HTTPException

from app.core.config import settings
from app.schemas.workspace import ProviderConnectionCheckRequest, ProviderKeyUpdateRequest
from app.services.workspace_service import (
    apply_provider_key_settings,
    check_provider_connection,
    provider_status_items,
)


def test_provider_status_does_not_expose_secret_values(monkeypatch) -> None:
    draft_secret = "draft-secret"
    image_secret = "image-secret"
    deepseek_secret = "deepseek-secret"
    tavily_secret = "tavily-secret"
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", draft_secret)
    monkeypatch.setattr(settings, "image_provider", "openai_compatible")
    monkeypatch.setattr(settings, "image_openai_compatible_api_key", image_secret)
    monkeypatch.setattr(settings, "deepseek_api_key", deepseek_secret)
    monkeypatch.setattr(settings, "tavily_search_enabled", True)
    monkeypatch.setattr(settings, "tavily_api_key", tavily_secret)

    payload = [item.model_dump() for item in provider_status_items()]
    text = str(payload)

    assert len(payload) == 4
    assert draft_secret not in text
    assert image_secret not in text
    assert deepseek_secret not in text
    assert tavily_secret not in text
    assert {item["status"] for item in payload} == {"configured"}


def test_codex_test_provider_status_notes_keep_production_boundary(monkeypatch) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")
    monkeypatch.setattr(settings, "image_provider", "codex_test")
    monkeypatch.setattr(settings, "openai_compatible_api_key", None)
    monkeypatch.setattr(settings, "image_openai_compatible_api_key", None)
    monkeypatch.setattr(settings, "tavily_api_key", None)

    payload = {item.name: item for item in provider_status_items()}

    assert payload["Draft generation"].configured is True
    assert payload["Draft generation"].note == "本地草稿检查可用；正式撰稿仍需真实模型服务。"
    assert payload["Image generation"].configured is True
    assert payload["Image generation"].note == "本地连通性检查可用；正式封面仍需真实图片服务。"
    assert payload["Web search"].configured is False


def test_apply_provider_keys_updates_runtime_without_exposing_values(monkeypatch) -> None:
    draft_secret = "draft-secret"
    image_secret = "image-secret"
    deepseek_secret = "deepseek-secret"
    monkeypatch.setattr(settings, "draft_provider", "codex_test")
    monkeypatch.setattr(settings, "image_provider", "codex_test")
    monkeypatch.setattr(settings, "openai_compatible_api_key", None)
    monkeypatch.setattr(settings, "image_openai_compatible_api_key", None)
    monkeypatch.setattr(settings, "deepseek_api_key", None)

    payload = apply_provider_key_settings(
        ProviderKeyUpdateRequest(
            draft_api_key=draft_secret,
            image_api_key=image_secret,
            deepseek_api_key=deepseek_secret,
        )
    )
    text = str([item.model_dump() for item in payload])

    assert settings.draft_provider == "openai_compatible"
    assert settings.image_provider == "openai_compatible"
    assert settings.openai_compatible_api_key == draft_secret
    assert settings.image_openai_compatible_api_key == image_secret
    assert settings.deepseek_api_key == deepseek_secret
    assert draft_secret not in text
    assert image_secret not in text
    assert deepseek_secret not in text


def test_apply_provider_keys_ignores_blank_values(monkeypatch) -> None:
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "image_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", "existing-draft-key")
    monkeypatch.setattr(settings, "image_openai_compatible_api_key", "existing-image-key")
    monkeypatch.setattr(settings, "deepseek_api_key", "existing-rewrite-key")

    apply_provider_key_settings(
        ProviderKeyUpdateRequest(
            draft_api_key="",
            image_api_key="   ",
            deepseek_api_key="",
        )
    )

    assert settings.openai_compatible_api_key == "existing-draft-key"
    assert settings.image_openai_compatible_api_key == "existing-image-key"
    assert settings.deepseek_api_key == "existing-rewrite-key"


def test_provider_connection_check_reports_missing_draft_key(monkeypatch) -> None:
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", None)

    result = check_provider_connection(ProviderConnectionCheckRequest(target="draft"))

    assert result.status == "missing_key"
    assert result.configured is False


def test_provider_connection_check_redacts_provider_errors(monkeypatch) -> None:
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", "secret-draft-key")

    def fail_draft(prompt_name: str, payload: dict[str, object]) -> str:
        raise HTTPException(status_code=502, detail="撰稿服务授权失败，请检查设置里的服务密钥和中转站地址。")

    monkeypatch.setattr(
        "app.services.workspace_service.model_router.draft_model",
        fail_draft,
    )

    result = check_provider_connection(ProviderConnectionCheckRequest(target="draft"))
    text = result.model_dump_json()

    assert result.status == "failed"
    assert result.configured is True
    assert "授权失败" in result.message
    assert "secret-draft-key" not in text
