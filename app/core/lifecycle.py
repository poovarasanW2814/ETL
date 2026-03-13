"""Application lifecycle handlers."""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI
import requests

from app.core.settings import settings
from app.logging.logger import configure_logger, logger


def check_ollama_availability() -> bool:
    """Check whether the Ollama server is reachable."""

    if settings.ai_provider.lower() != "ollama":
        logger.info("Skipping Ollama availability check", ai_provider=settings.ai_provider)
        return True

    try:
        response = requests.get(settings.ollama_base_url, timeout=3)
        response.raise_for_status()
    except requests.RequestException:
        logger.warning("Ollama server not reachable", ollama_url=settings.ollama_base_url)
        return False

    logger.info(
        "Ollama server detected",
        ollama_url=settings.ollama_base_url,
        ai_primary_model=settings.ai_primary_model,
        ai_fallback_model=settings.ai_fallback_model,
    )
    return True


async def on_startup() -> None:
    """Initialize application resources on startup."""

    configure_logger()
    check_ollama_availability()
    logger.info("MCP service started")


async def on_shutdown() -> None:
    """Release application resources on shutdown."""

    logger.info("MCP service shutdown")


def register_lifecycle_events(app: FastAPI) -> None:
    """Attach startup and shutdown handlers to the FastAPI app."""

    startup_handler: Callable[[], Awaitable[None]] = on_startup
    shutdown_handler: Callable[[], Awaitable[None]] = on_shutdown
    app.add_event_handler("startup", startup_handler)
    app.add_event_handler("shutdown", shutdown_handler)
