"""Redis-backed cache for resolved prompt transformation plans."""

from __future__ import annotations

import hashlib
import json

from app.core.settings import settings
from app.infrastructure.cache.retry_cache import get_redis_client


def _cache_key(prompt: str) -> str:
    """Build a stable Redis key for a normalized prompt."""

    prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    return f"mcp:prompt_plan:{prompt_hash}"


def get_prompt_plan(prompt: str) -> dict[str, object] | None:
    """Return a cached transformation plan for a normalized prompt."""

    raw_payload = get_redis_client().get(_cache_key(prompt))
    if raw_payload is None:
        return None

    return json.loads(raw_payload)


def store_prompt_plan(prompt: str, plan: dict[str, object]) -> None:
    """Store a validated transformation plan for a normalized prompt."""

    get_redis_client().setex(
        _cache_key(prompt),
        settings.prompt_plan_cache_ttl_seconds,
        json.dumps(plan),
    )
