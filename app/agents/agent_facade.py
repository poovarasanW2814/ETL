"""Facade for resolving target date formats."""

from __future__ import annotations

from app.agents.format_resolver import detect_literal_format, resolve_alias
from app.agents.prompt_analyzer import analyze_prompt
from app.logging.logger import logger


def resolve_target_format(prompt: str) -> str | None:
    """Resolve the target date format from a natural-language prompt."""

    logger.info("Resolving target date format", prompt=prompt)

    literal_format = detect_literal_format(prompt)
    if literal_format is not None:
        return literal_format

    resolved_format = resolve_alias(prompt)
    if resolved_format is not None:
        return resolved_format

    return analyze_prompt(prompt)
