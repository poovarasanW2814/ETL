"""FastAPI application entrypoint."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
import asyncio

from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.constants import (
    CORRELATION_ID_HEADER,
    DEFAULT_HEALTH_STATUS,
    HEALTH_ENDPOINT,
)
from app.core.lifecycle import register_lifecycle_events
from app.core.settings import settings
from app.infrastructure.messaging.job_events import subscribe_job_events
from app.logging.correlation import clear_correlation_id, set_correlation_id
from app.logging.logger import logger


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    application = FastAPI(
        title=settings.app_name,
        version=settings.api_version,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_lifecycle_events(application)
    application.include_router(api_router)

    @application.middleware("http")
    async def correlation_id_middleware(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """Populate correlation ID context for each request."""

        correlation_id = set_correlation_id(
            request.headers.get(CORRELATION_ID_HEADER),
        )
        response = Response("Internal server error", status_code=500)

        try:
            response = await call_next(request)
        finally:
            response.headers[CORRELATION_ID_HEADER] = correlation_id
            clear_correlation_id()

        return response

    @application.get(HEALTH_ENDPOINT, tags=["health"])
    async def health_check() -> dict[str, str]:
        """Return the service health state."""

        logger.debug("Health check requested")
        return {"status": DEFAULT_HEALTH_STATUS}

    @application.websocket("/ws/jobs")
    async def job_updates_socket(websocket: WebSocket) -> None:
        """Stream live job events over WebSocket."""

        await websocket.accept()
        job_id_filter = websocket.query_params.get("jobId")
        logger.info("WebSocket client connected", job_id=job_id_filter)

        try:
            async for event in subscribe_job_events():
                if job_id_filter and event.get("job_id") != job_id_filter:
                    continue

                await websocket.send_json(event)
        except WebSocketDisconnect:
            logger.info("WebSocket client disconnected", job_id=job_id_filter)
        except asyncio.CancelledError:
            logger.info("WebSocket job stream cancelled", job_id=job_id_filter)
        except Exception as exc:
            message = str(exc).lower()
            if (
                "disconnect" in message
                or "closed" in message
                or "close" in message
                or "cancelled" in message
                or "1000" in message
            ):
                logger.info("WebSocket client disconnected", job_id=job_id_filter)
            else:
                logger.exception("WebSocket job stream failed", job_id=job_id_filter)

    return application


app = create_app()
