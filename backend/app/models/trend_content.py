from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class TrendContent(Base):
    __tablename__ = "trend_contents"
    __table_args__ = (
        UniqueConstraint("url", "user_id", name="uq_trend_url_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    platform: Mapped[str] = mapped_column(String(40), index=True)
    author: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    publish_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    favorites: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    cover_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    video_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    screenshot_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
