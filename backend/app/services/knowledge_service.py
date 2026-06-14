import re

from sqlalchemy import Select, desc, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.knowledge_base import KnowledgeBase
from app.schemas.knowledge import KnowledgeSearchResult, KnowledgeUploadRequest
from app.services.model_router import model_router


KNOWLEDGE_SEARCH_HINT_TERMS = (
    "水博",
    "硕升博",
    "在职博士",
    "海外博士",
    "境外博士",
    "排名",
    "排行",
    "榜单",
    "榜",
    "学校",
    "院校",
    "项目",
    "认证",
    "预算",
    "学费",
    "费用",
    "导师",
    "匹配",
    "套磁",
    "时间线",
    "时间",
    "路线",
    "申请",
    "咨询",
    "转化",
    "私域",
)


def repair_utf8_mojibake(value: str) -> str:
    try:
        repaired = value.encode("latin1").decode("utf-8")
    except UnicodeError:
        return value

    if "\ufffd" in repaired:
        return value

    original_cjk_count = sum("\u4e00" <= char <= "\u9fff" for char in value)
    repaired_cjk_count = sum("\u4e00" <= char <= "\u9fff" for char in repaired)
    return repaired if repaired_cjk_count > original_cjk_count else value


def replace_unrecoverable_garbled_text(value: str) -> str:
    has_question_garbled = "???" in value
    has_replacement_garbled = "\ufffd" in value
    if not has_question_garbled and not has_replacement_garbled:
        return value

    question_count = value.count("?")
    replacement_count = value.count("\ufffd")
    visible_count = len(value.strip())
    garbled_count = question_count + replacement_count
    if visible_count and garbled_count / visible_count > 0.5:
        return "原始中文已损坏，请重新采集或人工修复。"

    normalized = re.sub(r"\?{3,}", "【原始中文已损坏】", value)
    return re.sub(r"\ufffd{2,}", "【原始中文已损坏】", normalized)


def normalize_knowledge_text(value: str) -> str:
    return replace_unrecoverable_garbled_text(repair_utf8_mojibake(value))


def _knowledge_result(
    item: KnowledgeBase,
    *,
    match_type: str,
    score: float | None,
) -> KnowledgeSearchResult:
    return KnowledgeSearchResult(
        id=item.id,
        title=normalize_knowledge_text(item.title),
        content=normalize_knowledge_text(item.content),
        category=item.category,
        score=score,
        match_type=match_type,
    )


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


def _keyword_search_terms(query: str) -> list[str]:
    normalized = query.strip()
    if not normalized:
        return []

    terms: list[str] = []
    for token in re.split(r"[\s,，、/|｜:：;；。！？!?（）()【】\[\]\"']+", normalized):
        token = token.strip()
        if len(token) >= 2:
            terms.append(token)

    for hint in KNOWLEDGE_SEARCH_HINT_TERMS:
        if hint in normalized:
            terms.append(hint)

    deduped: list[str] = []
    seen: set[str] = set()
    for term in terms:
        normalized_term = term.lower()
        if normalized_term in seen:
            continue
        seen.add(normalized_term)
        deduped.append(term)
    return deduped[:12]


def _keyword_relevance_score(item: KnowledgeBase, query: str, terms: list[str]) -> int:
    title = item.title.lower()
    content = item.content.lower()
    normalized_query = query.strip().lower()
    score = 0
    if normalized_query and normalized_query in title:
        score += 140
    elif normalized_query and normalized_query in content:
        score += 100
    for term in terms:
        normalized_term = term.lower()
        if normalized_term in title:
            score += 24
        if normalized_term in content:
            score += 10
    return score


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
        _knowledge_result(
            item,
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
    normalized_query = query.strip()
    if not normalized_query:
        return []

    terms = _keyword_search_terms(normalized_query)
    search_terms = [normalized_query, *[term for term in terms if term != normalized_query]]
    patterns = [f"%{term}%" for term in search_terms]
    statement = select(KnowledgeBase).where(
        or_(
            *[
                or_(KnowledgeBase.title.ilike(pattern), KnowledgeBase.content.ilike(pattern))
                for pattern in patterns
            ]
        )
    )
    statement = _apply_category_filter(statement, category)
    candidate_limit = max(limit * 8, 24)
    items = db.scalars(statement.order_by(desc(KnowledgeBase.id)).limit(candidate_limit)).all()
    ranked_items = sorted(
        items,
        key=lambda item: (_keyword_relevance_score(item, normalized_query, terms), item.id),
        reverse=True,
    )[:limit]
    return [
        _knowledge_result(
            item,
            score=None,
            match_type="keyword",
        )
        for item in ranked_items
    ]


def list_knowledge_items(
    db: Session,
    category: str | None,
    limit: int,
) -> list[KnowledgeSearchResult]:
    statement = _apply_category_filter(select(KnowledgeBase), category)
    items = db.scalars(statement.order_by(desc(KnowledgeBase.id)).limit(limit)).all()
    return [
        _knowledge_result(
            item,
            score=None,
            match_type="recent",
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
