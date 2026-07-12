from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.knowledge_base import KnowledgeBase
from app.services.knowledge_service import (
    list_knowledge_items,
    normalize_knowledge_text,
    repair_utf8_mojibake,
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


def test_repair_utf8_mojibake_restores_chinese_text() -> None:
    mojibake = "趋势摘要：硕升博".encode().decode("latin1")

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
