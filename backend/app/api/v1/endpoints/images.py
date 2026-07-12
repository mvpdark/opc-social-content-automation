from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.content import Content
from app.models.generated_image import GeneratedImage
from app.models.user import User
from app.schemas.image import ImageGenerateRequest, ImageRead, ImageTemplateRead
from app.services.image_service import (
    generate_image_asset,
    list_cover_templates,
    list_images,
)

router = APIRouter()


@router.post("/generate", response_model=ImageRead)
def generate_image(
    payload: ImageGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImageRead:
    image = generate_image_asset(db, payload, current_user)
    return ImageRead.model_validate(image)


@router.get("/templates", response_model=list[ImageTemplateRead])
def get_image_templates(
    current_user: User = Depends(get_current_user),
) -> list[ImageTemplateRead]:
    return [ImageTemplateRead(**item) for item in list_cover_templates()]


@router.get("/list", response_model=list[ImageRead])
def get_images(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    content_id: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[ImageRead]:
    return [
        ImageRead.model_validate(image)
        for image in list_images(db=db, content_id=content_id, limit=limit, user_id=current_user.id)
    ]


@router.get("/{image_id}", response_model=ImageRead)
def get_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImageRead:
    image = db.get(GeneratedImage, image_id)
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这张封面图。",
        )
    # Verify ownership consistent with list_images (OR logic): an image is
    # accessible if its content belongs to this user OR it was created by
    # this user. Previously get_image only checked content ownership when
    # content_id was valid, diverging from list_images which also accepts
    # created_by == user_id (BUG-2).
    has_access = False
    if image.content_id is not None and image.content_id > 0:
        content = db.get(Content, image.content_id)
        if content is not None and content.user_id == current_user.id:
            has_access = True
    if not has_access and image.created_by == current_user.id:
        has_access = True
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这张封面图。",
        )
    return ImageRead.model_validate(image)
