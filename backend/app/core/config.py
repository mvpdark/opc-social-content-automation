from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    runtime_profile: str = "desktop"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/opc"
    database_connect_timeout_seconds: int = 2
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret_key: str = "replace-with-a-long-random-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    auth_required: bool = False
    embedding_dimensions: int = 1536
    draft_provider: str = "codex_test"
    draft_model: str = "gpt-5.5"
    draft_timeout_seconds: float = 60.0
    draft_max_tokens: int = 1800
    draft_temperature: float = 0.7
    image_provider: str = "codex_test"
    image_model: str = "gpt-image-2"
    image_size: str | None = None
    image_response_format: str | None = None
    image_timeout_seconds: float = 180.0
    test_static_url_prefix: str = "/static/generated"
    openai_compatible_api_key: str | None = None
    openai_compatible_base_url: str = "https://api.openai.com/v1"
    image_openai_compatible_api_key: str | None = None
    image_openai_compatible_base_url: str | None = None
    deepseek_api_key: str | None = None
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_rewrite_model: str = "deepseek-v4-pro"
    deepseek_timeout_seconds: float = 60.0
    frontend_origin: str = "http://localhost:3000"
    cors_origin_regex: str | None = (
        r"^https?://("
        r"localhost|127\.0\.0\.1|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"192\.168\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
        r")(:\d+)?$"
    )

    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [self.frontend_origin, "http://127.0.0.1:3000"]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def is_postgresql(self) -> bool:
        return self.database_url.startswith("postgresql")

    @property
    def is_self_hosted_profile(self) -> bool:
        return self.runtime_profile.strip().lower() in {
            "developer",
            "development",
            "self_hosted",
            "self-hosted",
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
