from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class GeneratedImage(Base):
    __tablename__ = "generated_images"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    content_id: Mapped[int | None] = mapped_column(ForeignKey("contents.id"), index=True, nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    image_url: Mapped[str] = mapped_column(String(500))
    template: Mapped[str | None] = mapped_column(String(120), nullable=True)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="generated", index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    content = relationship("Content", back_populates="generated_images")
    creator = relationship("User")
