from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import create_app
from app.services.auth_service import authenticate_mobile_account


def test_mobile_auth_accepts_configured_accounts() -> None:
    assert authenticate_mobile_account("admin", "admin") == "admin"
    assert authenticate_mobile_account("admin1", "admin1") == "admin1"
    assert authenticate_mobile_account("admin2", "admin2") == "admin2"


def test_mobile_auth_rejects_wrong_password() -> None:
    try:
        authenticate_mobile_account("admin", "wrong")
    except HTTPException as exc:
        assert exc.status_code == 401
    else:
        raise AssertionError("Expected mobile auth to reject invalid credentials.")


def test_mobile_login_endpoint_accepts_configured_account(monkeypatch) -> None:
    monkeypatch.setattr(settings, "draft_provider", "openai_compatible")
    monkeypatch.setattr(settings, "image_provider", "openai_compatible")
    monkeypatch.setattr(settings, "openai_compatible_api_key", "existing-draft-key")
    monkeypatch.setattr(settings, "image_openai_compatible_api_key", "existing-image-key")
    monkeypatch.setattr(settings, "deepseek_api_key", "existing-rewrite-key")
    client = TestClient(create_app())

    for account in ("admin", "admin1", "admin2"):
        response = client.post(
            "/api/auth/mobile-login",
            json={"account": account, "password": account},
        )
        payload = response.json()
        provider_statuses = payload["provider_statuses"]
        text = str(payload)

        assert response.status_code == 200
        assert payload["account"] == account
        assert payload["key_profile"] == "default"
        assert len(provider_statuses) == 3
        assert {item["status"] for item in provider_statuses} == {"configured"}
        assert "existing-draft-key" not in text
        assert "existing-image-key" not in text
        assert "existing-rewrite-key" not in text


def test_mobile_login_endpoint_rejects_invalid_password() -> None:
    client = TestClient(create_app())
    response = client.post(
        "/api/auth/mobile-login",
        json={"account": "admin1", "password": "wrong"},
    )

    assert response.status_code == 401
