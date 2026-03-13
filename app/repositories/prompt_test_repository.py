"""MongoDB repository for prompt playground sessions."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pymongo import ASCENDING

from app.core.settings import settings
from app.infrastructure.database.mongo import get_prompt_lab_database

COLLECTION_NAME = "prompt_test_sessions"
_indexes_initialized = False


async def _ensure_indexes() -> None:
    """Create indexes for prompt-lab sessions."""

    global _indexes_initialized

    if _indexes_initialized:
        return

    collection = get_prompt_lab_database()[COLLECTION_NAME]
    await collection.create_index([("created_at", ASCENDING)], expireAfterSeconds=settings.prompt_test_ttl_seconds)
    await collection.create_index([("source_column", ASCENDING)])
    await collection.create_index([("target_format", ASCENDING)])
    _indexes_initialized = True


async def create_prompt_test_session(
    *,
    source_column: str,
    target_column: str,
    prompt: str,
    values: list[str | None],
    detected_format: str,
    target_format: str | None,
    source_format_hint: str | None = None,
    timezone_strategy: str | None = None,
    confidence: float | None = None,
    transformed_values: list[str | None],
) -> None:
    """Persist a prompt playground execution in the prompt-lab database."""

    await _ensure_indexes()

    collection = get_prompt_lab_database()[COLLECTION_NAME]
    await collection.insert_one(
        {
            "source_column": source_column,
            "target_column": target_column,
            "prompt": prompt,
            "values": values,
            "detected_format": detected_format,
            "target_format": target_format,
            "source_format_hint": source_format_hint,
            "timezone_strategy": timezone_strategy,
            "confidence": confidence,
            "transformed_values": transformed_values,
            "created_at": datetime.utcnow(),
        }
    )
