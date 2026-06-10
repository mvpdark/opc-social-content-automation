from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings


BACKEND_ROOT = Path(__file__).resolve().parents[1]
STATIC_ROOT = BACKEND_ROOT / "static"


def create_app() -> FastAPI:
    app = FastAPI(
        title="OPC Social Content Automation API",
        version="0.1.0",
        description="MVP backend for content operations and promoter workflows.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "opc-backend"}

    STATIC_ROOT.mkdir(parents=True, exist_ok=True)
    app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")

    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
