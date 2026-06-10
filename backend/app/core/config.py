from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/opc"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret_key: str = "replace-with-a-long-random-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    embedding_dimensions: int = 1536
    draft_provider: str = "codex_test"
    draft_model: str = "gpt-5.5"
    draft_timeout_seconds: float = 120.0
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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins(self) -> list[str]:
        return [self.frontend_origin, "http://127.0.0.1:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
