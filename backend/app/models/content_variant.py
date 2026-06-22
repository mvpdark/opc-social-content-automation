from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ContentVariant(Base):
    """内容变体：标题/开头/封面标签的多个候选版本及其评分。

    用于 SSB-7 变体与草稿评分功能，运营者可从多个变体中选择最佳版本。
    """

    __tablename__ = "content_variants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    content_id: Mapped[int] = mapped_column(ForeignKey("contents.id"), index=True)
    variant_type: Mapped[str] = mapped_column(String(40), index=True)
    variant_text: Mapped[str] = mapped_column(Text)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    selected: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    content = relationship("Content", back_populates="variants")
