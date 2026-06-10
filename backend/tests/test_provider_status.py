from app.core.config import settings
from app.schemas.workspace import ProviderKeyUpdateRequest
from app.services.workspace_service import apply_provider_key_settings, provider_status_items


def test_provider_status_does_not_expose_secret_values(monkeypatch) -> None:
    draft_secret = "draft-secret"
    image_secret = "image-secret"
    deepseek_secret = "deepseek-secret"
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", draft_secret)
    monkeypatch.setattr(settings, "image_provider", "openai_compatible")
    monkeypatch.setattr(settings, "image_openai_compatible_api_key", image_secret)
    monkeypatch.setattr(settings, "deepseek_api_key", deepseek_secret)

    payload = [item.model_dump() for item in provider_status_items()]
    text = str(payload)

    assert len(payload) == 3
    assert draft_secret not in text
    assert image_secret not in text
    assert deepseek_secret not in text
    assert {item["status"] for item in payload} == {"configured"}


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
