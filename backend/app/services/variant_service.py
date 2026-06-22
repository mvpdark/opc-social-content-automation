"""变体生成服务（SSB-7）。

负责调用 model_router.draft_model 生成多个变体，并通过 variant_scorer 评分。
codex_test 模式下使用本地模板生成变体；openai_compatible 模式下调用模型生成。
"""

from __future__ import annotations

import json
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
from app.services.content_service import record_generation_log
from app.services.model_router import load_prompt, model_router
from app.services.variant_scorer import clamp_score, score_variants

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
    """为指定内容生成变体并评分入库。"""
    variant_count = payload.variant_count
    variant_types = payload.variant_types

    prompt_template = load_prompt("draft_generation")
    prompt_payload = _build_variant_prompt_payload(content, variant_count, variant_types)
    log_package = PromptPackage(
        prompt_name="draft_generation",
        prompt_template=prompt_template,
        payload=prompt_payload,
    )

    try:
        if settings.draft_provider == "codex_test":
            generated = _codex_test_variants(content, variant_count, variant_types)
        else:
            result_text = model_router.draft_model("draft_generation", prompt_payload)
            generated = _parse_model_variants(result_text, variant_types)
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="variant_generation",
                model="draft_model",
                package=log_package,
                result=result_text,
                status="success",
            )
    except HTTPException as exc:
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="variant_generation",
            model="draft_model",
            package=log_package,
            result="",
            status="provider_not_configured",
            error=str(exc.detail),
        )
        raise

    if not generated:
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
    db.commit()
    for record in saved:
        db.refresh(record)
    return saved


def list_variants_for_content(db: Session, content_id: int) -> list[ContentVariant]:
    statement = (
        select(ContentVariant)
        .where(ContentVariant.content_id == content_id)
        .order_by(
            ContentVariant.variant_type,
            desc(ContentVariant.score),
            desc(ContentVariant.created_at),
        )
    )
    return list(db.scalars(statement).all())


def select_variant(db: Session, content_id: int, variant_id: int) -> ContentVariant:
    variant = db.get(ContentVariant, variant_id)
    if variant is None or variant.content_id != content_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这个变体。",
        )
    # 同一内容下同一类型的其他变体取消选中。
    statement = select(ContentVariant).where(
        ContentVariant.content_id == content_id,
        ContentVariant.variant_type == variant.variant_type,
        ContentVariant.selected.is_(True),
    )
    for other in db.scalars(statement).all():
        if other.id != variant.id:
            other.selected = False
    variant.selected = True
    db.commit()
    db.refresh(variant)
    return variant
