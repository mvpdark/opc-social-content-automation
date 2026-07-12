"""变体生成服务（SSB-7）。

负责调用 model_router.draft_model 生成多个变体，并通过 variant_scorer 评分。
codex_test 模式下使用本地模板生成变体；openai_compatible 模式下调用模型生成。
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.content import Content
from app.models.content_variant import ContentVariant
from app.models.user import User
from app.schemas.content_variant import SUPPORTED_VARIANT_TYPES, VariantGenerateRequest
from app.services.content_prompt_builder import PromptPackage
from app.services.content_service import _safe_commit, record_generation_log
from app.services.model_router import load_prompt, model_router
from app.services.variant_scorer import clamp_score, score_variants

logger = logging.getLogger(__name__)

__all__ = [
    "GeneratedVariant",
    "generate_variants_for_content",
    "list_variants_for_content",
    "select_variant",
    "supported_variant_types",
]

# codex_test 模式下用于生成变体的本地模板。
# 每个类型提供多个候选模板，按 variant_count 取前 N 个。
_CODEX_TEST_VARIANT_TEMPLATES: dict[str, list[str]] = {
    "title": [
        "{topic}｜一篇看懂，少踩坑",
        "{topic}避坑指南：先看这 4 点",
        "关于{topic}，姐妹们先别急着下结论",
        "{topic}怎么选？把认证、预算、毕业难度拆清楚",
        "{topic}｜核验清单 + 适配人群",
    ],
    "opening": [
        "👉姐妹们，关于“{topic}”，先别急着找一张万能榜单哈！真正有用的不是谁把名字排得最满，而是把认证、预算、毕业难度和适配人群拆清楚。",
        "📍宝子，看“{topic}”之前，先记住一句话：没有来源核验的排名，都是搬运帖。先做核验框架，再填具体学校。",
        "✨关于“{topic}”，我整理了 4 个维度：认证稳不稳、预算压力大不大、毕业难度高不高、适不适合在职人。",
        "🔥“{topic}”这种选题，最重要的是维度清楚，不要硬编具体排名。先看认证，再看预算，再看毕业难度，最后看适合谁。",
        "💓姐妹们，“{topic}”不是靠印象写的。涉及学校、价格、logo、排名这类实时信息时，先做核验清单，别让模型猜。",
    ],
    "cover_tags": [
        "#硕升博 #认证核验 #预算友好 #在职友好",
        "#水博避坑 #来源核验 #毕业难度 #适配人群",
        "#博士申请 #认证优先 #预算对比 #在职博士",
        "#海外博士 #留服认证 #学费对比 #出勤要求",
        "#博士选题 #核验清单 #风险标记 #行动指引",
    ],
}


@dataclass(frozen=True)
class GeneratedVariant:
    variant_type: str
    variant_text: str


def supported_variant_types() -> tuple[str, ...]:
    return SUPPORTED_VARIANT_TYPES


def _codex_test_variants(
    content: Content, variant_count: int, variant_types: list[str]
) -> list[GeneratedVariant]:
    """codex_test 模式下用本地模板生成变体。"""
    topic = content.title or "未命名选题"
    variants: list[GeneratedVariant] = []
    for variant_type in variant_types:
        templates = _CODEX_TEST_VARIANT_TEMPLATES.get(variant_type, [])
        if not templates:
            continue
        for template in templates[:variant_count]:
            text = template.replace("{topic}", topic)
            variants.append(GeneratedVariant(variant_type=variant_type, variant_text=text))
    return variants


def _parse_model_variants(
    raw: str, variant_types: list[str]
) -> list[GeneratedVariant]:
    """解析模型返回的变体文本。

    约定模型返回 JSON 数组，每项形如：
    ``{"type": "title", "text": "..."}``
    若解析失败则回退到按行切分。
    """
    variants: list[GeneratedVariant] = []
    try:
        data = json.loads(raw)
    except (ValueError, TypeError):
        data = None

    if isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            variant_type = str(item.get("type") or "").strip()
            text = str(item.get("text") or "").strip()
            if not text or variant_type not in variant_types:
                continue
            variants.append(GeneratedVariant(variant_type=variant_type, variant_text=text))
        if variants:
            return variants

    # 回退：按行切分，类型按 variant_types 顺序轮转。
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    if not lines:
        return []
    type_index = 0
    for line in lines:
        variant_type = variant_types[type_index % len(variant_types)]
        variants.append(GeneratedVariant(variant_type=variant_type, variant_text=line))
        type_index += 1
    return variants


def _build_variant_prompt_payload(
    content: Content, variant_count: int, variant_types: list[str]
) -> dict[str, object]:
    return {
        "content_id": content.id,
        "platform": content.platform,
        "title": content.title,
        "body": content.body,
        "tags": content.tags or [],
        "variant_count": variant_count,
        "variant_types": variant_types,
        "instruction": (
            "请为以下内容生成多个变体选项，用于运营者择优选用。"
            "返回 JSON 数组，每项包含 type（取值 title/opening/cover_tags）和 text 字段。"
            f"每个类型生成 {variant_count} 个候选，覆盖不同语气和角度。"
        ),
    }


def generate_variants_for_content(
    db: Session,
    content: Content,
    payload: VariantGenerateRequest,
    current_user: User,
) -> list[ContentVariant]:
    """为指定内容生成变体并评分入库。

    先创建所有变体记录并 flush，再记录生成日志，最后一次性 commit，
    保证日志状态与变体记录在同一事务中提交，避免数据不一致。
    """
    variant_count = payload.variant_count
    variant_types = payload.variant_types

    prompt_payload = _build_variant_prompt_payload(content, variant_count, variant_types)
    # Delay loading prompt template until needed (skip for codex_test)
    prompt_template = "" if settings.draft_provider == "codex_test" else load_prompt("variant_generation")
    log_package = PromptPackage(
        prompt_name="variant_generation",
        prompt_template=prompt_template,
        payload=prompt_payload,
    )

    result_text = ""
    try:
        if settings.draft_provider == "codex_test":
            generated = _codex_test_variants(content, variant_count, variant_types)
        else:
            result_text = model_router.draft_model("variant_generation", prompt_payload)
            generated = _parse_model_variants(result_text, variant_types)
    except HTTPException as exc:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="variant_generation",
                model="draft_model",
                package=log_package,
                result="",
                log_status="provider_not_configured",
                error=str(exc.detail),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise
    except Exception as exc:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="variant_generation",
                model="draft_model",
                package=log_package,
                result=result_text,
                log_status="error",
                error=str(exc),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise

    if not generated:
        # 空结果：记录日志后提交，再抛出异常。
        if settings.draft_provider != "codex_test":
            try:
                record_generation_log(
                    db=db,
                    current_user=current_user,
                    purpose="variant_generation",
                    model="draft_model",
                    package=log_package,
                    result=result_text,
                    log_status="empty_result",
                )
                _safe_commit(db)
            except Exception:
                logger.error("Failed to record generation log", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="变体生成结果为空，请稍后重试或调整变体类型。",
        )

    # 评分：按类型分组计算 siblings。
    items_for_scoring = [(v.variant_text, v.variant_type) for v in generated]
    scored = score_variants(items_for_scoring, content)
    score_map: dict[tuple[str, str], float] = {}
    for text, variant_type, total, _breakdown in scored:
        score_map[(text, variant_type)] = total

    # 先创建所有变体记录并 flush（不提交），确保日志与变体在同一事务中提交。
    saved: list[ContentVariant] = []
    for variant in generated:
        score = clamp_score(
            score_map.get((variant.variant_text, variant.variant_type), 0.0)
        )
        record = ContentVariant(
            content_id=content.id,
            variant_type=variant.variant_type,
            variant_text=variant.variant_text,
            score=score,
            selected=False,
        )
        db.add(record)
        saved.append(record)
    try:
        db.flush()
    except Exception:
        db.rollback()
        logger.warning("Failed to flush variant records", exc_info=True)
        raise

    # 变体记录已 flush，现在记录生成日志，与变体记录在同一事务中提交。
    if settings.draft_provider != "codex_test":
        _gen_log = record_generation_log(
            db=db,
            current_user=current_user,
            purpose="variant_generation",
            model="draft_model",
            package=log_package,
            result=result_text,
            log_status="success",
        )
        if _gen_log is None:
            logger.warning("record_generation_log returned None for variant_generation (user=%s)", current_user.id)

    # 一次性提交：生成日志 + 变体记录，保证数据一致性。
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.warning(
            "Failed to commit variant records and generation log",
            exc_info=True,
        )
        raise
    for record in saved:
        try:
            db.refresh(record)
        except Exception:
            logger.warning("Failed to refresh variant record", exc_info=True)
    return saved


def list_variants_for_content(
    db: Session, content_id: int, user_id: int
) -> list[ContentVariant]:
    # Defense-in-depth: only return variants whose content belongs to the user.
    user_content_ids = select(Content.id).where(Content.user_id == user_id)
    statement = (
        select(ContentVariant)
        .where(
            ContentVariant.content_id == content_id,
            ContentVariant.content_id.in_(user_content_ids),
        )
        .order_by(
            ContentVariant.variant_type,
            desc(ContentVariant.score),
            desc(ContentVariant.created_at),
        )
    )
    return list(db.scalars(statement).all())


def select_variant(
    db: Session, content_id: int, variant_id: int, user_id: int
) -> ContentVariant:
    variant = db.get(ContentVariant, variant_id, with_for_update=True)
    if variant is None or variant.content_id != content_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这个变体。",
        )
    # Defense-in-depth: verify the variant's content belongs to the user.
    owner_check = db.scalar(
        select(Content.id).where(
            Content.id == content_id, Content.user_id == user_id
        )
    )
    if owner_check is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这个变体。",
        )
    # 同一内容下同一类型的其他变体取消选中。
    # 使用悲观锁防止并发选中导致的数据竞争（SQLite 忽略，PostgreSQL 强制行锁）。
    statement = (
        select(ContentVariant)
        .where(
            ContentVariant.content_id == content_id,
            ContentVariant.variant_type == variant.variant_type,
        )
        .with_for_update()
    )
    for other in db.scalars(statement).all():
        if other.id != variant.id:
            other.selected = False
    variant.selected = True
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    try:
        db.refresh(variant)
    except Exception:
        logger.warning("Failed to refresh variant after successful commit", exc_info=True)
    return variant
