"""内容域协议与注册中心。

核心引擎通过 ``ContentDomain`` 描述一个业务域（如硕升博、港考培训），
运行时由 ``DomainRegistry`` 按 key 取出对应配置。引擎本身不 import
任何具体业务，新增业务只需在 ``app/domains/<key>/domain.py`` 里定义
一个 ``ContentDomain`` 并注册即可，像搭积木一样插入。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

__all__ = [
    "TopicIntentRule",
    "TestDraftBranchConfig",
    "ContentDomain",
    "DomainRegistry",
    "registry",
    "get_domain",
    "contains_any",
    "joined_topic_text",
    "score_topic_intent",
    "best_matching_topic_intent",
    "is_water_ranking_topic_for",
    "first_matching_topic_intent_for",
    "resolve_test_draft_branch",
]


@dataclass(frozen=True)
class TopicIntentRule:
    """单条选题意图规则。通用结构，各域填充自己的内容。"""

    key: str
    topic_terms: tuple[str, ...]
    draft_terms: tuple[str, ...]
    label: str
    guidance: str


@dataclass(frozen=True)
class TestDraftBranchConfig:
    """本地检查草稿的分支选择配置。

    对应原 ``model_router._resolve_test_draft_branch`` 的逻辑，
    数据化后每个域可自定义分支名与 intent→branch 映射。
    """

    xhs_water_ranking: str
    xhs_missing_web_sources: str
    xhs_default: str
    water_ranking: str
    default: str
    # intent.key -> 小红书平台下的分支名，如 "source_check" -> "xhs_source_check"
    intent_branch_map: dict[str, str] = field(default_factory=dict)
    # intent.key -> ((关键词组, 子分支名), ...)，用于 mentor/sales 等带子分支的意图。
    # 关键词组内为 OR 关系：命中任意一个关键词即走子分支。
    intent_subbranch_rules: dict[str, tuple[tuple[tuple[str, ...], str], ...]] = field(
        default_factory=dict
    )


@dataclass(frozen=True)
class ContentDomain:
    """一个业务内容域的完整配置。"""

    key: str
    label: str

    # --- 选题意图识别（原 topic_intent.py）---
    topic_intent_rules: tuple[TopicIntentRule, ...]
    strong_topic_terms_by_rule: dict[str, tuple[str, ...]]
    water_route_topic_terms: tuple[str, ...]
    ranking_topic_terms: tuple[str, ...]
    ranking_draft_terms: tuple[str, ...]

    # --- 推广简报（原 promotion_brief.py）---
    forbidden_promotion_claims: list[str]
    quality_checks: list[str]
    brief_by_intent: dict[str, dict[str, object]]
    default_brief: dict[str, object]

    # --- 草稿校验（原 content_prompt_builder.py）---
    missing_web_framework_terms: tuple[str, ...]
    missing_web_fact_terms: tuple[str, ...]
    draft_prompt_name: str
    rewrite_prompt_name: str

    # --- 本地检查草稿分支（原 model_router.py）---
    test_draft_branches: TestDraftBranchConfig
    default_audience: str
    default_tag_line: str


class DomainRegistry:
    """内容域注册中心。运行时按 key 取域配置。"""

    def __init__(self) -> None:
        self._domains: dict[str, ContentDomain] = {}
        self._default_key: str = "ssb"

    def register(self, domain: ContentDomain) -> None:
        self._domains[domain.key] = domain

    def get(self, key: str | None = None) -> ContentDomain:
        resolved = key or self._default_key
        if resolved not in self._domains:
            _bootstrap_domain(resolved)
        if resolved not in self._domains:
            raise KeyError(f"未知内容域：{resolved}")
        return self._domains[resolved]

    def list_keys(self) -> list[str]:
        return list(self._domains.keys())

    def set_default(self, key: str) -> None:
        if key not in self._domains:
            raise KeyError(f"未知内容域：{key}")
        self._default_key = key


def _bootstrap_domain(key: str) -> None:
    """按需懒加载域配置。

    通用壳本身不内置任何业务域。各业务项目在自己的 domain 包里
    调用 ``registry.register`` 注册，或在 ``register_all_domains`` 中追加。
    """
    return None


registry = DomainRegistry()


def get_domain(key: str | None = None) -> ContentDomain:
    """获取内容域配置。key 为空时返回默认域；若未注册任何域则抛出 KeyError。"""
    return registry.get(key)


# ---------------------------------------------------------------------------
# 通用算法：与具体业务无关，只依赖 ContentDomain 数据。
# ---------------------------------------------------------------------------


def contains_any(text: str, terms: tuple[str, ...]) -> bool:
    normalized = text.lower()
    return any(term.lower() in normalized for term in terms)


def joined_topic_text(topic: str, tags: list[str] | None = None) -> str:
    return " ".join([topic, *(tags or [])])


def score_topic_intent(
    text: str, rule: TopicIntentRule, strong_terms: tuple[str, ...]
) -> int:
    normalized = text.lower()
    return sum(
        2 if term in strong_terms else 1
        for term in rule.topic_terms
        if term.lower() in normalized
    )


def best_matching_topic_intent(
    domain: ContentDomain, text: str
) -> TopicIntentRule | None:
    scored_rules: list[tuple[int, TopicIntentRule]] = []
    for rule in domain.topic_intent_rules:
        strong = domain.strong_topic_terms_by_rule.get(rule.key, ())
        score = score_topic_intent(text, rule, strong)
        if score > 0:
            scored_rules.append((score, rule))
    if not scored_rules:
        return None
    return max(scored_rules, key=lambda item: item[0])[1]


def is_water_ranking_topic_for(
    domain: ContentDomain, topic: str, tags: list[str] | None = None
) -> bool:
    topic_text = joined_topic_text(topic, tags)
    topic_intent = best_matching_topic_intent(domain, topic_text)
    if topic_intent and topic_intent.key != "list_filter":
        return False
    return contains_any(topic_text, domain.water_route_topic_terms) and contains_any(
        topic_text, domain.ranking_topic_terms
    )


def first_matching_topic_intent_for(
    domain: ContentDomain, topic: str, tags: list[str] | None = None
) -> TopicIntentRule | None:
    return best_matching_topic_intent(domain, topic) or best_matching_topic_intent(
        domain, " ".join(tags or [])
    )


def resolve_test_draft_branch(
    domain: ContentDomain,
    is_xiaohongshu: bool,
    is_water_ranking: bool,
    topic_intent: TopicIntentRule | None,
    topic: str,
    missing_required_web_sources: bool,
) -> str:
    """通用版分支选择，等价于原 ``_resolve_test_draft_branch``。"""
    cfg = domain.test_draft_branches
    if is_xiaohongshu and is_water_ranking:
        return cfg.xhs_water_ranking
    if is_xiaohongshu and missing_required_web_sources:
        return cfg.xhs_missing_web_sources
    if is_xiaohongshu and topic_intent:
        subbranches = cfg.intent_subbranch_rules.get(topic_intent.key, ())
        for keywords, subbranch in subbranches:
            if any(keyword in topic for keyword in keywords):
                return subbranch
        branch = cfg.intent_branch_map.get(topic_intent.key)
        if branch:
            return branch
    if is_xiaohongshu:
        return cfg.xhs_default
    if is_water_ranking:
        return cfg.water_ranking
    return cfg.default
