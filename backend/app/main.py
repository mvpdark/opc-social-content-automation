import asyncio
import contextlib
import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import SessionLocal, initialize_local_database
from app.services.knowledge_service import compile_knowledge_base_if_due


BACKEND_ROOT = Path(__file__).resolve().parents[1]
STATIC_ROOT = BACKEND_ROOT / "static"
logger = logging.getLogger(__name__)


async def _knowledge_compile_loop(stop_event: asyncio.Event) -> None:
    check_interval = max(60, settings.knowledge_compile_check_interval_seconds)
    while not stop_event.is_set():
        try:
            with SessionLocal() as db:
                result = compile_knowledge_base_if_due(
                    db,
                    interval_hours=settings.knowledge_compile_interval_hours,
                    source_limit=settings.knowledge_compile_source_limit,
                )
                if result is not None:
                    logger.info(
                        "Knowledge base compiled automatically from %s source items.",
                        result.source_count,
                    )
        except Exception:
            logger.exception("Knowledge compilation scheduler failed.")

        with contextlib.suppress(asyncio.TimeoutError):
            await asyncio.wait_for(stop_event.wait(), timeout=check_interval)


@contextlib.asynccontextmanager
async def _app_lifespan(app: FastAPI):
    if not settings.knowledge_compile_enabled:
        yield
        return

    stop_event = asyncio.Event()
    task = asyncio.create_task(_knowledge_compile_loop(stop_event))
    app.state.knowledge_compile_stop_event = stop_event
    app.state.knowledge_compile_task = task
    try:
        yield
    finally:
        stop_event.set()
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


def create_app() -> FastAPI:
    initialize_local_database()

    app = FastAPI(
        title="OPC Social Content Automation API",
        version="0.1.0",
        description="MVP backend for content operations and promoter workflows.",
        lifespan=_app_lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "opc-backend"}

    @app.exception_handler(OperationalError)
    async def database_unavailable(
        _request: Request,
        _exc: OperationalError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={
                "detail": "database_unavailable",
                "message": (
                    "数据库暂时连接不上。桌面或本地检查模式请重新运行本地启动助手；"
                    "自部署环境请检查 DATABASE_URL 和数据库服务。"
                ),
            },
        )

    STATIC_ROOT.mkdir(parents=True, exist_ok=True)
    app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")

    app.include_router(api_router, prefix="/api")

    return app


app = create_app()
