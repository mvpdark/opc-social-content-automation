from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models.content import Content


def _content_api_client():
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


def _seed_content(testing_session, *, platform: str, status: str, title: str) -> None:
    with testing_session() as db:
        db.add(
            Content(
                platform=platform,
                title=title,
                body=f"{title} body",
                tags=["review"],
                status=status,
            )
        )
        db.commit()


def test_review_queue_endpoint_returns_only_human_reviewable_content() -> None:
    client, testing_session = _content_api_client()
    _seed_content(testing_session, platform="xiaohongshu", status="draft", title="draft item")
    _seed_content(testing_session, platform="xiaohongshu", status="rewritten", title="rewritten item")
    _seed_content(
        testing_session,
        platform="xiaohongshu",
        status="review_pending",
        title="pending item",
    )
    _seed_content(testing_session, platform="xiaohongshu", status="approved", title="approved item")
    _seed_content(testing_session, platform="douyin", status="review_pending", title="douyin item")

    response = client.get("/api/content/review-queue?platform=xiaohongshu")

    assert response.status_code == 200
    titles = {item["title"] for item in response.json()}
    assert titles == {"draft item", "rewritten item", "pending item"}
