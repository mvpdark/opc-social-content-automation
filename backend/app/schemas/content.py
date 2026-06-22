from datetime import datetime

from pydantic import BaseModel, Field


class ContentGenerateRequest(BaseModel):
    platform: str = Field(min_length=1, max_length=40)
    topic: str = Field(min_length=1, max_length=255)
    knowledge_query: str | None = Field(default=None, max_length=255)
    category: str | None = Field(default=None, max_length=80)
    tone: str | None = Field(default=None, max_length=900)
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
    source_context: dict[str, object] | None = None
    status: str
    task_state: str | None = None
    task_state_updated_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskStateRead(BaseModel):
    """任务状态查询响应（BACKLOG #14）。"""

    content_id: int
    task_state: str
    task_state_label: str
    allowed_next_states: list[str]


class TaskStateTransitionRequest(BaseModel):
    """任务状态手动转换请求（BACKLOG #14）。"""

    to_state: str = Field(min_length=1, max_length=32)


class ContentSourcePreviewRead(BaseModel):
    source_context: dict[str, object]
