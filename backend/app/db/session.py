import logging
import re
from collections.abc import Generator
from pathlib import Path

import sqlalchemy
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)

# Whitelist pattern: only alphanumeric characters and underscores
_IDENTIFIER_RE = re.compile(r"^\w+$")
_COLUMN_TYPE_RE = re.compile(r"^(VARCHAR\(\d+\)(?:\s+DEFAULT\s+\'[^\']*\')?|TEXT|BOOLEAN DEFAULT [01]|DATETIME|INTEGER|JSON|REAL)$")


def _validate_identifier(name: str, label: str) -> str:
    """Validate that a SQL identifier (table/column name) only contains
    alphanumeric characters and underscores to prevent SQL injection."""
    if not isinstance(name, str) or not _IDENTIFIER_RE.match(name):
        raise ValueError(f"Invalid {label}: {name!r}")
    return name


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


# Enable WAL journal mode for SQLite to allow concurrent readers during writes,
# reducing "database is locked" errors under concurrent request load.
@event.listens_for(engine, "connect")
def _set_sqlite_wal(dbapi_connection, connection_record) -> None:
    if engine.url.get_backend_name() == "sqlite":
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
        except (sqlalchemy.OperationalError, OSError):
            logger.warning("Failed to set WAL journal mode", exc_info=True)
        finally:
            cursor.close()


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
        ("content_reviews", "feedback_tags", "JSON"),
        ("content_reviews", "feedback_category", "VARCHAR(40)"),
        ("contents", "task_state", "VARCHAR(32)"),
        ("contents", "task_state_updated_at", "DATETIME"),
        # Migration 0004: generation_logs additions
        ("generation_logs", "purpose", "VARCHAR(40)"),
        ("generation_logs", "status", "VARCHAR(40)"),
        ("generation_logs", "error", "TEXT"),
        # Migration 0006: generated_images additions
        ("generated_images", "created_by", "INTEGER"),
        ("generated_images", "template", "VARCHAR(100)"),
        ("generated_images", "prompt", "TEXT"),
        ("generated_images", "status", "VARCHAR(40) DEFAULT 'generated'"),
        ("generated_images", "error", "TEXT"),
    ]

    existing_tables = set(inspector.get_table_names())
    for table_name, column_name, column_type in SQLITE_ADDITIVE_COLUMNS:
        if table_name not in existing_tables:
            continue
        existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
        if column_name not in existing_columns:
            _validate_identifier(table_name, "table_name")
            _validate_identifier(column_name, "column_name")
            if not _COLUMN_TYPE_RE.match(column_type):
                raise ValueError(f"Invalid column_type: {column_type!r}")
            with engine.begin() as connection:
                connection.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
                )


def ensure_columns() -> None:
    """Public entry point for additive column migration.

    Wraps _ensure_sqlite_additive_columns so callers can import a stable
    public name without depending on the private implementation detail.
    """
    _ensure_sqlite_additive_columns()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        try:
            db.rollback()
        except Exception:
            logger.warning("db.rollback() failed", exc_info=True)
        raise
    finally:
        db.close()
