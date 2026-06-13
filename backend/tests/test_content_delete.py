from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.content import Content
from app.models.content_review import ContentReview
from app.models.generated_image import GeneratedImage
from app.models.publish_record import PublishRecord
from app.services.content_service import delete_content_with_assets


def test_delete_content_with_assets_removes_related_records() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        content = Content(
            platform="xiaohongshu",
            title="历史草稿",
            body="测试正文",
            tags=["水博"],
            status="draft",
        )
        db.add(content)
        db.flush()
        db.add_all(
            [
                GeneratedImage(
                    content_id=content.id,
                    image_url="/static/generated/test.png",
                    status="generated",
                ),
                ContentReview(
                    content_id=content.id,
                    review_type="human",
                    status="pending",
                ),
                PublishRecord(
                    content_id=content.id,
                    platform="xiaohongshu",
                    status="recorded",
                ),
            ]
        )
        db.commit()

        delete_content_with_assets(db, content.id)

        assert db.get(Content, content.id) is None
        assert db.query(GeneratedImage).count() == 0
        assert db.query(ContentReview).count() == 0
        assert db.query(PublishRecord).count() == 0
