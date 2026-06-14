from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.knowledge_base import KnowledgeBase
from app.services.knowledge_service import (
    list_knowledge_items,
    normalize_knowledge_text,
    repair_utf8_mojibake,
    search_knowledge_items,
)


def test_list_knowledge_items_returns_recent_items_first() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        db.add_all(
            [
                KnowledgeBase(title="old ranking", content="old item", category="ranking", embedding=None),
                KnowledgeBase(title="mentor match", content="mentor item", category="mentor", embedding=None),
                KnowledgeBase(title="new ranking", content="new item", category="ranking", embedding=None),
            ]
        )
        db.commit()

        recent = list_knowledge_items(db=db, category=None, limit=2)
        ranking = list_knowledge_items(db=db, category="ranking", limit=10)

    assert [item.title for item in recent] == ["new ranking", "mentor match"]
    assert [item.title for item in ranking] == ["new ranking", "old ranking"]
    assert {item.match_type for item in recent} == {"recent"}


def test_keyword_search_falls_back_to_domain_terms_for_ranking_topic() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        db.add_all(
            [
                KnowledgeBase(
                    title="小红书水博榜参考样本",
                    content="封面使用水博榜、水博排名榜；学校项目池围绕认证、预算和学费展开。",
                    category="xiaohongshu-case",
                    embedding=None,
                ),
                KnowledgeBase(
                    title="导师匹配参考",
                    content="研究方向、导师论文和套磁准备。",
                    category="mentor",
                    embedding=None,
                ),
            ]
        )
        db.commit()

        results = search_knowledge_items(
            db=db,
            query="全球水博排名必看",
            category=None,
            limit=3,
            mode="hybrid",
        )

    assert results
    assert results[0].title == "小红书水博榜参考样本"
    assert results[0].match_type == "keyword"


def test_keyword_search_uses_topic_terms_for_non_exact_topic() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        db.add_all(
            [
                KnowledgeBase(
                    title="趋势摘要：硕升博",
                    content="硕升博申请样本：先确认研究方向，再考虑导师匹配和套磁节奏。",
                    category="trend-insight",
                    embedding=None,
                ),
                KnowledgeBase(
                    title="水博榜参考样本",
                    content="路线矩阵、认证、预算和学校项目池。",
                    category="xiaohongshu-case",
                    embedding=None,
                ),
            ]
        )
        db.commit()

        results = search_knowledge_items(
            db=db,
            query="硕升博申请第一步，不是先套磁",
            category=None,
            limit=3,
            mode="hybrid",
        )

    assert results
    assert results[0].title == "趋势摘要：硕升博"


def test_keyword_search_prefers_title_term_matches() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        db.add_all(
            [
                KnowledgeBase(
                    title="水博榜拆解",
                    content="这个参考里提到了套磁，但主要是水博榜结构。",
                    category="xiaohongshu-case",
                    embedding=None,
                ),
                KnowledgeBase(
                    title="趋势摘要：硕升博",
                    content="申请第一步先做方向判断，再考虑套磁。",
                    category="trend-insight",
                    embedding=None,
                ),
            ]
        )
        db.commit()

        results = search_knowledge_items(
            db=db,
            query="硕升博申请第一步，不是先套磁",
            category=None,
            limit=2,
            mode="keyword",
        )

    assert [item.title for item in results] == ["趋势摘要：硕升博", "水博榜拆解"]


def test_repair_utf8_mojibake_restores_chinese_text() -> None:
    mojibake = "趋势摘要：硕升博".encode("utf-8").decode("latin1")

    assert repair_utf8_mojibake(mojibake) == "趋势摘要：硕升博"
    assert repair_utf8_mojibake("plain ascii") == "plain ascii"


def test_normalize_knowledge_text_hides_unrecoverable_question_mark_garbled_text() -> None:
    title = "?" * 15
    content = f"Observed cover pattern: {'?' * 3} route-list note with {'?' * 14}"

    assert normalize_knowledge_text(title) == "原始中文已损坏，请重新采集或人工修复。"
    assert "???" not in normalize_knowledge_text(content)
    assert "【原始中文已损坏】" in normalize_knowledge_text(content)


def test_normalize_knowledge_text_hides_replacement_character_garbled_text() -> None:
    title = "\ufffd" * 12
    content = "水博榜单 " + ("\ufffd" * 3) + " 认证预算"

    assert normalize_knowledge_text(title) == "原始中文已损坏，请重新采集或人工修复。"
    assert "\ufffd" not in normalize_knowledge_text(content)
    assert "【原始中文已损坏】" in normalize_knowledge_text(content)
