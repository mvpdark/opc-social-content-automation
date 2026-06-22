"""SSB-8 反馈标签体系测试。"""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models.content import Content
from app.models.content_review import ContentReview
from app.models.user import User
from app.schemas.review import (
    FEEDBACK_CATEGORIES,
    FEEDBACK_PRESET_TAGS,
    VALID_FEEDBACK_CATEGORIES,
)
from app.schemas.review import ContentReviewRequest
from app.services.review_service import get_feedback_tag_stats, record_human_review


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


def _seed_reviewable_content(testing_session, *, title="反馈标签测试内容") -> int:
    with testing_session() as db:
        content = Content(
            platform="xiaohongshu",
            title=title,
            body=f"{title} 正文",
            tags=["测试"],
            status="draft",
        )
        db.add(content)
        db.commit()
        db.refresh(content)
        return content.id


def test_feedback_preset_tags_cover_all_categories() -> None:
    assert set(FEEDBACK_PRESET_TAGS.keys()) == set(FEEDBACK_CATEGORIES)
    for category in FEEDBACK_CATEGORIES:
        assert len(FEEDBACK_PRESET_TAGS[category]) > 0
    assert "tone" in VALID_FEEDBACK_CATEGORIES
    assert "accuracy" in VALID_FEEDBACK_CATEGORIES
    assert "structure" in VALID_FEEDBACK_CATEGORIES
    assert "engagement" in VALID_FEEDBACK_CATEGORIES
    assert "compliance" in VALID_FEEDBACK_CATEGORIES


def test_human_review_saves_feedback_tags_and_category() -> None:
    """验证 record_human_review 保存 feedback_tags 和 feedback_category。"""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    with testing_session_local() as db:
        content = Content(
            platform="xiaohongshu",
            title="反馈标签测试",
            body="正文",
            tags=["测试"],
            status="draft",
        )
        db.add(content)
        db.flush()

        user = User(id=1, phone="tester", role="planner", password_hash="hash")
        db.add(user)
        db.flush()

        payload = ContentReviewRequest(
            decision="changes_requested",
            score=70,
            notes="语气需要调整",
            risk_flags=[],
            feedback_tags=["语气太正式", "缺少亲和力"],
            feedback_category="tone",
        )
        review = record_human_review(db, content, payload, user)

        assert review.feedback_category == "tone"
        assert review.feedback_tags == ["语气太正式", "缺少亲和力"]


def test_human_review_rejects_invalid_feedback_category() -> None:
    """验证 feedback_category 取值校验。"""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    with testing_session_local() as db:
        content = Content(
            platform="xiaohongshu",
            title="反馈标签测试",
            body="正文",
            tags=["测试"],
            status="draft",
        )
        db.add(content)
        db.flush()

        user = User(id=1, phone="tester", role="planner", password_hash="hash")
        db.add(user)
        db.flush()

        payload = ContentReviewRequest(
            decision="approved",
            score=90,
            feedback_category="invalid_category",
        )

        with pytest.raises(HTTPException) as exc_info:
            record_human_review(db, content, payload, user)
        assert exc_info.value.status_code == 400
        assert "feedback_category" in str(exc_info.value.detail)


def test_get_feedback_tag_stats_returns_distribution() -> None:
    """验证 get_feedback_tag_stats 返回正确的标签分布。"""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    with testing_session_local() as db:
        content = Content(
            platform="xiaohongshu",
            title="统计测试",
            body="正文",
            tags=["测试"],
            status="draft",
        )
        db.add(content)
        db.flush()

        # 添加两条带反馈标签的审核记录。
        db.add(
            ContentReview(
                content_id=content.id,
                review_type="human",
                status="changes_requested",
                score=70,
                feedback_category="tone",
                feedback_tags=["语气太正式", "缺少亲和力"],
            )
        )
        db.add(
            ContentReview(
                content_id=content.id,
                review_type="human",
                status="changes_requested",
                score=65,
                feedback_category="tone",
                feedback_tags=["语气太正式"],
            )
        )
        db.add(
            ContentReview(
                content_id=content.id,
                review_type="human",
                status="approved",
                score=90,
                feedback_category=None,
                feedback_tags=None,
            )
        )
        db.commit()

        stats = get_feedback_tag_stats(db, limit=100)
        assert stats.total_reviews == 2  # 只统计有 feedback_category 的记录
        tone_stats = next(c for c in stats.categories if c.category == "tone")
        assert tone_stats.total == 2
        assert tone_stats.tags.get("语气太正式") == 2
        assert tone_stats.tags.get("缺少亲和力") == 1


def test_feedback_stats_endpoint_returns_stats() -> None:
    client, testing_session = _client_and_session()
    content_id = _seed_reviewable_content(testing_session)

    # 先通过 API 创建带反馈标签的审核。
    response = client.post(
        f"/api/content/{content_id}/review-request"
    )
    assert response.status_code == 200

    review_response = client.post(
        f"/api/content/{content_id}/reviews",
        json={
            "decision": "changes_requested",
            "score": 70,
            "notes": "语气需要调整",
            "risk_flags": [],
            "feedback_tags": ["语气太正式", "缺少亲和力"],
            "feedback_category": "tone",
        },
    )
    assert review_response.status_code == 200
    review_data = review_response.json()
    assert review_data["feedback_category"] == "tone"
    assert review_data["feedback_tags"] == ["语气太正式", "缺少亲和力"]

    # 查询统计。
    stats_response = client.get("/api/content/feedback-stats")
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["total_reviews"] >= 1
    tone_stats = next(c for c in stats["categories"] if c["category"] == "tone")
    assert tone_stats["total"] >= 1
    assert tone_stats["tags"].get("语气太正式", 0) >= 1


def test_feedback_stats_endpoint_returns_preset_tags() -> None:
    client, _ = _client_and_session()
    response = client.get("/api/content/feedback-stats")
    assert response.status_code == 200
    data = response.json()
    assert "preset_tags" in data
    # 预设标签应包含所有分类。
    for category in FEEDBACK_CATEGORIES:
        assert category in data["preset_tags"]
        assert len(data["preset_tags"][category]) > 0
