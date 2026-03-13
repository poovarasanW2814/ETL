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
    mongo_uri: str = Field(default="mongodb://localhost:27017")
    mongo_database_name: str = Field(default="mcp_transform_service")
    mongo_prompt_lab_database_name: str = Field(default="mcp_prompt_lab")
    prompt_test_ttl_seconds: int = Field(default=7 * 24 * 60 * 60)
    ai_provider: str = Field(default="ollama")
    ai_primary_model: str = Field(default="qwen2.5:7b")
    ai_fallback_model: str = Field(default="deepseek-coder:6.7b")
    ai_timeout_seconds: int = Field(default=90)
    ollama_base_url: str = Field(default="http://localhost:11434")

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
