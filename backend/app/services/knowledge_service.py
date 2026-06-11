from sqlalchemy import Select, desc, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.knowledge_base import KnowledgeBase
from app.schemas.knowledge import KnowledgeSearchResult, KnowledgeUploadRequest
from app.services.model_router import model_router


def build_knowledge_embedding(title: str, content: str, category: str | None) -> list[float]:
    source_text = "\n".join(part for part in [title, category or "", content] if part)
    return model_router.embedding_model(source_text)


def create_knowledge_item(db: Session, payload: KnowledgeUploadRequest) -> KnowledgeBase:
    embedding = build_knowledge_embedding(
        title=payload.title,
        content=payload.content,
        category=payload.category,
    )
    item = KnowledgeBase(
        title=payload.title,
        content=payload.content,
        category=payload.category,
        embedding=embedding,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _apply_category_filter(
    statement: Select[tuple[KnowledgeBase]], category: str | None
) -> Select[tuple[KnowledgeBase]]:
    if category:
        return statement.where(KnowledgeBase.category == category)
    return statement


def vector_search(
    db: Session,
    query: str,
    category: str | None,
    limit: int,
) -> list[KnowledgeSearchResult]:
    if not settings.is_postgresql:
        return keyword_search(db, query, category, limit)

    query_embedding = model_router.embedding_model(query)
    distance = KnowledgeBase.embedding.cosine_distance(query_embedding).label("distance")
    statement = select(KnowledgeBase, distance).where(KnowledgeBase.embedding.is_not(None))
    if category:
        statement = statement.where(KnowledgeBase.category == category)
    rows = db.execute(statement.order_by(distance).limit(limit)).all()
    return [
        KnowledgeSearchResult(
            id=item.id,
            title=item.title,
            content=item.content,
            category=item.category,
            score=max(0.0, 1.0 - float(score)),
            match_type="vector",
        )
        for item, score in rows
    ]


def keyword_search(
    db: Session,
    query: str,
    category: str | None,
    limit: int,
) -> list[KnowledgeSearchResult]:
    pattern = f"%{query}%"
    statement = select(KnowledgeBase).where(
        or_(KnowledgeBase.title.ilike(pattern), KnowledgeBase.content.ilike(pattern))
    )
    statement = _apply_category_filter(statement, category)
    items = db.scalars(statement.order_by(desc(KnowledgeBase.id)).limit(limit)).all()
    return [
        KnowledgeSearchResult(
            id=item.id,
            title=item.title,
            content=item.content,
            category=item.category,
            score=None,
            match_type="keyword",
        )
        for item in items
    ]


def search_knowledge_items(
    db: Session,
    query: str,
    category: str | None,
    limit: int,
    mode: str,
) -> list[KnowledgeSearchResult]:
    if mode == "keyword":
        return keyword_search(db, query, category, limit)

    vector_results = vector_search(db, query, category, limit)
    if vector_results or mode == "vector":
        return vector_results
    return keyword_search(db, query, category, limit)
