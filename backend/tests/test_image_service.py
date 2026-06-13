import pytest
import httpx
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


class FakeCommitSession:
    def __init__(self) -> None:
        self.committed = False
        self.flushed = False

    def flush(self) -> None:
        self.flushed = True

    def commit(self) -> None:
        self.committed = True


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
        for index in range(9)
    }

    assert len(selected) >= 3


def test_cover_visual_directions_include_route_matrix() -> None:
    ids = {item["id"] for item in image_service.COVER_VISUAL_DIRECTIONS}

    assert "route-matrix-board" in ids


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
    monkeypatch.setattr(
        image_service,
        "localize_image_url",
        lambda image_url, content_id, template: image_url,
    )
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


def test_draft_image_generation_downloads_remote_cover_before_saving(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    content = make_content()
    user = User(id=1, role="promoter", phone="test", password_hash="hash")
    db = FakeImageSession(content)
    remote_url = "https://cdn.test/cover.png"

    def fake_get(url: str, **kwargs: object) -> httpx.Response:
        assert url == remote_url
        assert kwargs["follow_redirects"] is True
        return httpx.Response(
            200,
            content=b"cover-bytes",
            headers={"content-type": "image/png"},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(
        image_service.model_router,
        "image_model",
        lambda _prompt_name, _payload: remote_url,
    )
    monkeypatch.setattr(image_service.httpx, "get", fake_get)
    monkeypatch.setattr(image_service, "GENERATED_ASSET_ROOT", tmp_path)
    monkeypatch.setattr(image_service.settings, "test_static_url_prefix", "/static/generated")
    monkeypatch.setattr(image_service, "record_generation_log", lambda **_kwargs: None)

    image = generate_image_asset(
        db=db,  # type: ignore[arg-type]
        payload=ImageGenerateRequest(content_id=1, template="xiaohongshu-cover"),
        current_user=user,
    )

    assert image.status == "needs_review"
    assert image.image_url.startswith("/static/generated/remote-cover-1-xiaohongshu-cover-")
    filename = image.image_url.rsplit("/", 1)[-1]
    assert (tmp_path / filename).read_bytes() == b"cover-bytes"


def test_localize_image_url_converts_public_static_url_to_local_path(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(image_service.settings, "test_static_url_prefix", "/static/generated")

    assert (
        image_service.localize_image_url(
            "https://opc.mvpdark.top/static/generated/already-local.png",
            content_id=1,
            template="xiaohongshu-cover",
        )
        == "/static/generated/already-local.png"
    )


def test_ensure_images_are_local_commits_updated_remote_records(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    image = GeneratedImage(
        content_id=1,
        created_by=1,
        image_url="https://cdn.test/old-cover.png",
        template="xiaohongshu-cover",
        prompt="test",
        status="needs_review",
    )
    db = FakeCommitSession()

    monkeypatch.setattr(
        image_service,
        "localize_image_url",
        lambda image_url, content_id, template: "/static/generated/old-cover.png",
    )

    image_service.ensure_images_are_local(db, [image])  # type: ignore[arg-type]

    assert image.image_url == "/static/generated/old-cover.png"
    assert db.flushed is True
    assert db.committed is True
