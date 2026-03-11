"""Redis-backed cache for retryable MCP job payloads."""

from __future__ import annotations

import json

from redis import Redis

from app.core.settings import settings

RETRY_CACHE_TTL_SECONDS = 24 * 60 * 60
_redis_client: Redis | None = None


def get_redis_client() -> Redis:
    """Return a shared Redis client."""

    global _redis_client

    if _redis_client is None:
        _redis_client = Redis.from_url(settings.redis_url, decode_responses=True)

    return _redis_client


def store_retry_payload(job_id: str, payload: dict) -> None:
    """Store the original request payload outside Mongo for retry support."""

    get_redis_client().setex(
        f"mcp:retry_payload:{job_id}",
        RETRY_CACHE_TTL_SECONDS,
        json.dumps(payload),
    )


def get_retry_payload(job_id: str) -> dict | None:
    """Return a cached retry payload if available."""

    raw_payload = get_redis_client().get(f"mcp:retry_payload:{job_id}")
    if raw_payload is None:
        return None

    return json.loads(raw_payload)


def delete_retry_payload(job_id: str) -> None:
    """Delete a cached retry payload."""

    get_redis_client().delete(f"mcp:retry_payload:{job_id}")
