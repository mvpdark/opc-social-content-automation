from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def _connect_args() -> dict[str, object]:
    if settings.is_postgresql:
        return {"connect_timeout": settings.database_connect_timeout_seconds}
    if settings.is_sqlite:
        return {"check_same_thread": False}
    return {}


def _ensure_sqlite_parent() -> None:
    if not settings.is_sqlite:
        return

    database_path = make_url(settings.database_url).database
    if not database_path or database_path == ":memory:":
        return

    Path(database_path).parent.mkdir(parents=True, exist_ok=True)


_ensure_sqlite_parent()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args=_connect_args(),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def initialize_local_database() -> None:
    if not settings.is_sqlite:
        return

    from app.db.base import Base

    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_additive_columns()


def _ensure_sqlite_additive_columns() -> None:
    """SQLite 模式下自动补齐新增列。新增列时只需在 SQLITE_ADDITIVE_COLUMNS 里加一行。"""
    inspector = inspect(engine)

    # 格式: (表名, 列名, DDL 类型定义)
    SQLITE_ADDITIVE_COLUMNS: list[tuple[str, str, str]] = [
        ("trend_contents", "cover_url", "VARCHAR(500)"),
        ("knowledge_base", "embedding_dirty", "BOOLEAN DEFAULT 1"),
    ]

    existing_tables = set(inspector.get_table_names())
    for table_name, column_name, column_type in SQLITE_ADDITIVE_COLUMNS:
        if table_name not in existing_tables:
            continue
        existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
        if column_name not in existing_columns:
            with engine.begin() as connection:
                connection.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
                )


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as db:
        yield db
