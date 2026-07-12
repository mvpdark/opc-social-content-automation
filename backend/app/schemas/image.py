from datetime import datetime

from pydantic import BaseModel, Field


class ImageGenerateRequest(BaseModel):
    content_id: int
    template: str = Field(default="xiaohongshu-cover", max_length=120)
    aspect_ratio: str = Field(default="3:4", max_length=20)
    style_notes: str | None = Field(default=None, max_length=500)


class ImageTemplateRead(BaseModel):
    id: str
    name: str
    platform: str
    aspect_ratio: str
    description: str


class ImageRead(BaseModel):
    id: int
    content_id: int | None
    created_by: int | None
    image_url: str
    template: str | None
    prompt: str | None
    status: str
    error: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
