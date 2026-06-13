import hashlib

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.content import Content
from app.models.generated_image import GeneratedImage
from app.models.user import User
from app.schemas.image import ImageGenerateRequest
from app.services.content_service import PromptPackage, record_generation_log
from app.services.model_router import load_platform_style_reference, load_prompt, model_router

IMAGE_GENERATABLE_STATUSES = {"draft", "rewritten", "review_pending", "approved"}

COVER_TEMPLATES = [
    {
        "id": "xiaohongshu-cover",
        "name": "Xiaohongshu cover",
        "platform": "xiaohongshu",
        "aspect_ratio": "3:4",
        "description": "Readable title-led cover for notes and carousel posts.",
    },
    {
        "id": "douyin-cover",
        "name": "Douyin cover",
        "platform": "douyin",
        "aspect_ratio": "9:16",
        "description": "Vertical video cover with strong headline hierarchy.",
    },
    {
        "id": "knowledge-card",
        "name": "Knowledge card",
        "platform": "multi",
        "aspect_ratio": "1:1",
        "description": "Square explainer card for reusable education assets.",
    },
]

COVER_VISUAL_DIRECTIONS = [
    {
        "id": "phone-proof-collage",
        "name": "手机截图拼贴",
        "instructions": (
            "Use a phone-native collage composition: one large tilted phone mockup, "
            "cropped chat/search/email fragments, bright white background, blue and "
            "red annotation strokes, and one bold headline block. No desk scene."
        ),
        "avoid": "sticky-note wall, laptop-on-desk scene, scrapbook checklist stack",
    },
    {
        "id": "dark-academic-blueprint",
        "name": "深色学术蓝图",
        "instructions": (
            "Use a dark navy academic blueprint look with grid lines, thin technical "
            "annotations, a highlighted research-route diagram, and cream/ice-blue "
            "headline typography. Professional and sharp, not cute."
        ),
        "avoid": "warm daylight desk, pastel sticky notes, playful stickers",
    },
    {
        "id": "editorial-magazine",
        "name": "杂志编辑封面",
        "instructions": (
            "Use an editorial magazine cover layout: strong asymmetric typography, "
            "one close-up object photo such as marked paper or a library card, generous "
            "white space, small rubric labels, and a restrained red accent."
        ),
        "avoid": "handwritten checklist chips, speech bubbles, crowded desk props",
    },
    {
        "id": "workflow-board",
        "name": "流程看板",
        "instructions": (
            "Use a clean workflow board: three vertical steps, arrows, progress bars, "
            "small check/cross decisions, and a headline that reads like a clear "
            "process warning. Use cool gray, green, and orange accents."
        ),
        "avoid": "single giant torn-paper label, decorative scrapbook style",
    },
    {
        "id": "library-research-mood",
        "name": "图书馆研究感",
        "instructions": (
            "Use a calm library research scene with bookshelves or reading table depth, "
            "one focused notebook page in the foreground, muted teal/burgundy accents, "
            "and quiet premium typography."
        ),
        "avoid": "pastel sticky-note board, cartoon stickers, oversized checklist chips",
    },
    {
        "id": "blackboard-annotation",
        "name": "黑板批注",
        "instructions": (
            "Use a chalkboard or marker-board concept: hand-drawn arrows, circled "
            "keywords, formula-like planning notes, and a high-contrast title. Make it "
            "feel like a senior advisor explaining a route."
        ),
        "avoid": "laptop email draft, notebook desk flat lay, coral/mint palette",
    },
    {
        "id": "minimal-type-poster",
        "name": "极简文字海报",
        "instructions": (
            "Use a minimal typography poster: no busy background, one strong headline, "
            "one small warning label, one abstract but concrete object silhouette such "
            "as paperclip, cursor, or folder tab. Premium Apple-like restraint."
        ),
        "avoid": "photo-realistic clutter, many props, sticker collage",
    },
    {
        "id": "soft-cute-notebook",
        "name": "软萌手账",
        "instructions": (
            "Use a soft cute notebook route with warm daylight, one notebook spread, "
            "limited stickers, rounded labels, and gentle pink/yellow accents. Keep it "
            "clean and do not reuse the same sticky-note checklist layout."
        ),
        "avoid": "overcrowded desk, giant torn-paper headline, repeated red underline formula",
    },
]


def list_cover_templates() -> list[dict[str, str]]:
    return COVER_TEMPLATES


def list_images(db: Session, content_id: int | None, limit: int) -> list[GeneratedImage]:
    statement = select(GeneratedImage).order_by(desc(GeneratedImage.created_at)).limit(limit)
    if content_id is not None:
        statement = statement.where(GeneratedImage.content_id == content_id)
    return list(db.scalars(statement).all())


def get_content_for_image(db: Session, content_id: int) -> Content:
    content = db.get(Content, content_id)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    if content.status not in IMAGE_GENERATABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="只有草稿、已改写、待审核或人工批准后的内容可以生成封面图。",
        )
    return content


def _next_visual_variant_index(db: Session, content_id: int) -> int:
    if not hasattr(db, "scalars"):
        return 0
    statement = select(GeneratedImage.id).where(GeneratedImage.content_id == content_id)
    return len(list(db.scalars(statement).all()))


def select_cover_visual_direction(
    content: Content,
    template_id: str,
    variant_index: int = 0,
) -> dict[str, str]:
    source = "|".join(
        [
            str(content.id or ""),
            content.platform or "",
            content.title or "",
            content.body or "",
            template_id,
        ]
    )
    digest = hashlib.sha256(source.encode("utf-8")).hexdigest()
    start_index = int(digest[:8], 16) % len(COVER_VISUAL_DIRECTIONS)
    index = (start_index + variant_index) % len(COVER_VISUAL_DIRECTIONS)
    return COVER_VISUAL_DIRECTIONS[index]


def build_image_prompt_package(
    content: Content,
    payload: ImageGenerateRequest,
    current_user: User,
    variant_index: int = 0,
) -> PromptPackage:
    template = next(
        (item for item in COVER_TEMPLATES if item["id"] == payload.template),
        None,
    )
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="未识别的封面模板。",
        )

    return PromptPackage(
        prompt_name="image_generation",
        prompt_template=load_prompt("image_generation"),
        payload={
            "content_id": content.id,
            "platform": content.platform,
            "title": content.title,
            "body": content.body,
            "tags": content.tags or [],
            "content_status": content.status,
            "template": template,
            "aspect_ratio": payload.aspect_ratio,
            "style_notes": payload.style_notes,
            "visual_direction": select_cover_visual_direction(
                content=content,
                template_id=payload.template,
                variant_index=variant_index,
            ),
            "style_reference": load_platform_style_reference(content.platform),
            "user": {
                "id": current_user.id,
                "role": current_user.role,
            },
        },
    )


def generate_image_asset(
    db: Session,
    payload: ImageGenerateRequest,
    current_user: User,
) -> GeneratedImage:
    content = get_content_for_image(db, payload.content_id)
    package = build_image_prompt_package(
        content,
        payload,
        current_user,
        variant_index=_next_visual_variant_index(db, content.id),
    )
    try:
        image_url = model_router.image_model(package.prompt_name, package.payload)
    except HTTPException as exc:
        record_generation_log(
            db=db,
            current_user=current_user,
            purpose="image_generation",
            model="image_model",
            package=package,
            result="",
            status="provider_not_configured",
            error=str(exc.detail),
        )
        raise

    image = GeneratedImage(
        content_id=content.id,
        created_by=current_user.id,
        image_url=image_url,
        template=payload.template,
        prompt=package.to_log_text(),
        status="generated" if content.status == "approved" else "needs_review",
    )
    db.add(image)
    db.flush()
    record_generation_log(
        db=db,
        current_user=current_user,
        purpose="image_generation",
        model="image_model",
        package=package,
        result=image_url,
        status="success",
    )
    db.refresh(image)
    return image
