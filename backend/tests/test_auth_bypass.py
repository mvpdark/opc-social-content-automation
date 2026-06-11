import pytest
from fastapi import HTTPException

from app.api.deps import get_current_user
from app.core.config import settings


def test_planner_stage_auth_bypass_returns_test_user(monkeypatch) -> None:
    monkeypatch.setattr(settings, "auth_required", False)

    user = get_current_user(credentials=None, db=None)  # type: ignore[arg-type]

    assert user.id is None
    assert user.role == "planner"
    assert user.phone == "planner-test"


def test_auth_required_mode_still_requires_bearer_token(monkeypatch) -> None:
    monkeypatch.setattr(settings, "auth_required", True)

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=None, db=None)  # type: ignore[arg-type]

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Missing bearer token."
