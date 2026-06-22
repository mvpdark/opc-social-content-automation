"""SSB-7 变体与草稿评分测试。"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models.content import Content
from app.models.content_variant import ContentVariant
from app.services.variant_scorer import (
    VariantScoreBreakdown,
    clamp_score,
    score_variant,
    score_variants,
)


def _client_and_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), testing_session


def _seed_content(testing_session, *, title="水博避坑指南", platform="xiaohongshu") -> int:
    with testing_session() as db:
        content = Content(
            platform=platform,
            title=title,
            body=f"{title} 正文",
            tags=["水博", "认证"],
            status="draft",
        )
        db.add(content)
        db.commit()
        db.refresh(content)
        return content.id


def test_variant_scorer_returns_breakdown_within_range() -> None:
    content = Content(
        id=1,
        platform="xiaohongshu",
        title="水博避坑指南",
        body="正文",
        tags=["水博", "认证"],
        status="draft",
    )
    breakdown = score_variant(
        "水博避坑指南｜一篇看懂，少踩坑",
        "title",
        content,
        siblings=["另一个标题"],
    )
    assert isinstance(breakdown, VariantScoreBreakdown)
    assert 0.0 <= breakdown.length <= 40.0
    assert 0.0 <= breakdown.keyword <= 20.0
    assert 0.0 <= breakdown.platform_tone <= 20.0
    assert 0.0 <= breakdown.uniqueness <= 20.0
    assert 0.0 <= breakdown.readability <= 20.0
    assert 0.0 <= breakdown.total <= 100.0


def test_score_variants_groups_siblings_by_type() -> None:
    content = Content(
        id=1,
        platform="xiaohongshu",
        title="水博避坑",
        body="正文",
        tags=["水博"],
        status="draft",
    )
    items = [
        ("标题一", "title"),
        ("标题二", "title"),
        ("开头一", "opening"),
    ]
    results = score_variants(items, content)
    assert len(results) == 3
    # 同类型的两个标题互为 siblings，独特性应低于 20（因为完全不同则接近 20）。
    title_scores = [r[2] for r in results if r[1] == "title"]
    assert len(title_scores) == 2
    assert all(0.0 <= score <= 100.0 for score in title_scores)


def test_clamp_score_limits_range() -> None:
    assert clamp_score(50.0) == 50.0
    assert clamp_score(-10.0) == 0.0
    assert clamp_score(150.0) == 100.0
    assert clamp_score(float("inf")) == 0.0


def test_generate_variants_endpoint_creates_scored_variants(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")
    client, testing_session = _client_and_session()
    content_id = _seed_content(testing_session)

    response = client.post(
        "/api/content/generate-variants",
        json={
            "content_id": content_id,
            "variant_count": 3,
            "variant_types": ["title", "opening", "cover_tags"],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["content_id"] == content_id
    assert len(data["variants"]) > 0
    # 每个变体都应有评分。
    for variant in data["variants"]:
        assert "score" in variant
        assert "variant_type" in variant
        assert "variant_text" in variant
        assert variant["selected"] is False


def test_list_variants_endpoint_returns_variants(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")
    client, testing_session = _client_and_session()
    content_id = _seed_content(testing_session)

    # 先生成变体。
    client.post(
        "/api/content/generate-variants",
        json={
            "content_id": content_id,
            "variant_count": 2,
            "variant_types": ["title"],
        },
    )

    response = client.get(f"/api/content/{content_id}/variants")
    assert response.status_code == 200
    variants = response.json()
    assert len(variants) > 0
    assert all(v["content_id"] == content_id for v in variants)


def test_select_variant_endpoint_marks_selected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")
    client, testing_session = _client_and_session()
    content_id = _seed_content(testing_session)

    # 生成变体。
    gen_response = client.post(
        "/api/content/generate-variants",
        json={
            "content_id": content_id,
            "variant_count": 2,
            "variant_types": ["title"],
        },
    )
    variants = gen_response.json()["variants"]
    first_variant_id = variants[0]["id"]

    # 选中第一个变体。
    response = client.post(
        f"/api/content/{content_id}/variants/{first_variant_id}/select"
    )
    assert response.status_code == 200
    assert response.json()["selected"] is True

    # 再选中同类型的第二个变体，第一个应自动取消选中。
    second_variant_id = None
    for v in variants:
        if v["id"] != first_variant_id:
            second_variant_id = v["id"]
            break
    if second_variant_id is not None:
        response2 = client.post(
            f"/api/content/{content_id}/variants/{second_variant_id}/select"
        )
        assert response2.status_code == 200
        assert response2.json()["selected"] is True

        # 验证第一个变体已取消选中。
        with testing_session() as db:
            first = db.get(ContentVariant, first_variant_id)
            assert first.selected is False


def test_generate_variants_validates_variant_count(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")
    client, testing_session = _client_and_session()
    content_id = _seed_content(testing_session)

    # variant_count < 2 应报错。
    response = client.post(
        "/api/content/generate-variants",
        json={
            "content_id": content_id,
            "variant_count": 1,
        },
    )
    assert response.status_code == 422


def test_generate_variants_validates_variant_types(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")
    client, testing_session = _client_and_session()
    content_id = _seed_content(testing_session)

    response = client.post(
        "/api/content/generate-variants",
        json={
            "content_id": content_id,
            "variant_types": ["invalid_type"],
        },
    )
    assert response.status_code == 422


def test_generate_variants_returns_404_for_missing_content(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")
    client, _ = _client_and_session()
    response = client.post(
        "/api/content/generate-variants",
        json={"content_id": 99999},
    )
    assert response.status_code == 404


def test_select_variant_returns_404_for_missing_variant(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "draft_provider", "codex_test")
    client, testing_session = _client_and_session()
    content_id = _seed_content(testing_session)
    response = client.post(
        f"/api/content/{content_id}/variants/99999/select"
    )
    assert response.status_code == 404
