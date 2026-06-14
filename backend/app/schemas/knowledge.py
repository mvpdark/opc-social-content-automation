from pydantic import BaseModel, Field


class KnowledgeUploadRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    category: str | None = Field(default=None, max_length=80)


class KnowledgeSearchResult(BaseModel):
    id: int
    title: str
    content: str
    category: str | None
    score: float | None = None
    match_type: str = "keyword"

    model_config = {"from_attributes": True}


class KnowledgeCompileRequest(BaseModel):
    force: bool = False
    source_limit: int = Field(default=120, ge=1, le=500)


class KnowledgeCompileResponse(BaseModel):
    item: KnowledgeSearchResult | None = None
    compiled: bool
    due: bool
    interval_hours: int
    source_count: int
    message: str


class KnowledgeCompileStatus(BaseModel):
    latest: KnowledgeSearchResult | None = None
    due: bool
    interval_hours: int
