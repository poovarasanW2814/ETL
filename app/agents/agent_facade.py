"""Facade for resolving target date formats."""

from __future__ import annotations

from app.agents.format_resolver import (
    detect_literal_format,
    normalize_prompt_text,
    normalize_resolved_format,
    resolve_alias,
)
from app.agents.prompt_analyzer import analyze_prompt_plan
from app.infrastructure.cache.prompt_plan_cache import get_prompt_plan, store_prompt_plan
from app.logging.logger import logger
from app.services.transform_service import tool_detect_source_format

_DIRECT_CANONICAL_FORMATS: tuple[str, ...] = (
    "YYYY-MM-DDTHH:mm:ssZ",
    "YYYY-MM-DDTHH:mm:ss",
    "YYYY-MM-DD HH:mm:ss",
    "DD-MM-YY HH:mm:ss",
    "DD-MM-YYYY HH:mm:ss",
    "YYYY/MM/DD",
    "YYYY-MM-DD",
    "MM/DD/YYYY",
    "DD-MM-YYYY",
    "DD/MM/YYYY",
    "YYYYMMDD",
    "HH:mm:ss",
)


def resolve_target_format(prompt: str) -> str | None:
    """Resolve the target date format from a natural-language prompt."""

    logger.info("Resolving target date format", prompt=prompt)

    plan = resolve_transformation_plan(prompt)
    return plan.get("target_format") if isinstance(plan.get("target_format"), str) else None


def resolve_transformation_plan(
    prompt: str,
    values: list[str | None] | None = None,
) -> dict[str, str | float | None]:
    """Resolve a structured transformation plan using fast explicit detection, then AI, then fallback rules."""

    logger.info("Resolving target date format", prompt=prompt)

    normalized_prompt = normalize_prompt_text(prompt)
    for candidate in _DIRECT_CANONICAL_FORMATS:
        if candidate.lower() in normalized_prompt.lower():
            resolved_format = normalize_resolved_format(candidate)
            if resolved_format is not None:
                return {
                    "target_format": resolved_format,
                    "source_format_hint": tool_detect_source_format(values or []),
                    "timezone_strategy": "strip" if "HH" in resolved_format or "Z" in resolved_format else "none",
                    "confidence": 0.98,
                }

    cached_plan = get_prompt_plan(normalized_prompt)
    if cached_plan is not None and isinstance(cached_plan.get("target_format"), str):
        source_format_hint = tool_detect_source_format(values or [])
        plan = {
            "target_format": cached_plan.get("target_format"),
            "source_format_hint": source_format_hint,
            "timezone_strategy": "strip"
            if isinstance(cached_plan.get("target_format"), str)
            and ("HH" in str(cached_plan.get("target_format")) or "Z" in str(cached_plan.get("target_format")))
            else "none",
            "confidence": cached_plan.get("confidence", 0.0),
        }
        logger.info(
            "Resolved transformation plan from prompt cache",
            target_format=plan["target_format"],
            source_format_hint=plan["source_format_hint"],
            timezone_strategy=plan["timezone_strategy"],
            confidence=plan["confidence"],
        )
        return plan

    ai_plan = analyze_prompt_plan(normalized_prompt)
    if ai_plan is not None:
        store_prompt_plan(normalized_prompt, ai_plan)
        source_format_hint = tool_detect_source_format(values or [])
        plan = {
            "target_format": ai_plan.get("target_format"),
            "source_format_hint": source_format_hint,
            "timezone_strategy": "strip"
            if isinstance(ai_plan.get("target_format"), str)
            and ("HH" in str(ai_plan.get("target_format")) or "Z" in str(ai_plan.get("target_format")))
            else "none",
            "confidence": ai_plan.get("confidence", 0.0),
        }
        logger.info(
            "Resolved transformation plan from AI provider",
            target_format=plan["target_format"],
            source_format_hint=plan["source_format_hint"],
            timezone_strategy=plan["timezone_strategy"],
            confidence=plan["confidence"],
        )
        return plan

    literal_format = detect_literal_format(normalized_prompt)
    if literal_format is not None:
        return {
            "target_format": literal_format,
            "source_format_hint": tool_detect_source_format(values or []),
            "timezone_strategy": "strip" if "HH" in literal_format or "Z" in literal_format else "none",
            "confidence": 0.7,
        }

    resolved_format = resolve_alias(normalized_prompt)
    if resolved_format is not None:
        return {
            "target_format": resolved_format,
            "source_format_hint": tool_detect_source_format(values or []),
            "timezone_strategy": "strip" if "HH" in resolved_format or "Z" in resolved_format else "none",
            "confidence": 0.6,
        }

    return {
        "target_format": None,
        "source_format_hint": tool_detect_source_format(values or []),
        "timezone_strategy": "none",
        "confidence": 0.0,
    }
