"""Application lifecycle handlers."""

from fastapi import FastAPI
from pymongo.errors import PyMongoError

from app.core.settings import settings
from app.infrastructure.database.mongo import ping_mongo
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
    try:
        await ping_mongo()
        logger.info(
            "MongoDB connection established",
            database=settings.mongo_database_name,
            prompt_lab_database=settings.mongo_prompt_lab_database_name,
        )
    except PyMongoError:
        logger.exception(
            "MongoDB connection failed during startup",
            database=settings.mongo_database_name,
            prompt_lab_database=settings.mongo_prompt_lab_database_name,
            mongo_required_on_startup=settings.mongo_required_on_startup,
        )
        if settings.mongo_required_on_startup:
            raise
    logger.info("MCP service started")


async def on_shutdown() -> None:
    """Release application resources on shutdown."""

    logger.info("MCP service shutdown")


def register_lifecycle_events(app: FastAPI) -> None:
    """Attach startup and shutdown handlers to the FastAPI app."""

    app.router.on_event("startup")(on_startup)
    app.router.on_event("shutdown")(on_shutdown)
