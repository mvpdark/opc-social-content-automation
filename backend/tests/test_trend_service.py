import pytest
from fastapi import HTTPException

from app.schemas.trend import TrendCollectionJobCreate
from app.services.trend_service import build_safety_profile


def test_build_safety_profile_defaults_to_account_safety() -> None:
    payload = TrendCollectionJobCreate(platform="xiaohongshu", keyword="硕升博")

    profile = build_safety_profile(payload)

    assert profile["collector"] == "playwright_assisted"
    assert profile["speed_policy"] == "account_safety_first"
    assert profile["human_like_scrolling"] is True
    assert profile["session_persistence"] is True
    assert profile["cookie_persistence"] is True


def test_build_safety_profile_rejects_invalid_delay_window() -> None:
    payload = TrendCollectionJobCreate(
        platform="douyin",
        keyword="博士申请",
        min_delay_seconds=10,
        max_delay_seconds=10,
    )

    with pytest.raises(HTTPException):
        build_safety_profile(payload)
