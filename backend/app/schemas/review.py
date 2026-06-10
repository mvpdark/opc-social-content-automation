from datetime import datetime

from pydantic import BaseModel, Field


class ContentReviewRequest(BaseModel):
    decision: str = Field(pattern="^(approved|rejected|changes_requested)$")
    score: int = Field(ge=1, le=100)
    notes: str | None = None
    risk_flags: list[str] = Field(default_factory=list)


class ContentAiReviewRequest(BaseModel):
    instruction: str | None = Field(default=None, max_length=500)


class ContentReviewRead(BaseModel):
    id: int
    content_id: int
    reviewer_id: int | None
    review_type: str
    status: str
    score: int | None
    notes: str | None
    risk_flags: list[str] | None
    created_at: datetime

    model_config = {"from_attributes": True}
