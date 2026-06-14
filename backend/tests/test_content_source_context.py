from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User
from app.schemas.content import ContentGenerateRequest
from app.services import content_service
from app.services.content_service import build_content_source_context, generate_content_draft


def test_source_context_exposes_knowledge_and_web_sources(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        db.add(
            KnowledgeBase(
                title="小红书水博榜参考样本",
                content="水博榜单要围绕学校池、认证、预算、毕业难度和在职适配做矩阵。",
                category="xiaohongshu-case",
                embedding=None,
            )
        )
        db.commit()

        monkeypatch.setattr(
            "app.services.content_service.build_live_web_search_context",
            lambda **_kwargs: {
                "provider": "tavily",
                "query": "global water resources PhD programs official sources",
                "answer": "Official sources should be checked for accreditation, budget, and attendance mode.",
                "results": [
                    {
                        "title": "Official water resources PhD program",
                        "url": "https://example.edu/water-phd",
                        "content": "Official program page with research areas and admissions facts.",
                        "score": 0.91,
                    }
                ],
            },
        )

        context = build_content_source_context(
            db,
            ContentGenerateRequest(
                platform="xiaohongshu",
                topic="全球水博排名必看",
                knowledge_query="全球 水博 博士 项目 排名 认证 预算 在职",
                tags=["水博", "排名"],
            ),
        )

    assert context["knowledge_query"] == "全球 水博 博士 项目 排名 认证 预算 在职"
    assert context["knowledge_items"]
    assert context["knowledge_items"][0]["title"] == "小红书水博榜参考样本"
    assert context["web_search"]["required"] is True
    assert context["web_search"]["provider"] == "tavily"
    assert "accreditation" in context["web_search"]["answer"]
    assert context["web_search"]["results"][0]["url"] == "https://example.edu/water-phd"


def test_generated_content_persists_visible_source_context(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        user = User(id=1, phone="test", password_hash="hash", role="promoter")
        db.add_all(
            [
                user,
                KnowledgeBase(
                    title="水博榜结构参考",
                    content="水博榜单按认证、预算、毕业难度和在职适配做维度。",
                    category="xiaohongshu-case",
                    embedding=None,
                ),
            ]
        )
        db.commit()

        monkeypatch.setattr(
            content_service.model_router,
            "draft_model",
            lambda _prompt_name, _payload: "水博榜单先按认证、预算、毕业难度和在职适配做排名维度，再补学校池。",
        )
        monkeypatch.setattr(
            "app.services.content_service.build_live_web_search_context",
            lambda **_kwargs: {
                "provider": "tavily",
                "query": "global water resources PhD programs official sources",
                "answer": "Use official pages to verify rankings before naming schools.",
                "results": [
                    {
                        "title": "Official source",
                        "url": "https://example.edu/source",
                        "content": "Official source snippet.",
                    }
                ],
            },
        )

        content = generate_content_draft(
            db,
            ContentGenerateRequest(
                platform="xiaohongshu",
                topic="全球水博排名必看",
                knowledge_query="全球 水博 博士 项目 排名 认证 预算 在职",
                tags=["水博", "排名"],
            ),
            user,
        )

    assert content.source_context is not None
    assert content.source_context["knowledge_items"][0]["title"] == "水博榜结构参考"
    assert "official pages" in content.source_context["web_search"]["answer"]
    assert content.source_context["web_search"]["results"][0]["title"] == "Official source"
