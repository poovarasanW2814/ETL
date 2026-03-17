"""Application configuration."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    app_name: str = Field(default="MCP Data Transform Service")
    api_version: str = Field(default="1.0.0")
    log_level: str = Field(default="INFO")
    redis_url: str = Field(default="redis://localhost:6379/0")
    mongo_uri: str = Field(
        default="mongodb+srv://poovarasangandhi:king%407143@cluster0.o0tbm9b.mongodb.net/"
    )
    mongo_database_name: str = Field(default="mcp_transform_service")
    mongo_prompt_lab_database_name: str = Field(default="mcp_prompt_lab")
    mongo_server_selection_timeout_ms: int = Field(default=5000)
    mongo_required_on_startup: bool = Field(default=False)
    prompt_test_ttl_seconds: int = Field(default=7 * 24 * 60 * 60)
    ai_timeout_seconds: int = Field(default=90)
    gemini_api_key: str = Field(default="your_real_key_here")
    gemini_model: str = Field(default="gemini-2.5-flash")
    gemini_base_url: str = Field(default="https://generativelanguage.googleapis.com/v1beta")
    prompt_plan_cache_ttl_seconds: int = Field(default=30 * 24 * 60 * 60)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""

    return Settings()


settings: Settings = get_settings()
