import contextlib
import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import DataError, IntegrityError, OperationalError

from app.api.v1.router import api_router
from app.core.domain import registry as domain_registry
from app.domains import register_all_domains
from app.core.config import settings
from app.db.session import SessionLocal, initialize_local_database

BACKEND_ROOT = Path(__file__).resolve().parents[1]
STATIC_ROOT = BACKEND_ROOT / "static"
logger = logging.getLogger(__name__)


@contextlib.asynccontextmanager
async def _app_lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    try:
        initialize_local_database()
    except Exception:
        logger.error("Database initialization failed", exc_info=True)
        raise

    # Register content domains at startup
    register_all_domains(domain_registry)


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
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
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

    @app.exception_handler(IntegrityError)
    async def database_integrity_error(
        _request: Request,
        _exc: IntegrityError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={
                "detail": "data_conflict",
                "message": "数据冲突，可能存在重复记录或约束冲突，请刷新后重试。",
            },
        )

    @app.exception_handler(DataError)
    async def database_data_error(
        _request: Request,
        _exc: DataError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "detail": "invalid_data",
                "message": "提交的数据格式或长度不符合要求，请检查后重试。",
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception(
        _request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "internal_error",
                "message": "服务内部错误，请稍后重试。",
            },
        )

    STATIC_ROOT.mkdir(parents=True, exist_ok=True)
    app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")

    app.include_router(api_router, prefix="/api")

    return app


app = create_app()
