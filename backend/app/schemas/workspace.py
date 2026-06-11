from datetime import datetime

from pydantic import BaseModel, Field


class ExportRequest(BaseModel):
    content_ids: list[int] = Field(default_factory=list)
    format: str = Field(default="markdown", pattern="^(markdown|json|plain)$")


class ExportItem(BaseModel):
    id: int
    platform: str
    title: str
    body: str
    tags: list[str] | None


class ExportResponse(BaseModel):
    format: str
    status: str
    content_ids: list[int]
    items: list[ExportItem]
    payload: str


class PublishRecordCreate(BaseModel):
    content_id: int
    platform: str = Field(min_length=1, max_length=40)
    external_url: str | None = Field(default=None, max_length=500)
    status: str = Field(default="published", pattern="^published$")


class PublishRecordRead(BaseModel):
    id: int
    content_id: int
    user_id: int | None
    platform: str
    external_url: str | None
    status: str

    model_config = {"from_attributes": True}


class WorkspaceContentItem(BaseModel):
    id: int
    platform: str
    title: str
    tags: list[str] | None
    status: str


class ProviderStatusItem(BaseModel):
    name: str
    provider: str
    model: str | None
    configured: bool
    status: str
    note: str


class ProviderKeyUpdateRequest(BaseModel):
    draft_api_key: str | None = Field(default=None, max_length=500)
    image_api_key: str | None = Field(default=None, max_length=500)
    deepseek_api_key: str | None = Field(default=None, max_length=500)


class DependencyStatusItem(BaseModel):
    name: str
    category: str
    required: bool
    status: str
    detected: str | None
    minimum: str | None
    message: str
    fix: str | None


class DependencyReport(BaseModel):
    generated_at: datetime
    status: str
    summary: dict[str, int]
    items: list[DependencyStatusItem]
    repair_steps: list[str]
