"""Application lifecycle handlers."""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI
import requests

from app.logging.logger import configure_logger, logger

OLLAMA_BASE_URL = "http://localhost:11434"


def check_ollama_availability() -> bool:
    """Check whether the Ollama server is reachable."""

    try:
        response = requests.get(OLLAMA_BASE_URL, timeout=3)
        response.raise_for_status()
    except requests.RequestException:
        logger.warning("Ollama server not reachable", ollama_url=OLLAMA_BASE_URL)
        return False

    logger.info("Ollama server detected at http://localhost:11434")
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
