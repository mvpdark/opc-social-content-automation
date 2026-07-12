from datetime import datetime

from pydantic import BaseModel, Field


class TrendCollectRequest(BaseModel):
    platform: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    author: str | None = Field(default=None, max_length=120)
    publish_time: datetime | None = None
    url: str | None = Field(default=None, max_length=500)
    tags: list[str] = Field(default_factory=list)
    likes: int = Field(default=0, ge=0)
    favorites: int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    shares: int = Field(default=0, ge=0)
    cover_url: str | None = Field(default=None, max_length=500)
    video_transcript: str | None = None
    screenshot_url: str | None = Field(default=None, max_length=500)


class TrendCollectionJobCreate(BaseModel):
    platform: str = Field(pattern="^(xiaohongshu|douyin)$")
    keyword: str = Field(min_length=1, max_length=120)
    content_kind: str = Field(default="image_text", pattern="^(image_text|video|mixed)$")
    max_items: int = Field(default=20, ge=1, le=100)
    min_delay_seconds: int = Field(default=4, ge=2, le=60)
    max_delay_seconds: int = Field(default=12, ge=3, le=120)
    operator_wait_seconds: int = Field(default=30, ge=0, le=180)
    session_label: str | None = Field(default=None, max_length=120)
    persist_session: bool = True
    persist_cookies: bool = False


class TrendLinkImportRequest(BaseModel):
    raw_text: str = Field(min_length=1, max_length=4000)
    max_links: int = Field(default=10, ge=1, le=30)
    download_media: bool = False
    persist_cookies: bool = False


class TrendLinkCandidate(BaseModel):
    original_url: str
    normalized_url: str
    link_type: str
    accepted: bool
    requires_resolution: bool
    note_id: str | None = None
    reason: str | None = None


class TrendLinkImportTarget(BaseModel):
    platform: str
    extracted_count: int
    accepted_count: int
    import_mode: str
    download_media_enabled: bool
    cookie_persistence: bool
    links: list[TrendLinkCandidate]
    safety_notes: list[str]


class PlatformSearchTarget(BaseModel):
    platform: str
    keyword: str
    content_kind: str
    video_collection_enabled: bool
    search_url: str
    requires_manual_login: bool
    automation_mode: str
    safety_notes: list[str]


class TrendCollectionJobRead(BaseModel):
    id: int
    platform: str
    keyword: str
    status: str
    requested_by: int | None
    safety_profile: dict[str, object]
    result_summary: dict[str, object] | None
    error: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class KeywordAnalysisItem(BaseModel):
    keyword: str
    count: int
    platforms: list[str]


class TrendKnowledgeDigestRequest(BaseModel):
    platform: str | None = Field(default=None, pattern="^(xiaohongshu|douyin)$")
    keyword: str | None = Field(default=None, min_length=1, max_length=120)
    trend_ids: list[int] = Field(default_factory=list)
    limit: int = Field(default=20, ge=1, le=100)
    category: str = Field(default="trend-insight", max_length=80)
    source_reviewed: bool = False


class TrendKnowledgeDigestResponse(BaseModel):
    knowledge_id: int
    title: str
    category: str
    source_trend_ids: list[int]
    item_count: int
    content: str


class TrendRead(BaseModel):
    id: int
    platform: str
    title: str
    content: str
    author: str | None
    publish_time: datetime | None
    url: str | None
    tags: list[str] | None
    likes: int
    favorites: int
    comments: int
    shares: int
    cover_url: str | None
    video_transcript: str | None
    screenshot_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
