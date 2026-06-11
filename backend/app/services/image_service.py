from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.content import Content
from app.models.generated_image import GeneratedImage
from app.models.user import User
from app.schemas.image import ImageGenerateRequest
from app.services.content_service import PromptPackage, record_generation_log
from app.services.model_router import load_platform_style_reference, load_prompt, model_router


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
            detail="Content was not found.",
        )
    if content.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only human-approved content can be used for image generation.",
        )
    return content


def build_image_prompt_package(
    content: Content,
    payload: ImageGenerateRequest,
    current_user: User,
) -> PromptPackage:
    template = next(
        (item for item in COVER_TEMPLATES if item["id"] == payload.template),
        None,
    )
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Unknown image template.",
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
    package = build_image_prompt_package(content, payload, current_user)
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
        status="generated",
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
