"""推广简报生成（通用引擎层）。

根据当前内容域配置生成推广简报。领域数据由 ``ContentDomain`` 提供，
本模块不依赖任何具体业务域。新业务域只需注册到 registry 即可。
"""

from __future__ import annotations

from app.core.domain import first_matching_topic_intent_for, get_domain
from app.schemas.content import ContentGenerateRequest

__all__ = ["build_promotion_brief"]


def _source_requirement_notes(
    source_context: dict[str, object] | None,
) -> list[str]:
    if not isinstance(source_context, dict):
        return ["source context unavailable; avoid current-fact conclusions"]

    web_search = source_context.get("web_search")
    if not isinstance(web_search, dict) or web_search.get("required") is not True:
        return ["use available knowledge and keep unsupported current facts out"]

    raw_results = web_search.get("results")
    if not isinstance(raw_results, list) or not raw_results:
        return [
            "live web evidence required but absent; write verification framework only",
            "do not name schools, prices, logos, rankings, policies, or market facts",
        ]

    return ["live web evidence is present; cite only supported claims"]


def build_promotion_brief(
    payload: ContentGenerateRequest,
    source_context: dict[str, object] | None = None,
    domain_key: str | None = None,
) -> dict[str, object]:
    domain = get_domain(domain_key)
    rule = first_matching_topic_intent_for(domain, payload.topic, payload.tags)
    intent_key = rule.key if rule else "general"
    base = domain.brief_by_intent.get(intent_key, domain.default_brief)
    source_requirements = [
        *base["source_requirements"],
        *_source_requirement_notes(source_context),
    ]

    return {
        "topic": payload.topic,
        "intent": {
            "key": intent_key,
            "label": rule.label if rule else "general",
            "guidance": rule.guidance if rule else "preserve the selected topic promise",
        },
        "target_persona": payload.target_audience or base["target_persona"],
        "pain_point": base["pain_point"],
        "trust_proof": base["trust_proof"],
        "offer_angle": base["offer_angle"],
        "cta": base["cta"],
        "forbidden_claims": domain.forbidden_promotion_claims,
        "source_requirements": source_requirements,
        "cover_angle": base["cover_angle"],
        "success_metric": base["success_metric"],
        "quality_checks": domain.quality_checks,
        "manual_review_required": True,
    }
