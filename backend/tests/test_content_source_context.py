import pytest
from fastapi import HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.content import Content
from app.models.generation_log import GenerationLog
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User
from app.schemas.content import ContentGenerateRequest
from app.services import content_service
from app.services.content_service import (
    build_content_source_context,
    build_draft_prompt_package,
    generate_content_draft,
)


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
    assert "请先人工核对来源" in context["review_note"]


def test_source_context_warns_when_required_web_search_is_missing(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        monkeypatch.setattr(
            "app.services.content_service.build_live_web_search_context",
            lambda **_kwargs: None,
        )

        context = build_content_source_context(
            db,
            ContentGenerateRequest(
                platform="xiaohongshu",
                topic="水博项目校徽和价格怎么对比",
                tags=["水博", "价格", "校徽"],
            ),
        )

    assert context["web_search"]["required"] is True
    assert context["web_search"]["results"] == []
    assert "没有可见 Tavily 结果" in context["review_note"]
    assert "不要让模型猜测学校、价格、logo 或排名结论" in context["review_note"]


def test_draft_prompt_marks_missing_required_web_search(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        user = User(id=1, phone="test", password_hash="hash", role="promoter")
        monkeypatch.setattr(
            "app.services.content_service.build_live_web_search_context",
            lambda **_kwargs: None,
        )

        package = build_draft_prompt_package(
            db,
            ContentGenerateRequest(
                platform="xiaohongshu",
                topic="水博项目校徽和价格怎么对比",
                tags=["水博", "价格", "校徽"],
            ),
            user,
        )

    web_search_context = package.payload["web_search_context"]
    assert isinstance(web_search_context, dict)
    assert web_search_context["required"] is True
    assert web_search_context["results"] == []
    assert "no Tavily sources were available" in web_search_context["usage_note"]
    assert "Do not name schools" in web_search_context["usage_note"]
    assert isinstance(package.payload["source_context"], dict)
    assert "没有可见 Tavily 结果" in package.payload["source_context"]["review_note"]
    assert "不要让模型猜测学校、价格、logo 或排名结论" in package.payload["source_context"]["review_note"]


def test_generate_content_rejects_conclusion_facts_when_required_web_sources_are_missing(
    monkeypatch,
) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    bad_draft = (
        "官网来源已确认：A University 排名第一名，学费是 20000 美元。\n"
        "官方 logo 可直接用，价格是当前结论。\n"
        "这条内容已经可以作为学校榜单结论发布。"
    )

    with Session(engine) as db:
        user = User(id=1, phone="test", password_hash="hash", role="promoter")
        db.add(user)
        db.commit()

        monkeypatch.setattr(
            content_service.model_router,
            "draft_model",
            lambda _prompt_name, _payload: bad_draft,
        )
        monkeypatch.setattr(
            "app.services.content_service.build_live_web_search_context",
            lambda **_kwargs: None,
        )

        with pytest.raises(HTTPException) as exc:
            generate_content_draft(
                db,
                ContentGenerateRequest(
                    platform="xiaohongshu",
                    topic="水博项目校徽和价格怎么对比",
                    tags=["水博", "价格", "校徽"],
                ),
                user,
            )

        assert exc.value.status_code == status.HTTP_502_BAD_GATEWAY
        assert "不要让模型猜测学校、价格、logo 或排名结论" in exc.value.detail
        assert db.query(Content).count() == 0

        log = db.query(GenerationLog).one()
        assert log.status == "source_fact_invalid"
        assert log.result == bad_draft
        assert log.error is not None
        assert "核验框架" in log.error


def test_generate_content_allows_framework_draft_when_required_web_sources_are_missing(
    monkeypatch,
) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    framework_draft = (
        "这个选题先做官网来源核验框架，不写学校名单或价格结论。\n"
        "第一步看学校官网项目页，第二步看费用页，第三步把 logo/校徽和认证政策标成待复核字段。\n"
        "等 Tavily 或知识库补齐可见来源后，再由人工核对学校、价格、logo 和排名。"
    )

    with Session(engine) as db:
        user = User(id=1, phone="test", password_hash="hash", role="promoter")
        db.add(user)
        db.commit()

        monkeypatch.setattr(
            content_service.model_router,
            "draft_model",
            lambda _prompt_name, _payload: framework_draft,
        )
        monkeypatch.setattr(
            "app.services.content_service.build_live_web_search_context",
            lambda **_kwargs: None,
        )

        content = generate_content_draft(
            db,
            ContentGenerateRequest(
                platform="xiaohongshu",
                topic="水博项目校徽和价格怎么对比",
                tags=["水博", "价格", "校徽"],
            ),
            user,
        )

        assert db.query(Content).count() == 1
        assert content.body == framework_draft
        assert content.source_context is not None
        assert content.source_context["web_search"]["required"] is True
        assert content.source_context["web_search"]["results"] == []

        log = db.query(GenerationLog).one()
        assert log.status == "success"
        assert log.result == framework_draft


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


def test_generate_content_rejects_metadata_section_ai_draft(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    bad_draft = "Title: overseas doctoral logo check\nBody: use official sources first\nTags: #water phd"

    with Session(engine) as db:
        user = User(id=1, phone="test", password_hash="hash", role="promoter")
        db.add(user)
        db.commit()

        monkeypatch.setattr(
            content_service.model_router,
            "draft_model",
            lambda _prompt_name, _payload: bad_draft,
        )
        monkeypatch.setattr(
            "app.services.content_service.build_live_web_search_context",
            lambda **_kwargs: None,
        )

        with pytest.raises(HTTPException) as exc:
            generate_content_draft(
                db,
                ContentGenerateRequest(
                    platform="xiaohongshu",
                    topic="official source review for overseas doctoral programs",
                    tags=[],
                ),
                user,
            )

        assert exc.value.status_code == status.HTTP_502_BAD_GATEWAY
        assert "元数据段落" in exc.value.detail
        assert db.query(Content).count() == 0

        log = db.query(GenerationLog).one()
        assert log.status == "schema_invalid"
        assert log.result == bad_draft
        assert log.error is not None
        assert "元数据段落" in log.error


def test_generate_content_rejects_chinese_metadata_section_ai_draft(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    bad_draft = "标题：海外博士官方来源核验\n正文：先看官网来源\n风险说明：不要自动发布"

    with Session(engine) as db:
        user = User(id=1, phone="test", password_hash="hash", role="promoter")
        db.add(user)
        db.commit()

        monkeypatch.setattr(
            content_service.model_router,
            "draft_model",
            lambda _prompt_name, _payload: bad_draft,
        )
        monkeypatch.setattr(
            "app.services.content_service.build_live_web_search_context",
            lambda **_kwargs: None,
        )

        with pytest.raises(HTTPException) as exc:
            generate_content_draft(
                db,
                ContentGenerateRequest(
                    platform="xiaohongshu",
                    topic="海外博士官方来源核验",
                    tags=["海外博士", "官方来源"],
                ),
                user,
            )

        assert exc.value.status_code == status.HTTP_502_BAD_GATEWAY
        assert "元数据段落" in exc.value.detail
        assert db.query(Content).count() == 0

        log = db.query(GenerationLog).one()
        assert log.status == "schema_invalid"
        assert log.result == bad_draft
        assert log.error is not None
        assert "元数据段落" in log.error


def test_generate_content_rejects_hashtag_line_ai_draft(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    bad_draft = "先看官网来源，再决定项目名单。\n\n#海外博士 #官方来源"

    with Session(engine) as db:
        user = User(id=1, phone="test", password_hash="hash", role="promoter")
        db.add(user)
        db.commit()

        monkeypatch.setattr(
            content_service.model_router,
            "draft_model",
            lambda _prompt_name, _payload: bad_draft,
        )
        monkeypatch.setattr(
            "app.services.content_service.build_live_web_search_context",
            lambda **_kwargs: None,
        )

        with pytest.raises(HTTPException) as exc:
            generate_content_draft(
                db,
                ContentGenerateRequest(
                    platform="xiaohongshu",
                    topic="海外博士官方来源核验",
                    tags=["海外博士", "官方来源"],
                ),
                user,
            )

        assert exc.value.status_code == status.HTTP_502_BAD_GATEWAY
        assert "独立话题标签行" in exc.value.detail
        assert db.query(Content).count() == 0

        log = db.query(GenerationLog).one()
        assert log.status == "schema_invalid"
        assert log.result == bad_draft
        assert log.error is not None
        assert "独立话题标签行" in log.error


def test_generate_content_rejects_blank_ai_draft(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        user = User(id=1, phone="test", password_hash="hash", role="promoter")
        db.add(user)
        db.commit()

        monkeypatch.setattr(
            content_service.model_router,
            "draft_model",
            lambda _prompt_name, _payload: " \n\t ",
        )
        monkeypatch.setattr(
            "app.services.content_service.build_live_web_search_context",
            lambda **_kwargs: None,
        )

        with pytest.raises(HTTPException) as exc:
            generate_content_draft(
                db,
                ContentGenerateRequest(
                    platform="xiaohongshu",
                    topic="general draft quality check",
                    tags=[],
                ),
                user,
            )

        assert exc.value.status_code == status.HTTP_502_BAD_GATEWAY
        assert "草稿生成结果为空" in exc.value.detail
        assert db.query(Content).count() == 0

        log = db.query(GenerationLog).one()
        assert log.status == "schema_invalid"
        assert log.result == " \n\t "
        assert log.error is not None
        assert "草稿生成结果为空" in log.error


def test_generate_content_rejects_too_thin_ai_draft(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    thin_draft = "先看官网，再人工确认。"

    with Session(engine) as db:
        user = User(id=1, phone="test", password_hash="hash", role="promoter")
        db.add(user)
        db.commit()

        monkeypatch.setattr(
            content_service.model_router,
            "draft_model",
            lambda _prompt_name, _payload: thin_draft,
        )
        monkeypatch.setattr(
            "app.services.content_service.build_live_web_search_context",
            lambda **_kwargs: None,
        )

        with pytest.raises(HTTPException) as exc:
            generate_content_draft(
                db,
                ContentGenerateRequest(
                    platform="xiaohongshu",
                    topic="general draft quality check",
                    tags=[],
                ),
                user,
            )

        assert exc.value.status_code == status.HTTP_502_BAD_GATEWAY
        assert "草稿正文过短" in exc.value.detail
        assert db.query(Content).count() == 0

        log = db.query(GenerationLog).one()
        assert log.status == "schema_invalid"
        assert log.result == thin_draft
        assert log.error is not None
        assert "草稿正文过短" in log.error
