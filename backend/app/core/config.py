import warnings
from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
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
    auth_required: bool = True
    embedding_dimensions: int = 1536
    draft_provider: str = "openai_compatible"
    draft_model: str = "gpt-5.6-luna"
    draft_timeout_seconds: float = 60.0
    draft_max_tokens: int = 1800
    draft_temperature: float = 0.7
    image_provider: str = "openai_compatible"
    image_model: str = "gpt-image-2"
    image_size: str | None = None
    image_response_format: str | None = None
    image_timeout_seconds: float = 600.0
    test_static_url_prefix: str = "/static/generated"
    # YUNWU_API_KEY is the single API key for all LLM and image services (yunwu.ai).
    yunwu_api_key: str | None = None
    yunwu_base_url: str = "https://yunwu.ai"
    # Deprecated: use YUNWU_API_KEY instead. Kept as backward-compatible alias.
    openai_compatible_api_key: str | None = None
    openai_compatible_base_url: str = "https://yunwu.ai"
    # Deprecated: image uses the same YUNWU_API_KEY.
    image_openai_compatible_api_key: str | None = None
    image_openai_compatible_base_url: str | None = "https://yunwu.ai"
    # Deprecated: DeepSeek provider is no longer used; yunwu.ai is the only provider.
    deepseek_api_key: str | None = None
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_rewrite_model: str = "deepseek-v4-pro"
    deepseek_timeout_seconds: float = 60.0
    review_provider: str = "openai_compatible"
    review_model: str = "gpt-5.6-luna"
    review_timeout_seconds: float = 60.0
    review_max_tokens: int = 1200
    review_temperature: float = 0.3
    tavily_api_key: str | None = None
    tavily_base_url: str = "https://api.tavily.com"
    tavily_search_enabled: bool = False
    tavily_timeout_seconds: float = 25.0
    tavily_max_results: int = 6
    knowledge_compile_enabled: bool = True
    knowledge_compile_interval_hours: int = 168
    knowledge_compile_check_interval_seconds: int = 3600
    knowledge_compile_source_limit: int = 120
    frontend_origin: str = "http://localhost:60000"
    zscj_api_base_url: str = "http://localhost:60002/api/v1"
    cors_origin_regex: str | None = (
        r"^https?://("
        r"localhost|127\.0\.0\.1|"
        r"opc\.mvpdark\.top|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"192\.168\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
        r")(:\d+)?$"
    )

    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
    )

    @model_validator(mode="after")
    def _warn_weak_jwt_secret(self) -> "Settings":
        if self.jwt_secret_key == "replace-with-a-long-random-secret":
            if self.auth_required:
                raise RuntimeError(
                    "JWT_SECRET_KEY 使用默认弱密钥且 AUTH_REQUIRED=true，"
                    "必须在 .env 中设置安全密钥后才能启动！"
                )
            warnings.warn(
                "JWT_SECRET_KEY 使用默认弱密钥，生产环境必须在 .env 中替换！",
                stacklevel=2,
            )
        if len(self.jwt_secret_key) < 32:
            warnings.warn("JWT_SECRET_KEY 长度不足32字符，建议使用更长的随机密钥", stacklevel=2)
        return self

    @model_validator(mode="after")
    def _yunwu_key_fallback(self) -> "Settings":
        """YUNWU_API_KEY is the single source of truth for all API keys.

        Deprecated aliases (OPENAI_COMPATIBLE_API_KEY,
        IMAGE_OPENAI_COMPATIBLE_API_KEY) fall back to YUNWU_API_KEY
        for backward compatibility with older .env files.
        """
        if self.yunwu_api_key is None and self.openai_compatible_api_key is not None:
            self.yunwu_api_key = self.openai_compatible_api_key
        if self.yunwu_api_key is None and self.image_openai_compatible_api_key is not None:
            self.yunwu_api_key = self.image_openai_compatible_api_key
        # Sync deprecated aliases to the resolved yunwu key.
        self.openai_compatible_api_key = self.yunwu_api_key
        self.image_openai_compatible_api_key = self.yunwu_api_key
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [self.frontend_origin, "http://127.0.0.1:60000"]

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
