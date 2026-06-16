import json
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.content import Content
from app.models.content_review import ContentReview
from app.models.generated_image import GeneratedImage
from app.models.generation_log import GenerationLog
from app.models.publish_record import PublishRecord
from app.models.user import User
from app.schemas.content import ContentGenerateRequest, ContentRewriteRequest
from app.services.knowledge_service import latest_knowledge_compilation, search_knowledge_items
from app.services.model_router import load_platform_style_reference, load_prompt, model_router
from app.services.topic_intent import (
    RANKING_DRAFT_TERMS,
    WATER_ROUTE_TOPIC_TERMS,
    contains_any,
    first_matching_topic_intent,
    is_water_ranking_topic,
)
from app.services.web_search_service import (
    build_live_web_search_context,
    build_tavily_query,
    topic_needs_live_web_search,
)


SOURCE_CONTEXT_EXCERPT_LENGTH = 420
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


def _source_excerpt(value: object, max_length: int = SOURCE_CONTEXT_EXCERPT_LENGTH) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= max_length:
        return text
    return f"{text[:max_length].rstrip()}..."


def _knowledge_context(
    db: Session,
    payload: ContentGenerateRequest,
) -> list[dict[str, object]]:
    query = payload.knowledge_query or payload.topic
    if payload.knowledge_limit == 0:
        return []

    results = search_knowledge_items(
        db=db,
        query=query,
        category=payload.category,
        limit=payload.knowledge_limit,
        mode="hybrid",
    )
    compiled = latest_knowledge_compilation(db)
    merged_results = []
    if compiled is not None:
        merged_results.append(compiled)
    merged_results.extend(item for item in results if compiled is None or item.id != compiled.id)
    return [
        {
            "id": item.id,
            "title": item.title,
            "category": item.category,
            "content": item.content,
            "score": item.score,
            "match_type": item.match_type,
        }
        for item in merged_results[: payload.knowledge_limit]
    ]


def _public_source_context(
    payload: ContentGenerateRequest,
    knowledge_context: list[dict[str, object]],
    web_search_context: dict[str, object] | None,
) -> dict[str, object]:
    web_search_required = topic_needs_live_web_search(payload.topic, payload.tags)
    web_results: list[dict[str, object]] = []
    if isinstance(web_search_context, dict):
        raw_results = web_search_context.get("results")
        if isinstance(raw_results, list):
            for raw_result in raw_results:
                if not isinstance(raw_result, dict):
                    continue
                web_results.append(
                    {
                        "title": _source_excerpt(raw_result.get("title"), 160),
                        "url": _source_excerpt(raw_result.get("url"), 600),
                        "content": _source_excerpt(raw_result.get("content")),
                        "score": raw_result.get("score"),
                    }
                )
    review_note = (
        "这些是本次生成可见的检索依据。需要排名、学校、logo、学费或认证时，"
        "请先人工核对来源，再复制到平台发布。"
    )
    if web_search_required and not web_results:
        review_note = (
            "这个选题需要实时来源，但本次没有可见 Tavily 结果；请先检查 Tavily 配置、"
            "换更具体关键词，或只输出维度框架，不能编学校、价格、logo 或排名。"
        )

    return {
        "knowledge_query": payload.knowledge_query or payload.topic,
        "knowledge_items": [
            {
                "id": item["id"],
                "title": _source_excerpt(item.get("title"), 160),
                "category": item.get("category"),
                "content": _source_excerpt(item.get("content")),
                "score": item.get("score"),
                "match_type": item.get("match_type"),
            }
            for item in knowledge_context
        ],
        "web_search": {
            "required": web_search_required,
            "provider": (
                web_search_context.get("provider")
                if isinstance(web_search_context, dict)
                else None
            ),
            "query": (
                web_search_context.get("query")
                if isinstance(web_search_context, dict)
                else build_tavily_query(payload.topic, payload.platform, payload.tags)
                if web_search_required
                else None
            ),
            "answer": (
                _source_excerpt(web_search_context.get("answer"), 700)
                if isinstance(web_search_context, dict) and web_search_context.get("answer")
                else None
            ),
            "results": web_results,
        },
        "review_note": review_note,
    }


def build_content_source_context(
    db: Session,
    payload: ContentGenerateRequest,
) -> dict[str, object]:
    knowledge_context = _knowledge_context(db, payload)
    web_search_context = build_live_web_search_context(
        platform=payload.platform,
        topic=payload.topic,
        tags=payload.tags,
    )
    return _public_source_context(payload, knowledge_context, web_search_context)


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
    return is_water_ranking_topic(payload.topic, payload.tags)


def _draft_topic_relevance_issue(payload: ContentGenerateRequest, draft: str) -> str | None:
    if not _is_water_ranking_topic(payload):
        rule = first_matching_topic_intent(payload.topic, payload.tags)
        if rule and not contains_any(draft, rule.draft_terms):
            return (
                f"撰稿结果偏离选题：当前选题是“{payload.topic}”，但草稿没有围绕{rule.label}展开。"
                f"{rule.guidance}"
            )
        return None

    has_route_term = contains_any(draft, WATER_ROUTE_TOPIC_TERMS)
    has_ranking_structure = contains_any(draft, RANKING_DRAFT_TERMS)
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


def build_draft_prompt_package(
    db: Session,
    payload: ContentGenerateRequest,
    current_user: User,
) -> PromptPackage:
    knowledge_context = _knowledge_context(db, payload)
    web_search_context = build_live_web_search_context(
        platform=payload.platform,
        topic=payload.topic,
        tags=payload.tags,
    )
    source_context = _public_source_context(payload, knowledge_context, web_search_context)
    return PromptPackage(
        prompt_name="draft_generation",
        prompt_template=load_prompt("draft_generation"),
        payload={
            "platform": payload.platform,
            "topic": payload.topic,
            "tags": payload.tags,
            "tone": payload.tone,
            "target_audience": payload.target_audience,
            "knowledge_query": payload.knowledge_query,
            "knowledge_context": knowledge_context,
            "web_search_context": _prompt_web_search_context(source_context, web_search_context),
            "source_context": source_context,
            "style_reference": load_platform_style_reference(payload.platform),
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
    return PromptPackage(
        prompt_name="humanization",
        prompt_template=load_prompt("humanization"),
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


def record_generation_log(
    db: Session,
    current_user: User,
    purpose: str,
    model: str,
    package: PromptPackage,
    result: str,
    status: str,
    error: str | None = None,
) -> GenerationLog:
    log = GenerationLog(
        user_id=current_user.id,
        purpose=purpose,
        model=model,
        prompt=package.to_log_text(),
        result=result,
        status=status,
        error=error,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def generate_content_draft(
    db: Session,
    payload: ContentGenerateRequest,
    current_user: User,
) -> Content:
    package = build_draft_prompt_package(db, payload, current_user)
    try:
        draft = model_router.draft_model(package.prompt_name, package.payload)
    except HTTPException as exc:
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="draft_generation",
            model="draft_model",
            package=package,
            result="",
            status="provider_not_configured",
            error=str(exc.detail),
        )
        raise

    schema_issue = _draft_output_schema_issue(draft)
    if schema_issue is None and isinstance(draft, str):
        schema_issue = _draft_metadata_section_issue(draft)
    if schema_issue is None and isinstance(draft, str):
        schema_issue = _draft_hashtag_line_issue(draft)
    if schema_issue:
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="draft_generation",
            model="draft_model",
            package=package,
            result=draft if isinstance(draft, str) else "",
            status="schema_invalid",
            error=schema_issue,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=schema_issue,
        )

    relevance_issue = _draft_topic_relevance_issue(payload, draft)
    if relevance_issue:
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="draft_generation",
            model="draft_model",
            package=package,
            result=draft,
            status="topic_mismatch",
            error=relevance_issue,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=relevance_issue,
        )

    content = Content(
        user_id=current_user.id,
        platform=payload.platform,
        title=payload.topic,
        body=draft,
        tags=payload.tags,
        source_context=package.payload.get("source_context")
        if isinstance(package.payload.get("source_context"), dict)
        else None,
        status="draft",
    )
    db.add(content)
    db.flush()
    record_generation_log(
        db=db,
        current_user=current_user,
        purpose="draft_generation",
        model="draft_model",
        package=package,
        result=draft,
        status="success",
    )
    db.refresh(content)
    return content


def rewrite_content_body(
    db: Session,
    content: Content,
    payload: ContentRewriteRequest,
    current_user: User,
) -> Content:
    package = build_rewrite_prompt_package(content, payload, current_user)
    try:
        rewritten = model_router.rewrite_model(package.prompt_name, package.payload)
    except HTTPException as exc:
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="humanization",
            model="rewrite_model",
            package=package,
            result="",
            status="provider_not_configured",
            error=str(exc.detail),
        )
        raise

    content.body = rewritten
    content.status = "rewritten"
    db.commit()
    db.refresh(content)
    record_generation_log(
        db=db,
        current_user=current_user,
        purpose="humanization",
        model="rewrite_model",
        package=package,
        result=rewritten,
        status="success",
    )
    return content


def delete_content_with_assets(db: Session, content_id: int) -> None:
    content = db.get(Content, content_id)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )

    for model in (GeneratedImage, ContentReview, PublishRecord):
        for item in db.query(model).filter(model.content_id == content_id).all():
            db.delete(item)

    db.delete(content)
    db.commit()
