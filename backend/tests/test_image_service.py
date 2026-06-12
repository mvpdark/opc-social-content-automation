import pytest
from fastapi import HTTPException

from app.models.content import Content
from app.models.generated_image import GeneratedImage
from app.models.user import User
from app.schemas.image import ImageGenerateRequest
from app.services import image_service
from app.services.image_service import (
    generate_image_asset,
    get_content_for_image,
    select_cover_visual_direction,
)


class FakeImageSession:
    def __init__(self, content: Content) -> None:
        self.content = content
        self.added: list[object] = []

    def get(self, model: object, item_id: int) -> Content | None:
        if model is Content and item_id == self.content.id:
            return self.content
        return None

    def add(self, item: object) -> None:
        self.added.append(item)

    def flush(self) -> None:
        return None

    def refresh(self, item: object) -> None:
        if isinstance(item, GeneratedImage):
            item.id = item.id or 1


def make_content(status: str = "draft") -> Content:
    return Content(
        id=1,
        user_id=1,
        platform="xiaohongshu",
        title="硕升博申请第一步，不是先套磁",
        body="先定研究方向，再判断导师匹配和邮件时机。",
        tags=["硕升博"],
        status=status,
    )


def test_draft_content_can_generate_image_preview() -> None:
    content = make_content()
    db = FakeImageSession(content)

    assert get_content_for_image(db, 1) is content  # type: ignore[arg-type]


def test_published_content_cannot_generate_image() -> None:
    content = make_content(status="published")
    db = FakeImageSession(content)

    with pytest.raises(HTTPException) as exc:
        get_content_for_image(db, 1)  # type: ignore[arg-type]

    assert exc.value.status_code == 409


def test_cover_visual_direction_changes_with_variant_index() -> None:
    content = make_content()

    selected = {
        select_cover_visual_direction(content, "xiaohongshu-cover", index)["id"]
        for index in range(8)
    }

    assert len(selected) >= 3


def test_image_prompt_payload_includes_visual_direction(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = make_content(status="approved")
    user = User(id=1, role="promoter", phone="test", password_hash="hash")
    captured: dict[str, object] = {}

    def fake_image_model(_prompt_name: str, payload: dict[str, object]) -> str:
        captured.update(payload)
        return "https://cdn.test/cover.png"

    monkeypatch.setattr(image_service.model_router, "image_model", fake_image_model)
    monkeypatch.setattr(image_service, "record_generation_log", lambda **_kwargs: None)

    image = generate_image_asset(
        db=FakeImageSession(content),  # type: ignore[arg-type]
        payload=ImageGenerateRequest(content_id=1, template="xiaohongshu-cover"),
        current_user=user,
    )

    assert image.status == "generated"
    assert isinstance(captured["visual_direction"], dict)
    assert captured["visual_direction"]["id"]
    assert "instructions" in captured["visual_direction"]


def test_draft_image_generation_is_marked_needs_review(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = make_content()
    user = User(id=1, role="promoter", phone="test", password_hash="hash")
    db = FakeImageSession(content)

    monkeypatch.setattr(
        image_service.model_router,
        "image_model",
        lambda _prompt_name, _payload: "https://cdn.test/cover.png",
    )
    monkeypatch.setattr(image_service, "record_generation_log", lambda **_kwargs: None)

    image = generate_image_asset(
        db=db,  # type: ignore[arg-type]
        payload=ImageGenerateRequest(content_id=1, template="xiaohongshu-cover"),
        current_user=user,
    )

    assert image.status == "needs_review"
    assert image.image_url == "https://cdn.test/cover.png"
