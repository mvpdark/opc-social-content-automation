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
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def initialize_local_database() -> None:
    if not settings.is_sqlite:
        return

    from app.db.base import Base

    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_additive_columns()


def _ensure_sqlite_additive_columns() -> None:
    inspector = inspect(engine)
    if "trend_contents" not in inspector.get_table_names():
        return

    trend_columns = {column["name"] for column in inspector.get_columns("trend_contents")}
    with engine.begin() as connection:
        if "cover_url" not in trend_columns:
            connection.execute(
                text("ALTER TABLE trend_contents ADD COLUMN cover_url VARCHAR(500)")
            )


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
