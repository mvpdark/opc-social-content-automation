import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models.content import Content
from app.models.content_review import ContentReview
from app.models.publish_record import PublishRecord
from app.schemas.workspace import PublishRecordCreate
from app.schemas.workspace import ExportItem
from app.services.workspace_service import _render_markdown, _render_plain


def test_render_markdown_export_payload() -> None:
    item = ExportItem(
        id=1,
        platform="xiaohongshu",
        title="硕升博申请节奏",
        body="先确认方向，再准备材料。",
        tags=["申请", "规划"],
    )

    payload = _render_markdown([item])

    assert "# 硕升博申请节奏" in payload
    assert "Platform: xiaohongshu" in payload
    assert "#申请 #规划" in payload


def test_render_plain_export_payload() -> None:
    item = ExportItem(
        id=1,
        platform="douyin",
        title="导师沟通",
        body="表达研究兴趣，不要泛泛而谈。",
        tags=[],
    )

    payload = _render_plain([item])

    assert payload == "导师沟通\n表达研究兴趣，不要泛泛而谈。"


def test_publish_record_schema_rejects_non_published_status() -> None:
    with pytest.raises(ValidationError):
        PublishRecordCreate(content_id=1, platform="xiaohongshu", status="failed")


def _workspace_api_client():
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


def _seed_workspace_content(
    testing_session,
    *,
    status: str,
    human_review_status: str | None = None,
) -> int:
    with testing_session() as db:
        content = Content(
            platform="xiaohongshu",
            title="人工确认发布边界",
            body="这是一条测试草稿，必须人工确认后才能记录为已发布。",
            tags=["人工确认"],
            status=status,
        )
        db.add(content)
        db.flush()
        if human_review_status is not None:
            db.add(
                ContentReview(
                    content_id=content.id,
                    review_type="human",
                    status=human_review_status,
                    score=95 if human_review_status == "approved" else 60,
                    notes="API lifecycle test review.",
                    risk_flags=[],
                )
            )
        db.commit()
        return content.id


@pytest.mark.parametrize("content_status", ["draft", "review_pending", "rewritten", "published"])
def test_publish_record_endpoint_rejects_non_approved_lifecycle_statuses(
    content_status: str,
) -> None:
    client, testing_session = _workspace_api_client()
    content_id = _seed_workspace_content(testing_session, status=content_status)

    response = client.post(
        "/api/workspace/publish-record",
        json={"content_id": content_id, "platform": "xiaohongshu"},
    )

    assert response.status_code == 409
    with testing_session() as db:
        assert db.get(Content, content_id).status == content_status
        assert db.query(PublishRecord).count() == 0


def test_publish_record_endpoint_rejects_approved_status_without_human_review() -> None:
    client, testing_session = _workspace_api_client()
    content_id = _seed_workspace_content(testing_session, status="approved")

    response = client.post(
        "/api/workspace/publish-record",
        json={"content_id": content_id, "platform": "xiaohongshu"},
    )

    assert response.status_code == 409
    with testing_session() as db:
        assert db.get(Content, content_id).status == "approved"
        assert db.query(PublishRecord).count() == 0


def test_publish_record_endpoint_accepts_human_approved_content_only() -> None:
    client, testing_session = _workspace_api_client()
    content_id = _seed_workspace_content(
        testing_session,
        status="approved",
        human_review_status="approved",
    )

    response = client.post(
        "/api/workspace/publish-record",
        json={
            "content_id": content_id,
            "platform": "xiaohongshu",
            "external_url": "https://example.com/manual-published",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["content_id"] == content_id
    assert payload["status"] == "published"
    with testing_session() as db:
        content = db.get(Content, content_id)
        record = db.query(PublishRecord).one()
        assert content.status == "published"
        assert record.content_id == content_id
        assert record.external_url == "https://example.com/manual-published"
