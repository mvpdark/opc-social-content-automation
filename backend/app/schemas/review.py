from datetime import datetime

from pydantic import BaseModel, Field

__all__ = [
    "ContentReviewRequest",
    "ContentAiReviewRequest",
    "ContentReviewRead",
    "FeedbackStatsRead",
    "FEEDBACK_CATEGORIES",
    "FEEDBACK_PRESET_TAGS",
    "VALID_FEEDBACK_CATEGORIES",
]


# 预设反馈分类。
FEEDBACK_CATEGORIES: tuple[str, ...] = (
    "tone",
    "accuracy",
    "structure",
    "engagement",
    "compliance",
)

# 各分类下的预设标签。
FEEDBACK_PRESET_TAGS: dict[str, tuple[str, ...]] = {
    "tone": ("语气太正式", "语气太随意", "缺少亲和力", "过度营销"),
    "accuracy": ("事实错误", "数据未核验", "来源缺失", "过度概括"),
    "structure": ("开头不够吸引", "结构混乱", "结尾太弱", "缺少行动指引"),
    "engagement": ("标题不够吸睛", "缺少互动引导", "标签不精准", "封面方向不对"),
    "compliance": ("敏感词", "夸大宣传", "版权风险", "平台违规"),
}

VALID_FEEDBACK_CATEGORIES = frozenset(FEEDBACK_CATEGORIES)


class ContentReviewRequest(BaseModel):
    decision: str = Field(pattern="^(approved|rejected|changes_requested)$")
    score: int = Field(ge=1, le=100)
    notes: str | None = None
    risk_flags: list[str] = Field(default_factory=list)
    feedback_tags: list[str] | None = None
    feedback_category: str | None = Field(default=None, max_length=40)


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
    feedback_tags: list[str] | None
    feedback_category: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackCategoryStats(BaseModel):
    """单个分类的标签使用统计。"""

    category: str
    total: int
    tags: dict[str, int]


class FeedbackStatsRead(BaseModel):
    """反馈标签统计响应（SSB-8）。"""

    total_reviews: int
    categories: list[FeedbackCategoryStats]
    preset_tags: dict[str, list[str]] = Field(
        default_factory=lambda: {
            category: list(tags) for category, tags in FEEDBACK_PRESET_TAGS.items()
        }
    )
