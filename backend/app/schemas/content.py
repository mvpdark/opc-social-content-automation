from datetime import datetime

from pydantic import BaseModel, Field


class ContentGenerateRequest(BaseModel):
    platform: str = Field(min_length=1, max_length=40)
    topic: str = Field(min_length=1, max_length=255)
    knowledge_query: str | None = Field(default=None, max_length=255)
    category: str | None = Field(default=None, max_length=80)
    tone: str | None = Field(default=None, max_length=420)
    target_audience: str | None = Field(default=None, max_length=120)
    knowledge_limit: int = Field(default=5, ge=0, le=20)
    tags: list[str] = Field(default_factory=list)


class ContentRewriteRequest(BaseModel):
    content_id: int
    instruction: str | None = Field(default=None, max_length=500)


class ContentCreate(BaseModel):
    platform: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)
    status: str = Field(default="draft", max_length=40)


class ContentRead(BaseModel):
    id: int
    user_id: int | None
    platform: str
    title: str
    body: str
    tags: list[str] | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
