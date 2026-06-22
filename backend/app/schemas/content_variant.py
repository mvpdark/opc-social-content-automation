from datetime import datetime

from pydantic import BaseModel, Field, field_validator


SUPPORTED_VARIANT_TYPES = ("title", "opening", "cover_tags")


class VariantGenerateRequest(BaseModel):
    """变体生成请求。"""

    content_id: int
    variant_count: int = Field(default=3, ge=2, le=5)
    variant_types: list[str] = Field(default_factory=lambda: list(SUPPORTED_VARIANT_TYPES))

    @field_validator("variant_types")
    @classmethod
    def _validate_variant_types(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("variant_types 不能为空。")
        normalized: list[str] = []
        for item in value:
            if item not in SUPPORTED_VARIANT_TYPES:
                raise ValueError(
                    f"不支持的变体类型：{item}，仅支持 {', '.join(SUPPORTED_VARIANT_TYPES)}。"
                )
            if item not in normalized:
                normalized.append(item)
        return normalized


class ContentVariantRead(BaseModel):
    id: int
    content_id: int
    variant_type: str
    variant_text: str
    score: float
    selected: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class VariantGenerateResponse(BaseModel):
    """变体生成响应，按类型分组返回。"""

    content_id: int
    variants: list[ContentVariantRead]


class VariantSelectResponse(BaseModel):
    """变体选择响应。"""

    id: int
    content_id: int
    variant_type: str
    variant_text: str
    score: float
    selected: bool

    model_config = {"from_attributes": True}
