import hashlib
import json
import math
import re

from fastapi import HTTPException, status

from app.core.config import settings
from app.services.model_router_helpers import (
    PROMPT_ROOT,
    _chat_messages,
    _deepseek_messages,
    _extract_chat_content,
    _post_chat_completion,
    _post_image_generation,
    _resolved_aspect_ratio,
    _string_list,
    load_platform_style_reference,
    load_prompt,
)
from app.services.model_router_images import (
    FILENAME_RE,
    GENERATED_ASSET_ROOT,
    _extract_image_url,
    _image_prompt,
    _image_size,
    _test_image,
)
from app.core.domain import (
    TopicIntentRule,
    first_matching_topic_intent_for,
    get_domain,
    is_water_ranking_topic_for,
    resolve_test_draft_branch,
)

TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)

__all__ = [
    "FILENAME_RE",
    "GENERATED_ASSET_ROOT",
    "load_platform_style_reference",
    "load_prompt",
    "model_router",
]


def _public_tone(value: object) -> str:
    tone = str(value or "自然、可信、克制")
    return tone.split("隐藏撰稿规则：", 1)[0].rstrip("；; ") or "自然、可信、克制"


def _missing_required_web_sources(value: object) -> bool:
    if not isinstance(value, dict) or value.get("required") is not True:
        return False
    raw_results = value.get("results")
    return not isinstance(raw_results, list) or not raw_results


def _load_codex_test_draft_templates() -> dict[str, dict[str, object]]:
    template_path = PROMPT_ROOT / "codex_test_drafts.json"
    if not template_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="缺少本地检查草稿模板：codex_test_drafts.json",
        )
    data = json.loads(template_path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="本地检查草稿模板格式无效。",
        )
    return data


def _test_draft(payload: dict[str, object]) -> str:
    domain = get_domain(payload.get("domain_key"))
    topic = str(payload.get("topic") or "未命名选题")
    platform = str(payload.get("platform") or "unknown")
    tone = _public_tone(payload.get("tone"))
    audience = str(payload.get("target_audience") or domain.default_audience)
    tags = _string_list(payload.get("tags"))
    knowledge_context = payload.get("knowledge_context")
    context_items = knowledge_context if isinstance(knowledge_context, list) else []
    context_titles = [
        str(item.get("title"))
        for item in context_items
        if isinstance(item, dict) and item.get("title")
    ][:3]
    web_search_context = payload.get("web_search_context")
    web_search_titles: list[str] = []
    if isinstance(web_search_context, dict):
        raw_results = web_search_context.get("results")
        if isinstance(raw_results, list):
            web_search_titles = [
                str(item.get("title"))
                for item in raw_results
                if isinstance(item, dict) and item.get("title")
            ][:3]
    tag_line = " ".join(f"#{tag}" for tag in tags) if tags else domain.default_tag_line
    is_water_ranking = is_water_ranking_topic_for(domain, topic, tags)
    topic_intent = first_matching_topic_intent_for(domain, topic, tags)
    missing_required_web_sources = _missing_required_web_sources(web_search_context)
    popular_posts = payload.get("popular_posts")
    popular_refs = popular_posts if isinstance(popular_posts, list) else []
    admission_notices = payload.get("admission_notices")
    notice_refs = admission_notices if isinstance(admission_notices, list) else []
    source_titles = [*context_titles, *web_search_titles]
    if source_titles:
        source_line = "、".join(source_titles)
    elif missing_required_web_sources:
        source_query = (
            str(web_search_context.get("query")).strip()
            if isinstance(web_search_context, dict) and web_search_context.get("query")
            else ""
        )
        source_line = f"缺可见 Tavily 来源（查询：{source_query}）" if source_query else "缺可见 Tavily 来源"
    else:
        source_line = "暂无知识库引用"
    branch_key = resolve_test_draft_branch(
        domain,
        platform,
        is_water_ranking,
        topic_intent,
        topic,
        missing_required_web_sources,
    )
    templates = _load_codex_test_draft_templates()
    branch = templates.get(branch_key)
    if not isinstance(branch, dict):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"本地检查草稿模板缺少分支：{branch_key}",
        )
    raw_body_lines = branch.get("body_lines")
    if not isinstance(raw_body_lines, list):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"本地检查草稿模板分支格式无效：{branch_key}",
        )

    water_ranking_source_line = (
        "👇当前没有可见 Tavily 来源时，就先做“榜单维度”和核验框架，不要让模型猜测学校名（这个会很亏）……"
        if missing_required_web_sources
        else "👇如果没有已核实的学校数据，就先做“榜单维度”，不要硬编学校名（这个会很亏）……"
    )

    # 根据 topic_intent 类型调整草稿策略：
    # - topic_intent.key == "source_check"：来源核验帖，它不是普通经验帖，而是来源核验帖，需要引用官方来源。
    # - topic_intent.key == "list_filter"：榜单/筛选类内容最重要的是维度清楚，不要硬编具体排名。
    intent_guidance = ""
    if topic_intent and topic_intent.key == "source_check":
        intent_guidance = "它不是普通经验帖，而是来源核验帖，必须引用官方来源清单。"
    elif topic_intent and topic_intent.key == "list_filter":
        intent_guidance = "榜单/筛选类内容最重要的是维度清楚，不要硬编具体排名。"

    body_lines = [
        str(line)
        .replace("{topic}", topic)
        .replace("{water_ranking_source_line}", water_ranking_source_line)
        for line in raw_body_lines
    ]

    # Build structure reference lines from popular posts
    structure_lines: list[str] = []
    if popular_refs:
        structure_lines.append("【高赞参考】")
        for idx, post in enumerate(popular_refs[:2], 1):
            if not isinstance(post, dict):
                continue
            likes = post.get("likes", 0)
            comments = post.get("comments", 0)
            favorites = post.get("favorites", 0)
            structure_lines.append(
                f"参考{idx}：{post.get('title', '')} "
                f"(赞{likes} 评{comments} 藏{favorites})"
            )
            preview = post.get("content_preview", "")
            if isinstance(preview, str) and preview:
                structure_lines.append(f"结构预览：{preview[:200]}")

    # Build admission notice reference lines
    notice_lines: list[str] = []
    if notice_refs:
        notice_lines.append("【招生通告参考】")
        for idx, notice in enumerate(notice_refs[:2], 1):
            if not isinstance(notice, dict):
                continue
            school = notice.get("school_name", "")
            title = notice.get("title", "")
            date = notice.get("publish_date", "")
            notice_lines.append(f"通告{idx}：{school} - {title} ({date})")
            summary = notice.get("summary", "")
            if summary:
                notice_lines.append(f"摘要：{summary[:150]}")

    word_count_hint = "内容约束：正文控制在200-500字以内，简洁有力，不要啰嗦。"

    return "\n".join(
        [
            f"【本地检查草稿】{topic}",
            "",
            f"面向：{audience}",
            f"平台：{platform}",
            f"语气：{tone}",
            "",
            *body_lines,
            f"参考上下文：{source_line}",
            *structure_lines,
            *notice_lines,
            f"话题标签：{tag_line}",
            "",
            word_count_hint,
            "风险提示：这是本地检查模式生成的草稿，只用于流程验证，正式发布前必须经过人工审核。",
            "内容约束：不要让模型猜测具体名字、价格、logo 或排名结论；涉及具体数据时必须引用已核验来源。",
            intent_guidance,
        ]
    )


def _test_review(payload: dict[str, object]) -> str:
    title = str(payload.get("title") or "未命名内容")
    platform = str(payload.get("platform") or "unknown")
    body = str(payload.get("body") or "")
    body_length = len(body)
    has_tags = bool(payload.get("tags"))
    instruction = str(payload.get("instruction") or "").strip()

    score = 78
    risk_flags: list[str] = []
    required_edits: list[str] = []

    if body_length < 200:
        risk_flags.append("正文过短")
        required_edits.append("补充正文内容至 300 字以上")
        score -= 10
    if not has_tags:
        required_edits.append("添加至少 3 个标签")
        score -= 5
    if platform == "xiaohongshu" and body_length > 2000:
        risk_flags.append("正文过长，小红书建议控制在 1000 字以内")
        required_edits.append("精简正文长度")
        score -= 8

    score = max(1, min(100, score))
    approval = "approved" if score >= 70 else "changes_requested"

    lines = [
        f"【本地检查审核】{title}",
        "",
        f"评分：{score}/100",
        f"风险标记：{', '.join(risk_flags) if risk_flags else '无'}",
        f"需要修改：{'; '.join(required_edits) if required_edits else '无'}",
        f"审核建议：{approval}",
        "",
        "风险提示：这是本地检查模式生成的审核结果，只用于流程验证，正式发布前必须经过人工审核。",
    ]
    if instruction:
        lines.insert(1, f"审核指令：{instruction}")
    return "\n".join(lines)


class ModelRouter:
    def embedding_model(self, text: str) -> list[float]:
        tokens = TOKEN_RE.findall(text.lower())
        dimensions = settings.embedding_dimensions
        vector = [0.0] * dimensions
        if not tokens:
            return vector

        for token in tokens:
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            bucket = int.from_bytes(digest[:4], "big") % dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[bucket] += sign

        magnitude = math.sqrt(sum(value * value for value in vector))
        if magnitude == 0:
            return vector
        return [value / magnitude for value in vector]

    def draft_model(self, prompt_name: str, payload: dict[str, object]) -> str:
        prompt_template = load_prompt(prompt_name)
        if settings.draft_provider == "codex_test":
            return _test_draft(payload)
        if settings.draft_provider == "openai_compatible":
            if not settings.openai_compatible_api_key:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="撰稿服务尚未配置服务授权。",
                )
            request_payload: dict[str, object] = {
                "model": settings.draft_model,
                "messages": _chat_messages(prompt_template, payload),
                "stream": False,
                "store": False,
                "temperature": settings.draft_temperature,
                "max_tokens": settings.draft_max_tokens,
            }
            data = _post_chat_completion(
                provider="OpenAI-compatible draft provider",
                base_url=settings.openai_compatible_base_url,
                api_key=settings.openai_compatible_api_key,
                timeout_seconds=settings.draft_timeout_seconds,
                payload=request_payload,
            )
            return _extract_chat_content("OpenAI-compatible draft provider", data)
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="撰稿服务尚未配置。",
        )

    def rewrite_model(self, prompt_name: str, payload: dict[str, object]) -> str:
        prompt_template = load_prompt(prompt_name)
        if not settings.deepseek_api_key:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="改写服务尚未配置。",
            )

        request_payload: dict[str, object] = {
            "model": settings.deepseek_rewrite_model,
            "messages": _deepseek_messages(prompt_template, payload),
            "thinking": {"type": "disabled"},
            "temperature": 0.7,
            "stream": False,
        }
        data = _post_chat_completion(
            provider="DeepSeek",
            base_url=settings.deepseek_base_url,
            api_key=settings.deepseek_api_key,
            timeout_seconds=settings.deepseek_timeout_seconds,
            payload=request_payload,
        )
        return _extract_chat_content("DeepSeek", data)

    def image_model(self, prompt_name: str, payload: dict[str, object]) -> str:
        prompt_template = load_prompt(prompt_name)
        if settings.image_provider == "codex_test":
            return _test_image(payload)
        if settings.image_provider == "openai_compatible":
            api_key = settings.image_openai_compatible_api_key or settings.openai_compatible_api_key
            if not api_key:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="图片服务尚未配置服务授权。",
                )
            base_url = (
                settings.image_openai_compatible_base_url
                or settings.openai_compatible_base_url
            )
            request_payload: dict[str, object] = {
                "model": settings.image_model,
                "prompt": _image_prompt(prompt_template, payload),
                "n": 1,
            }
            request_payload["size"] = _image_size(_resolved_aspect_ratio(payload))
            if settings.image_response_format:
                request_payload["response_format"] = settings.image_response_format
            data = _post_image_generation(
                provider="OpenAI-compatible image provider",
                base_url=base_url,
                api_key=api_key,
                timeout_seconds=settings.image_timeout_seconds,
                payload=request_payload,
            )
            return _extract_image_url(
                "OpenAI-compatible image provider",
                data,
                payload,
            )
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="图片服务尚未配置。",
        )

    def review_model(self, prompt_name: str, payload: dict[str, object]) -> str:
        prompt_template = load_prompt(prompt_name)
        if settings.review_provider == "codex_test":
            return _test_review(payload)
        if settings.review_provider == "openai_compatible":
            if not settings.openai_compatible_api_key:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="审核服务尚未配置服务授权。",
                )
            request_payload: dict[str, object] = {
                "model": settings.review_model,
                "messages": _chat_messages(prompt_template, payload),
                "stream": False,
                "store": False,
                "temperature": settings.review_temperature,
                "max_tokens": settings.review_max_tokens,
            }
            data = _post_chat_completion(
                provider="OpenAI-compatible review provider",
                base_url=settings.openai_compatible_base_url,
                api_key=settings.openai_compatible_api_key,
                timeout_seconds=settings.review_timeout_seconds,
                payload=request_payload,
            )
            return _extract_chat_content("OpenAI-compatible review provider", data)
        if settings.review_provider == "deepseek":
            if not settings.deepseek_api_key:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="审核服务尚未配置。",
                )
            request_payload = {
                "model": settings.deepseek_rewrite_model,
                "messages": _deepseek_messages(prompt_template, payload),
                "thinking": {"type": "disabled"},
                "temperature": settings.review_temperature,
                "stream": False,
            }
            data = _post_chat_completion(
                provider="DeepSeek",
                base_url=settings.deepseek_base_url,
                api_key=settings.deepseek_api_key,
                timeout_seconds=settings.review_timeout_seconds,
                payload=request_payload,
            )
            return _extract_chat_content("DeepSeek", data)
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="审核服务尚未配置。",
        )


model_router = ModelRouter()
