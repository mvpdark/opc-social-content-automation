from sqlalchemy import JSON, Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.models.base import Base

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    if settings.is_postgresql:
        raise RuntimeError(
            "PostgreSQL 模式需要安装 pgvector: pip install pgvector"
        )
    Vector = None


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    content: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    embedding: Mapped[list[float] | None] = mapped_column(
        JSON if settings.is_sqlite else Vector(settings.embedding_dimensions),
        nullable=True,
    )
    # 标记 embedding 是否需要重新计算（内容变更后置为 True）
    embedding_dirty: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="1", default=True
    )
