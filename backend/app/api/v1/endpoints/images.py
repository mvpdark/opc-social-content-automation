from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
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
def get_image_templates() -> list[ImageTemplateRead]:
    return [ImageTemplateRead(**item) for item in list_cover_templates()]


@router.get("/list", response_model=list[ImageRead])
def get_images(
    db: Session = Depends(get_db),
    content_id: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[ImageRead]:
    return [
        ImageRead.model_validate(image)
        for image in list_images(db=db, content_id=content_id, limit=limit)
    ]


@router.get("/{image_id}", response_model=ImageRead)
def get_image(image_id: int, db: Session = Depends(get_db)) -> ImageRead:
    image = db.get(GeneratedImage, image_id)
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这张封面图。",
        )
    return ImageRead.model_validate(image)
