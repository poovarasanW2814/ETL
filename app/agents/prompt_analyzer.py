"""Prompt analysis using Ollama."""

from __future__ import annotations

import json
import re

import requests

from app.agents.ai_provider import get_prompt_analysis_provider
from app.agents.format_resolver import normalize_resolved_format
from app.core.settings import settings
from app.logging.logger import logger

VALID_FORMAT_PATTERN = re.compile(r"^[A-Za-z:/\-\sTZ]+$")
JSON_OBJECT_PATTERN = re.compile(r"\{.*\}", re.DOTALL)


def _build_prompt(instruction: str) -> str:
    """Build the LLM instruction for extracting a date format."""

    return (
        "You are a deterministic data transformation planner used inside an ETL pipeline.\n\n"
        "Your task is to analyze a natural language prompt describing a desired date format and return a transformation plan.\n\n"
        "Rules:\n"
        "1. Return valid JSON only.\n"
        "2. Do not include explanations, comments, markdown, or extra text.\n"
        "3. Return exactly one JSON object.\n"
        "4. If uncertain, use null values and confidence 0.0.\n"
        "5. Never invent unsupported tokens.\n\n"
        "Return schema:\n"
        '{\n  "target_format": "string or null",\n  "confidence": number\n}\n\n'
        "Use ONLY these tokens:\n"
        "YYYY YY MM DD HH mm ss\n\n"
        "Use ONLY these separators/literals:\n"
        "- / . : space T Z\n\n"
        "Do not return words like ISO, datetime, month name, day name, or prose.\n\n"
        "Examples:\n"
        'Prompt: convert to ISO date format\n'
        'Output: {"target_format":"YYYY-MM-DD","confidence":0.95}\n'
        'Prompt: convert to US format\n'
        'Output: {"target_format":"MM/DD/YYYY","confidence":0.95}\n'
        'Prompt: convert to YYYY-MM-DD HH:mm:ss\n'
        'Output: {"target_format":"YYYY-MM-DD HH:mm:ss","confidence":0.99}\n'
        'Prompt: format these dates as year month day\n'
        'Output: {"target_format":"YYYY-MM-DD","confidence":0.80}\n'
        'Prompt: make it dd-mm-yy\n'
        'Output: {"target_format":"DD-MM-YY","confidence":0.93}\n'
        'Prompt: convert this somehow\n'
        'Output: {"target_format":null,"confidence":0.0}\n\n'
        f"Instruction:\n{instruction}\n\n"
        "Answer:"
    )


def _extract_json_plan(response_text: str) -> dict[str, object] | None:
    """Parse the raw model response into a JSON plan payload."""

    candidate = response_text.strip()
    if not candidate:
        return None

    direct_candidate = candidate
    if not direct_candidate.startswith("{"):
        match = JSON_OBJECT_PATTERN.search(candidate)
        if not match:
            return None
        direct_candidate = match.group(0)

    try:
        payload = json.loads(direct_candidate)
    except json.JSONDecodeError:
        return None

    if not isinstance(payload, dict):
        return None

    return payload


def analyze_prompt_plan(prompt: str) -> dict[str, object] | None:
    """Use the configured AI provider to infer a structured transformation plan."""

    logger.info(
        "Using AI provider to resolve prompt format",
        prompt=prompt,
        ai_provider=settings.ai_provider,
        ai_primary_model=settings.ai_primary_model,
        ai_fallback_model=settings.ai_fallback_model,
    )

    try:
        provider = get_prompt_analysis_provider()
        candidate_responses = provider.iter_candidate_responses(_build_prompt(prompt))
    except requests.RequestException as exc:
        logger.exception(
            "AI provider request failed",
            error=str(exc),
            ai_provider=settings.ai_provider,
            ai_primary_model=settings.ai_primary_model,
            ai_fallback_model=settings.ai_fallback_model,
        )
        return None
    except ValueError as exc:
        logger.exception("AI provider configuration invalid", error=str(exc))
        return None

    try:
        for raw_response, model_used in candidate_responses:
            raw_plan = _extract_json_plan(raw_response)
            if raw_plan is None:
                logger.warning(
                    "AI provider returned an invalid plan payload",
                    ai_provider=settings.ai_provider,
                    ai_model=model_used,
                )
                continue

            raw_target_format = raw_plan.get("target_format")
            raw_confidence = raw_plan.get("confidence")

            target_format = (
                normalize_resolved_format(str(raw_target_format))
                if raw_target_format is not None
                else None
            )

            if target_format is None:
                logger.warning(
                    "AI provider returned an invalid date format",
                    ai_provider=settings.ai_provider,
                    ai_model=model_used,
                )
                continue

            try:
                confidence = float(raw_confidence)
            except (TypeError, ValueError):
                confidence = 0.0
            confidence = max(0.0, min(confidence, 1.0))

            plan = {
                "target_format": target_format,
                "confidence": confidence,
            }

            logger.info(
                "AI provider resolved transformation plan",
                ai_provider=settings.ai_provider,
                ai_model=model_used,
                target_format=target_format,
                confidence=confidence,
            )
            return plan
    except requests.RequestException as exc:
        logger.exception(
            "AI provider request failed",
            error=str(exc),
            ai_provider=settings.ai_provider,
            ai_primary_model=settings.ai_primary_model,
            ai_fallback_model=settings.ai_fallback_model,
        )
        return None

    logger.warning(
        "All AI model attempts failed semantic validation",
        ai_provider=settings.ai_provider,
        ai_primary_model=settings.ai_primary_model,
        ai_fallback_model=settings.ai_fallback_model,
    )
    return None


def analyze_prompt(prompt: str) -> str | None:
    """Use the configured AI provider to infer the target date format."""
    plan = analyze_prompt_plan(prompt)
    if plan is None:
        return None
    return plan["target_format"] if isinstance(plan.get("target_format"), str) else None
