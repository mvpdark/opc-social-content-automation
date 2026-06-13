from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import initialize_local_database


BACKEND_ROOT = Path(__file__).resolve().parents[1]
STATIC_ROOT = BACKEND_ROOT / "static"


def create_app() -> FastAPI:
    initialize_local_database()

    app = FastAPI(
        title="OPC Social Content Automation API",
        version="0.1.0",
        description="MVP backend for content operations and promoter workflows.",
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
