"""Redis-backed job event publishing and subscription for live updates."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from redis import asyncio as redis_asyncio

from app.core.settings import settings
from app.infrastructure.cache.retry_cache import get_redis_client

JOB_EVENTS_CHANNEL = "mcp:job-events"


def _json_default(value: Any) -> str:
    """Serialize values that are not JSON-native."""

    if isinstance(value, datetime):
        return value.isoformat()

    return str(value)


def publish_job_event(event: dict[str, Any]) -> None:
    """Publish a job event for WebSocket subscribers."""

    get_redis_client().publish(
        JOB_EVENTS_CHANNEL,
        json.dumps(event, default=_json_default),
    )


async def subscribe_job_events():
    """Yield published job events from Redis pub/sub."""

    redis_client = redis_asyncio.Redis.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(JOB_EVENTS_CHANNEL)

    try:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue

            data = message.get("data")
            if not isinstance(data, str):
                continue

            yield json.loads(data)
    finally:
        await pubsub.unsubscribe(JOB_EVENTS_CHANNEL)
        await pubsub.close()
        await redis_client.aclose()
