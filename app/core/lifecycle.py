"""Application lifecycle handlers."""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI

from app.core.settings import settings
from app.logging.logger import configure_logger, logger


def check_ollama_availability() -> bool:
    """Log configured Gemini provider metadata."""

    logger.info(
        "Gemini provider configured",
        gemini_base_url=settings.gemini_base_url,
        gemini_model=settings.gemini_model,
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
