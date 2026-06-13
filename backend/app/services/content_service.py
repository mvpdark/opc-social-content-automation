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
from app.services.knowledge_service import search_knowledge_items
from app.services.model_router import load_platform_style_reference, load_prompt, model_router
from app.services.web_search_service import build_live_web_search_context


WATER_ROUTE_TOPIC_TERMS = ("水博", "海外博士", "境外博士")
RANKING_TOPIC_TERMS = ("排名", "排行", "榜", "榜单", "必看")
RANKING_DRAFT_TERMS = (
    "排名",
    "排行",
    "榜",
    "榜单",
    "梯队",
    "学校池",
    "项目池",
    "路线池",
    "清单",
    "认证",
    "预算",
    "毕业难度",
)
ROUTE_TOPIC_TERMS = ("路线", "怎么选", "选择", "路径")
ROUTE_DRAFT_TERMS = ("路线", "路径", "选择", "适配", "判断", "对比", "方案")
MENTOR_TOPIC_TERMS = ("导师", "匹配", "套磁")
MENTOR_DRAFT_TERMS = ("导师", "匹配", "研究方向", "论文", "课题", "成果", "套磁", "邮件")
TIMELINE_TOPIC_TERMS = ("时间线", "时间节点", "时间怎么排", "什么时候")
TIMELINE_DRAFT_TERMS = ("时间线", "时间节点", "阶段", "提前", "月份", "DDL", "安排", "节奏")
SALES_TOPIC_TERMS = ("咨询", "转化", "上班族", "私域", "获客")
SALES_DRAFT_TERMS = ("咨询", "需求", "预算", "适配", "沟通", "话术", "转化", "项目")


@dataclass(frozen=True)
class TopicIntentRule:
    topic_terms: tuple[str, ...]
    draft_terms: tuple[str, ...]
    label: str
    guidance: str


TOPIC_INTENT_RULES = (
    TopicIntentRule(
        topic_terms=ROUTE_TOPIC_TERMS,
        draft_terms=ROUTE_DRAFT_TERMS,
        label="路线/选择",
        guidance="请围绕路线对比、选择标准、适配人群和判断步骤展开。",
    ),
    TopicIntentRule(
        topic_terms=MENTOR_TOPIC_TERMS,
        draft_terms=MENTOR_DRAFT_TERMS,
        label="导师匹配",
        guidance="请围绕研究方向、导师成果、论文/课题交集和套磁前准备展开。",
    ),
    TopicIntentRule(
        topic_terms=TIMELINE_TOPIC_TERMS,
        draft_terms=TIMELINE_DRAFT_TERMS,
        label="时间安排",
        guidance="请围绕申请阶段、时间节点、提前准备和执行节奏展开。",
    ),
    TopicIntentRule(
        topic_terms=SALES_TOPIC_TERMS,
        draft_terms=SALES_DRAFT_TERMS,
        label="咨询转化",
        guidance="请围绕用户需求、预算、项目适配、沟通话术和转化路径展开。",
    ),
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
    return [
        {
            "id": item.id,
            "title": item.title,
            "category": item.category,
            "content": item.content,
            "score": item.score,
            "match_type": item.match_type,
        }
        for item in results
    ]


def _contains_any(text: str, terms: tuple[str, ...]) -> bool:
    normalized = text.lower()
    return any(term.lower() in normalized for term in terms)


def _is_water_ranking_topic(payload: ContentGenerateRequest) -> bool:
    topic_text = " ".join([payload.topic, *(payload.tags or [])])
    return _contains_any(topic_text, WATER_ROUTE_TOPIC_TERMS) and _contains_any(
        payload.topic,
        RANKING_TOPIC_TERMS,
    )


def _draft_topic_relevance_issue(payload: ContentGenerateRequest, draft: str) -> str | None:
    if not _is_water_ranking_topic(payload):
        topic_text = " ".join([payload.topic, *(payload.tags or [])])
        for rule in TOPIC_INTENT_RULES:
            if _contains_any(topic_text, rule.topic_terms) and not _contains_any(
                draft,
                rule.draft_terms,
            ):
                return (
                    f"撰稿结果偏离选题：当前选题是“{payload.topic}”，但草稿没有围绕{rule.label}展开。"
                    f"{rule.guidance}"
                )
        return None

    has_route_term = _contains_any(draft, WATER_ROUTE_TOPIC_TERMS)
    has_ranking_structure = _contains_any(draft, RANKING_DRAFT_TERMS)
    if has_route_term and has_ranking_structure:
        return None

    return (
        f"撰稿结果偏离选题：当前选题是“{payload.topic}”，但草稿没有围绕水博榜单/排名展开。"
        "请补充已核实的学校或项目资料后重试，或改成认证、预算、毕业难度、在职适配等榜单维度。"
    )


def build_draft_prompt_package(
    db: Session,
    payload: ContentGenerateRequest,
    current_user: User,
) -> PromptPackage:
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
            "knowledge_context": _knowledge_context(db, payload),
            "web_search_context": build_live_web_search_context(
                platform=payload.platform,
                topic=payload.topic,
                tags=payload.tags,
            ),
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
