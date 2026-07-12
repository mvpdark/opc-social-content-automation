import logging
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
try:
    from datetime import UTC, datetime, timedelta
except ImportError:
    from datetime import datetime, timedelta, timezone
    UTC = timezone.utc

from fastapi import HTTPException
from sqlalchemy import Select, case, desc, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.knowledge_base import KnowledgeBase
from app.schemas.knowledge import KnowledgeSearchResult, KnowledgeUploadRequest
from app.services.model_router import model_router

logger = logging.getLogger(__name__)

KNOWLEDGE_COMPILED_CATEGORY = "ai-compiled-weekly"
KNOWLEDGE_COMPILE_MARKER = "AI_KNOWLEDGE_COMPILED_AT="
COMPILE_KEYWORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_-]{2,}|[\u4e00-\u9fff]{2,8}")
COMPILE_STOP_TERMS = {
    "内容",
    "参考",
    "来源",
    "这个",
    "一个",
    "可以",
    "需要",
    "没有",
    "不是",
    "以及",
    "如果",
    "目前",
    "进行",
    "生成",
    "自动",
    "小红书",
    "xhs",
}

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


@dataclass(frozen=True)
class KnowledgeCompilationResult:
    item: KnowledgeSearchResult | None
    compiled: bool
    due: bool
    interval_hours: int
    source_count: int
    message: str


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
    logger.warning("knowledge_service 已废弃，知识库已迁移到 ZSCJ")
    raise HTTPException(status_code=410, detail="此接口已迁移到 ZSCJ 知识库")


def _latest_compiled_item(db: Session) -> KnowledgeBase | None:
    logger.warning("knowledge_service 已废弃，知识库已迁移到 ZSCJ")
    raise HTTPException(status_code=410, detail="此接口已迁移到 ZSCJ 知识库")


def latest_knowledge_compilation(db: Session) -> KnowledgeSearchResult | None:
    logger.warning("knowledge_service 已废弃，知识库已迁移到 ZSCJ")
    raise HTTPException(status_code=410, detail="此接口已迁移到 ZSCJ 知识库")


def _compiled_at(item: KnowledgeBase | None) -> datetime | None:
    if item is None:
        return None

    if not item.content:
        return None

    for line in item.content.splitlines()[:8]:
        if not line.startswith(KNOWLEDGE_COMPILE_MARKER):
            continue
        raw_value = line.removeprefix(KNOWLEDGE_COMPILE_MARKER).strip()
        try:
            parsed = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC)
    return None


def is_knowledge_compilation_due(db: Session, interval_hours: int) -> bool:
    logger.warning("knowledge_service 已废弃，知识库已迁移到 ZSCJ")
    raise HTTPException(status_code=410, detail="此接口已迁移到 ZSCJ 知识库")


def _source_knowledge_items(db: Session, limit: int) -> list[KnowledgeBase]:
    logger.warning("knowledge_service 已废弃，知识库已迁移到 ZSCJ")
    raise HTTPException(status_code=410, detail="此接口已迁移到 ZSCJ 知识库")


def _compact_text(value: str, max_length: int) -> str:
    text = " ".join(normalize_knowledge_text(value).split())
    if len(text) <= max_length:
        return text
    return f"{text[:max_length].rstrip()}..."


def _compile_keywords(items: list[KnowledgeBase], limit: int = 18) -> list[str]:
    counter: Counter[str] = Counter()
    for item in items:
        text = f"{item.title or ''}\n{item.category or ''}\n{item.content or ''}".lower()
        for raw_term in COMPILE_KEYWORD_RE.findall(normalize_knowledge_text(text)):
            term = raw_term.strip().lower()
            if len(term) < 2 or term in COMPILE_STOP_TERMS:
                continue
            counter[term] += 1
    return [term for term, _count in counter.most_common(limit)]


def _render_category_map(items: list[KnowledgeBase]) -> list[str]:
    grouped: dict[str, list[KnowledgeBase]] = defaultdict(list)
    for item in items:
        grouped[item.category or "uncategorized"].append(item)

    lines = ["## 知识地图"]
    for category, category_items in sorted(
        grouped.items(),
        key=lambda pair: (-len(pair[1]), pair[0]),
    ):
        titles = "；".join(_compact_text(item.title, 34) for item in category_items[:4])
        lines.append(f"- {category}：{len(category_items)} 条。代表条目：{titles}")
    return lines


def render_knowledge_compilation(
    items: list[KnowledgeBase],
    *,
    compiled_at: datetime | None = None,
) -> tuple[str, str]:
    compiled_at = compiled_at or datetime.now(UTC)
    compiled_at = compiled_at.astimezone(UTC)
    source_count = len(items)
    keywords = _compile_keywords(items)
    keyword_line = "、".join(keywords) if keywords else "暂无高频关键词"
    title = f"AI知识库编译版 {compiled_at.strftime('%Y-%m-%d')}"

    lines = [
        f"{KNOWLEDGE_COMPILE_MARKER}{compiled_at.isoformat()}",
        f"SOURCE_COUNT={source_count}",
        "",
        "# AI知识库编译版",
        "",
        "## 使用规则",
        "- 这份内容是给 AI 优先读取的压缩知识库，用来减少重复检索和长文本噪音。",
        "- 需要写作、选题、封面或转化建议时，先读取本条，再按需回查原始知识条目。",
        "- 涉及学校、价格、认证、政策、排名等事实时，必须回到原始来源或实时来源核验，不要凭空补全。",
        "",
        "## 高频主题",
        f"- {keyword_line}",
        "",
        *_render_category_map(items),
        "",
        "## 可直接给 AI 的摘要",
    ]

    for index, item in enumerate(items[:36], start=1):
        title_excerpt = _compact_text(item.title, 64)
        content_excerpt = _compact_text(item.content, 260)
        category = item.category or "uncategorized"
        lines.append(f"{index}. [{category}] #{item.id} {title_excerpt}：{content_excerpt}")

    if len(items) > 36:
        lines.append(f"- 其余 {len(items) - 36} 条作为低优先级来源，需要时再按关键词检索。")

    lines.extend(
        [
            "",
            "## 生成时优先级",
            "1. 先使用本编译版判断主题、写法、封面方向和风险边界。",
            "2. 再读取最相关的原始知识条目，补充具体案例、数据和表达细节。",
            "3. 如果知识库与实时搜索冲突，以可验证的新来源为准。",
        ]
    )
    return title, "\n".join(lines)


def compile_knowledge_base(
    db: Session,
    *,
    force: bool = False,
    interval_hours: int | None = None,
    source_limit: int = 120,
) -> KnowledgeCompilationResult:
    # 知识库编译已迁移到 ZSCJ，此处保留函数签名但直接返回安全结果
    logger.warning("compile_knowledge_base 已废弃，知识库已迁移到 ZSCJ")
    return KnowledgeCompilationResult(
        item=None,
        compiled=False,
        due=False,
        interval_hours=interval_hours or settings.knowledge_compile_interval_hours,
        source_count=0,
        message="deprecated_knowledge_migrated_to_zscj",
    )


def compile_knowledge_base_if_due(
    db: Session,
    *,
    interval_hours: int,
    source_limit: int,
) -> KnowledgeCompilationResult | None:
    result = compile_knowledge_base(
        db=db,
        force=False,
        interval_hours=interval_hours,
        source_limit=source_limit,
    )
    return result if result.compiled else None


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


def _escape_ilike(term: str) -> str:
    """转义 ilike 模式中的特殊字符：先转义反斜杠，再转义 % 和 _。"""
    return term.replace(chr(92), chr(92) + chr(92)).replace('%', chr(92) + '%').replace('_', chr(92) + '_')


def keyword_search(
    db: Session,
    query: str,
    category: str | None,
    limit: int,
) -> list[KnowledgeSearchResult]:
    logger.warning("knowledge_service 已废弃，知识库已迁移到 ZSCJ")
    raise HTTPException(status_code=410, detail="此接口已迁移到 ZSCJ 知识库")


def list_knowledge_items(
    db: Session,
    category: str | None,
    limit: int,
) -> list[KnowledgeSearchResult]:
    logger.warning("knowledge_service 已废弃，知识库已迁移到 ZSCJ")
    raise HTTPException(status_code=410, detail="此接口已迁移到 ZSCJ 知识库")
