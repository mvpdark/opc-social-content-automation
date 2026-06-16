import pytest
from fastapi import HTTPException

from app.models.content import Content
from app.models.user import User
from app.schemas.review import ContentReviewRequest
from app.services.review_service import record_human_review


def make_review_content(status: str) -> Content:
    return Content(
        id=1,
        user_id=1,
        platform="xiaohongshu",
        title="人工审核生命周期边界",
        body="这条内容用于确认非可审核状态不会被直接覆盖人工审核结论。",
        tags=["人工审核"],
        status=status,
    )


@pytest.mark.parametrize(
    "content_status",
    ["approved", "published", "submitted", "rejected", "changes_requested"],
)
def test_human_review_rejects_non_reviewable_lifecycle_statuses(content_status: str) -> None:
    content = make_review_content(status=content_status)
    payload = ContentReviewRequest(
        decision="approved",
        notes="Should not be recorded for terminal or returned content.",
        risk_flags=[],
        score=95,
    )
    current_user = User(id=1, role="planner", phone="tester", password_hash="hash")

    with pytest.raises(HTTPException) as exc_info:
        record_human_review(
            db=None,  # type: ignore[arg-type]
            content=content,
            payload=payload,
            current_user=current_user,
        )

    assert exc_info.value.status_code == 409
    assert "当前状态不能记录人工审核" in str(exc_info.value.detail)
    assert content.status == content_status
