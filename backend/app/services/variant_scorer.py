"""变体评分服务（SSB-7）。

评分维度（满分 100）：
- 长度适中（20-40 分）：不同变体类型有不同的最佳长度区间。
- 关键词命中（20 分）：是否覆盖选题/标签中的核心关键词。
- 平台语气匹配（20 分）：是否贴合平台常见语气词与表达习惯。
- 独特性（20 分）：与同批变体的差异度。
- 可读性（20 分）：标点、空格、emoji 等是否合理。

codex_test 模式下使用纯规则评分；openai_compatible 模式下可让模型自评，
但为保持流程稳定，仍以规则评分为底座，模型自评作为可选增强。
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass

from app.core.config import settings
from app.models.content import Content

__all__ = [
    "VariantScoreBreakdown",
    "score_variant",
    "score_variants",
]


# 各变体类型的最佳长度区间（按字符数计，含中英文）。
VARIANT_LENGTH_RANGES: dict[str, tuple[int, int]] = {
    "title": (8, 30),
    "opening": (20, 120),
    "cover_tags": (4, 60),
}

# 各平台常见语气词与表达习惯，命中越多得分越高。
PLATFORM_TONE_MARKERS: dict[str, tuple[str, ...]] = {
    "xiaohongshu": (
        "姐妹",
        "宝子",
        "哇",
        "呀",
        "呢",
        "🔥",
        "👉",
        "📍",
        "💓",
        "✨",
        "！",
    ),
    "douyin": ("家人们", "老铁", "哈", "呀", "！", "🔥", "👉"),
    "wechat": ("我们", "大家", "呢", "哦", "？", "。"),
}

# 可读性扣分项：连续重复标点、连续空格、纯符号行。
_REPEATED_PUNCT_RE = re.compile(r"[!?！？。，,\s]{3,}")
_LEADING_SYMBOL_RE = re.compile(r"^[^\w\u4e00-\u9fff]+")


@dataclass(frozen=True)
class VariantScoreBreakdown:
    """单个变体的评分明细。"""

    length: float
    keyword: float
    platform_tone: float
    uniqueness: float
    readability: float

    @property
    def total(self) -> float:
        return round(
            self.length
            + self.keyword
            + self.platform_tone
            + self.uniqueness
            + self.readability,
            2,
        )


def _length_score(text: str, variant_type: str) -> float:
    low, high = VARIANT_LENGTH_RANGES.get(variant_type, (8, 120))
    length = len(text)
    if length == 0:
        return 0.0
    if low <= length <= high:
        return 40.0 if variant_type == "title" else 30.0
    # 偏离区间按比例扣分。
    if length < low:
        ratio = max(0.0, length / low)
    else:
        ratio = max(0.0, high / length)
    base = 40.0 if variant_type == "title" else 30.0
    return round(base * ratio, 2)


def _keyword_score(text: str, content: Content) -> float:
    topic = (content.title or "").lower()
    tags = [str(tag).lower() for tag in (content.tags or [])]
    keywords = [token for token in [*topic.split(), *tags] if token]
    if not keywords:
        # 没有关键词时给中性分，避免空内容被误判。
        return 10.0
    lowered = text.lower()
    hit = sum(1 for keyword in keywords if keyword in lowered)
    ratio = hit / len(keywords)
    return round(20.0 * ratio, 2)


def _platform_tone_score(text: str, platform: str) -> float:
    markers = PLATFORM_TONE_MARKERS.get(platform, ())
    if not markers:
        return 10.0
    lowered = text.lower()
    hit = sum(1 for marker in markers if marker.lower() in lowered)
    # 命中 2 个以上即满分，避免堆砌。
    ratio = min(1.0, hit / 2.0)
    return round(20.0 * ratio, 2)


def _uniqueness_score(text: str, siblings: list[str]) -> float:
    if not siblings:
        return 20.0
    lowered = text.lower().strip()
    # 用 Jaccard 相似度近似差异度。
    def _token_set(value: str) -> set[str]:
        return set(re.findall(r"[\w\u4e00-\u9fff]+", value))

    target_tokens = _token_set(lowered)
    if not target_tokens:
        return 0.0
    max_similarity = 0.0
    for sibling in siblings:
        sibling_tokens = _token_set(sibling.lower().strip())
        if not sibling_tokens:
            continue
        intersection = len(target_tokens & sibling_tokens)
        union = len(target_tokens | sibling_tokens)
        similarity = intersection / union if union else 0.0
        max_similarity = max(max_similarity, similarity)
    # 相似度越低，独特性越高。
    return round(20.0 * (1.0 - max_similarity), 2)


def _readability_score(text: str) -> float:
    if not text.strip():
        return 0.0
    score = 20.0
    if _REPEATED_PUNCT_RE.search(text):
        score -= 6.0
    if _LEADING_SYMBOL_RE.match(text):
        score -= 4.0
    # 过短或纯符号串扣分。
    meaningful = sum(1 for char in text if char.isalnum())
    if meaningful < 3:
        score -= 10.0
    return round(max(0.0, score), 2)


def score_variant(
    text: str,
    variant_type: str,
    content: Content,
    siblings: list[str] | None = None,
) -> VariantScoreBreakdown:
    """对单个变体文本进行规则评分。"""
    siblings = siblings or []
    return VariantScoreBreakdown(
        length=_length_score(text, variant_type),
        keyword=_keyword_score(text, content),
        platform_tone=_platform_tone_score(text, content.platform),
        uniqueness=_uniqueness_score(text, siblings),
        readability=_readability_score(text),
    )


def score_variants(
    items: list[tuple[str, str]],
    content: Content,
) -> list[tuple[str, str, float, VariantScoreBreakdown]]:
    """对同一类型的一组变体进行评分。

    ``items`` 是 ``(variant_text, variant_type)`` 列表；同批变体互为 siblings，
    用于独特性评分。返回 ``(variant_text, variant_type, total_score, breakdown)`` 列表。
    """
    results: list[tuple[str, str, float, VariantScoreBreakdown]] = []
    # 按 variant_type 分组计算 siblings。
    siblings_by_type: dict[str, list[str]] = {}
    for text, variant_type in items:
        siblings_by_type.setdefault(variant_type, []).append(text)

    for text, variant_type in items:
        siblings = [s for s in siblings_by_type.get(variant_type, []) if s != text]
        breakdown = score_variant(text, variant_type, content, siblings)
        results.append((text, variant_type, breakdown.total, breakdown))
    return results


def score_with_model_self_eval(
    text: str,
    variant_type: str,
    content: Content,
    siblings: list[str] | None = None,
) -> float:
    """openai_compatible 模式下可让模型自评，作为规则评分的可选增强。

    当前实现保留为占位：若模型自评不可用或失败，则回退到规则评分。
    这样可以保证流程稳定，不会因为模型自评异常而中断变体生成。
    """
    rule_breakdown = score_variant(text, variant_type, content, siblings)
    if settings.draft_provider != "openai_compatible":
        return rule_breakdown.total
    # 模型自评需要额外的 prompt 与调用，这里先返回规则评分作为底座，
    # 后续可在不破坏流程的前提下接入模型自评。
    return rule_breakdown.total


def clamp_score(value: float) -> float:
    """将评分限制在 [0, 100] 区间，避免浮点误差。"""
    if not math.isfinite(value):
        return 0.0
    return round(max(0.0, min(100.0, value)), 2)
