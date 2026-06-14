from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.knowledge_base import KnowledgeBase
from app.services.knowledge_service import (
    KNOWLEDGE_COMPILED_CATEGORY,
    compile_knowledge_base,
    is_knowledge_compilation_due,
    latest_knowledge_compilation,
)


def test_compile_knowledge_base_creates_ai_ready_item() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        db.add_all(
            [
                KnowledgeBase(
                    title="high praise case",
                    content="cover uses a three point list and the copy explains doctoral application timing.",
                    category="xiaohongshu-case",
                    embedding=None,
                ),
                KnowledgeBase(
                    title="mentor matching note",
                    content="summarize research direction first, then choose a supervisor and proposal angle.",
                    category="mentor",
                    embedding=None,
                ),
            ]
        )
        db.commit()

        result = compile_knowledge_base(db, force=True, source_limit=20)
        latest = latest_knowledge_compilation(db)

    assert result.compiled is True
    assert result.source_count == 2
    assert result.item is not None
    assert result.item.category == KNOWLEDGE_COMPILED_CATEGORY
    assert latest is not None
    assert latest.id == result.item.id
    assert "AI_KNOWLEDGE_COMPILED_AT=" in result.item.content
    assert "high praise case" in result.item.content
    assert "mentor matching note" in result.item.content


def test_compile_knowledge_base_does_not_create_empty_compilation() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        result = compile_knowledge_base(db, force=True, source_limit=20)
        latest = latest_knowledge_compilation(db)

    assert result.compiled is False
    assert result.due is True
    assert result.item is None
    assert result.source_count == 0
    assert result.message == "no_source_knowledge_items"
    assert latest is None


def test_compile_knowledge_base_skips_fresh_compilation_and_excludes_prior_outputs() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        db.add(
            KnowledgeBase(
                title="source note",
                content="fresh source content",
                category="source",
                embedding=None,
            )
        )
        db.commit()

        first = compile_knowledge_base(db, force=True, source_limit=20)
        second = compile_knowledge_base(db, force=False, interval_hours=168, source_limit=20)

        db.add(
            KnowledgeBase(
                title="manual source",
                content="new source content",
                category="source",
                embedding=None,
            )
        )
        db.commit()
        forced = compile_knowledge_base(db, force=True, source_limit=20)
        due_after_force = is_knowledge_compilation_due(db, 168)

    assert first.compiled is True
    assert second.compiled is False
    assert second.item is not None
    assert second.item.id == first.item.id
    assert due_after_force is False
    assert forced.compiled is True
    assert forced.source_count == 2
    assert forced.item is not None
    assert first.item.title not in forced.item.content
    assert forced.item.content.count("AI_KNOWLEDGE_COMPILED_AT=") == 1
