import json
import logging
from dataclasses import dataclass
import httpx

from app.models.content import Content
from app.models.user import User
from app.schemas.content import ContentGenerateRequest, ContentRewriteRequest
from app.services.content_source_context import (
    _admission_notices_context,
    _knowledge_context,
    _popular_posts_context,
    _public_source_context,
    _source_context_with_promotion_brief,
)
from app.services.model_router import load_platform_style_reference, load_prompt
from app.core.domain import (
    contains_any,
    first_matching_topic_intent_for,
    get_domain,
    is_water_ranking_topic_for,
)
from app.services.web_search_service import build_live_web_search_context
from app.core.config import settings

logger = logging.getLogger(__name__)

MIN_DRAFT_MEANINGFUL_CHARACTERS = 20
DRAFT_METADATA_SECTION_HEADINGS = (
    "title",
    "body",
    "tags",
    "platform fit notes",
    "source context ids",
    "risk notes",
    "标题",
    "正文",
    "标签",
    "平台适配说明",
    "来源上下文",
    "风险说明",
    "风险备注",
)
# 缺来源时的框架/事实结论校验术语由 ContentDomain.missing_web_framework_terms
# 与 ContentDomain.missing_web_fact_terms 提供（见 app.core.domain）。


@dataclass(frozen=True)
class PromptPackage:
    prompt_name: str
    prompt_template: str
    payload: dict[str, object]

    def to_log_text(self) -> str:
        return json.dumps(
            {
                "prompt_name": self.prompt_name,
                "prompt_template": self.prompt_template,
                "payload": self.payload,
            },
            ensure_ascii=False,
            indent=2,
        )


def _prompt_web_search_context(
    source_context: dict[str, object],
    web_search_context: dict[str, object] | None,
) -> dict[str, object] | None:
    if web_search_context is not None:
        return web_search_context

    raw_web_search = source_context.get("web_search")
    if not isinstance(raw_web_search, dict) or not raw_web_search.get("required"):
        return None

    return {
        **raw_web_search,
        "usage_note": (
            "Live web search was required but no Tavily sources were available. "
            "Do not name schools, prices, logos, rankings, policies, or current "
            "facts; provide a verification framework and ask for source review."
        ),
    }


def _is_water_ranking_topic(payload: ContentGenerateRequest) -> bool:
    return is_water_ranking_topic_for(get_domain(), payload.topic, payload.tags)


def _draft_topic_relevance_issue(
    payload: ContentGenerateRequest, draft: str, domain_key: str | None = None
) -> str | None:
    domain = get_domain(domain_key)
    if not is_water_ranking_topic_for(domain, payload.topic, payload.tags):
        rule = first_matching_topic_intent_for(domain, payload.topic, payload.tags)
        if rule and not contains_any(draft, rule.draft_terms):
            return (
                f"撰稿结果偏离选题：当前选题是“{payload.topic}”，但草稿没有围绕{rule.label}展开。"
                f"{rule.guidance}"
            )
        return None

    has_route_term = contains_any(draft, domain.water_route_topic_terms)
    has_ranking_structure = contains_any(draft, domain.ranking_draft_terms)
    if has_route_term and has_ranking_structure:
        return None

    return (
        f"撰稿结果偏离选题：当前选题是“{payload.topic}”，但草稿没有围绕水博榜单/排名展开。"
        "请补充已核实的学校或项目资料后重试，或改成认证、预算、毕业难度、在职适配等榜单维度。"
    )


def _draft_output_schema_issue(draft: object) -> str | None:
    if not isinstance(draft, str) or not draft.strip():
        return "草稿生成结果为空，请补充素材或稍后重试。"
    return None


def _meaningful_draft_character_count(draft: str) -> int:
    return sum(1 for char in draft if char.isalnum())


def _draft_too_thin_issue(draft: str) -> str | None:
    if _meaningful_draft_character_count(draft) < MIN_DRAFT_MEANINGFUL_CHARACTERS:
        return "草稿正文过短，无法覆盖选题、受众、行动建议和人工核对提醒，请补充素材后重新生成。"
    return None


def _draft_metadata_section_issue(draft: str) -> str | None:
    for raw_line in draft.splitlines():
        line = raw_line.strip().lstrip("#").strip()
        line = line.lstrip("-*•0123456789.、) ").strip()
        normalized_line = line.casefold()
        for heading in DRAFT_METADATA_SECTION_HEADINGS:
            normalized_heading = heading.casefold()
            if normalized_line.startswith(f"{normalized_heading}:") or normalized_line.startswith(
                f"{normalized_heading}："
            ):
                return "草稿生成结果包含标题、标签或风险说明等元数据段落，请重新生成正文草稿。"
    return None


def _draft_hashtag_line_issue(draft: str) -> str | None:
    for raw_line in draft.splitlines():
        line = raw_line.strip()
        normalized_line = line.lstrip("-*•0123456789.、) ").strip()
        if normalized_line.startswith(("#", "＃")) and any(
            char.isalnum() for char in normalized_line[1:]
        ):
            return "草稿正文包含独立话题标签行，请重新生成不带标签行的正文草稿。"
    return None


def _source_context_missing_required_web_results(source_context: object) -> bool:
    if not isinstance(source_context, dict):
        return False
    web_search = source_context.get("web_search")
    if not isinstance(web_search, dict) or not web_search.get("required"):
        return False
    results = web_search.get("results")
    return not isinstance(results, list) or len(results) == 0


def _draft_missing_required_web_source_issue(
    source_context: object, draft: str, domain_key: str | None = None
) -> str | None:
    if not _source_context_missing_required_web_results(source_context):
        return None
    domain = get_domain(domain_key)
    if contains_any(draft, domain.missing_web_fact_terms):
        return "缺少可见 Tavily 来源时，草稿只能提供核验框架；不要让模型猜测学校、价格、logo 或排名结论。"
    if not contains_any(draft, domain.missing_web_framework_terms):
        return "缺少可见 Tavily 来源时，草稿必须明确保留核验框架和人工补来源提醒。"
    return None




async def _fetch_zscj_profile_style(profile_id: str) -> dict[str, str] | None:
    """从 ZSCJ 获取风格 Profile 的写作风格信息，注入到生成 prompt 中。"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.zscj_api_base_url}/generate/profiles"
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            for rt in data if isinstance(data, list) else []:
                for acct in rt.get("accounts", []):
                    if acct.get("id") == profile_id:
                        return {
                            "profile_name": acct.get("name", ""),
                            "role_type": rt.get("name", rt.get("label", "")),
                            "style_dna": json.dumps(acct.get("style_dna", {}), ensure_ascii=False),
                            "description": acct.get("description", ""),
                        }
    except Exception:
        logger.warning("Failed to fetch ZSCJ profile style for %s", profile_id, exc_info=True)
    return None


async def build_draft_prompt_package(
    payload: ContentGenerateRequest,
    current_user: User,
) -> PromptPackage:
    knowledge_context = _knowledge_context(payload)
    popular_posts = _popular_posts_context(payload, limit=3)
    admission_notices = _admission_notices_context(payload, limit=3)
    web_search_context = build_live_web_search_context(
        platform=payload.platform,
        topic=payload.topic,
        tags=payload.tags,
    )
    source_context = _source_context_with_promotion_brief(
        payload,
        _public_source_context(payload, knowledge_context, web_search_context),
    )
    domain = get_domain(getattr(current_user, "domain_key", None))

    # 当选择了风格 Profile 时，从 ZSCJ 获取风格信息并注入
    profile_style: dict[str, str] | None = None
    if getattr(payload, "profile_id", None):
        profile_style = await _fetch_zscj_profile_style(payload.profile_id)

    return PromptPackage(
        prompt_name=domain.draft_prompt_name,
        prompt_template=load_prompt(domain.draft_prompt_name),
        payload={
            "platform": payload.platform,
            "topic": payload.topic,
            "tags": payload.tags,
            "tone": payload.tone,
            "target_audience": payload.target_audience,
            "knowledge_query": payload.knowledge_query,
            "knowledge_context": knowledge_context,
            "web_search_context": _prompt_web_search_context(source_context, web_search_context),
            "popular_posts": popular_posts,
            "admission_notices": admission_notices,
            "source_context": source_context,
            "promotion_brief": source_context["promotion_brief"],
            "style_reference": load_platform_style_reference(payload.platform),
            "domain_key": getattr(current_user, "domain_key", None),
            "profile_style": profile_style,
            "user": {
                "id": current_user.id,
                "role": current_user.role,
            },
        },
    )


def build_rewrite_prompt_package(
    content: Content,
    payload: ContentRewriteRequest,
    current_user: User,
) -> PromptPackage:
    domain = get_domain(getattr(current_user, "domain_key", None))
    return PromptPackage(
        prompt_name=domain.rewrite_prompt_name,
        prompt_template=load_prompt(domain.rewrite_prompt_name),
        payload={
            "content_id": content.id,
            "platform": content.platform,
            "title": content.title,
            "body": content.body,
            "tags": content.tags or [],
            "instruction": payload.instruction,
            "style_reference": load_platform_style_reference(content.platform),
            "user": {
                "id": current_user.id,
                "role": current_user.role,
            },
        },
    )
