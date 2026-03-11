"""Prompt analysis using Ollama."""

from __future__ import annotations

import re

import requests

from app.agents.format_resolver import normalize_resolved_format
from app.logging.logger import logger

OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3"
VALID_FORMAT_PATTERN = re.compile(r"^[A-Za-z:/\-\sTZ]+$")


def _build_prompt(instruction: str) -> str:
    """Build the LLM instruction for extracting a date format."""

    return (
        "You are a date format extraction assistant.\n\n"
        "Convert the following instruction into a standard date format string.\n\n"
        "Return ONLY the format.\n\n"
        "Examples:\n"
        "ISO -> YYYY-MM-DD\n"
        "US -> MM/DD/YYYY\n"
        "European -> DD-MM-YYYY\n\n"
        f"Instruction:\n{instruction}\n\n"
        "Answer:"
    )


def _extract_format(response_text: str) -> str | None:
    """Normalize and validate the raw LLM response."""

    candidate = response_text.strip().splitlines()[0].strip()
    if not candidate:
        return None

    if not VALID_FORMAT_PATTERN.fullmatch(candidate):
        return None

    return normalize_resolved_format(candidate)


def analyze_prompt(prompt: str) -> str | None:
    """Use Ollama to infer the target date format from a prompt."""

    logger.info("Using Ollama to resolve prompt format", prompt=prompt)

    try:
        response = requests.post(
            OLLAMA_GENERATE_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": _build_prompt(prompt),
                "stream": False,
            },
            timeout=30,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.exception("Ollama request failed", error=str(exc))
        return None

    response_payload = response.json()
    extracted_format = _extract_format(response_payload.get("response", ""))

    if extracted_format is None:
        logger.warning("Ollama returned an invalid date format")
        return None

    logger.info("Ollama resolved date format", resolved_format=extracted_format)
    return extracted_format
