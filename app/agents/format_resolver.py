"""Alias-based date format resolution."""

from __future__ import annotations

import re

from app.logging.logger import logger

SUPPORTED_FORMAT_ALIASES: dict[str, str] = {
    "ISO": "YYYY-MM-DD",
    "US": "MM/DD/YYYY",
    "EU": "DD-MM-YYYY",
    "EUROPEAN": "DD-MM-YYYY",
    "MYSQL": "YYYY-MM-DD HH:mm:ss",
    "POSTGRES": "YYYY-MM-DD HH:mm:ss",
    "TIMESTAMP": "YYYY-MM-DDTHH:mm:ssZ",
    "DATE": "YYYY-MM-DD",
    "TIME": "HH:mm:ss",
    "DATETIME": "YYYY-MM-DD HH:mm:ss",
    "RFC3339": "YYYY-MM-DDTHH:mm:ssZ",
}

_SUPPORTED_LITERAL_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\bDD-MM-YY HH:mm:ss\b", re.IGNORECASE),
        "DD-MM-YY HH:mm:ss",
    ),
    (
        re.compile(r"\bYYYY-MM-DD HH:mm:ss\b", re.IGNORECASE),
        "YYYY-MM-DD HH:mm:ss",
    ),
    (
        re.compile(r"\bYYYY-MM-DDTHH:mm:ss\b", re.IGNORECASE),
        "YYYY-MM-DDTHH:mm:ss",
    ),
    (
        re.compile(r"\bYYYY/MM/DD\b", re.IGNORECASE),
        "YYYY/MM/DD",
    ),
    (
        re.compile(r"\bYYYY-MM-DD\b", re.IGNORECASE),
        "YYYY-MM-DD",
    ),
    (
        re.compile(r"\bMM[/-]DD[/-]YYYY\b", re.IGNORECASE),
        "MM/DD/YYYY",
    ),
    (
        re.compile(r"\bDD[/-]MM[/-]YYYY\b", re.IGNORECASE),
        "DD-MM-YYYY",
    ),
    (
        re.compile(r"\bDD[/-]MM[/-]YY(?:\s+HH[:.]mm[:.]ss)?\b", re.IGNORECASE),
        "DD-MM-YY HH:mm:ss",
    ),
    (
        re.compile(r"\bYYYYMMDD\b", re.IGNORECASE),
        "YYYYMMDD",
    ),
)
_ALLOWED_LITERAL_TOKENS = {"YYYY", "YY", "MM", "DD", "HH", "mm", "ss"}


def _is_valid_literal_format(candidate: str) -> bool:
    """Validate that a detected format contains only allowed date tokens."""

    tokens = re.findall(r"YYYY|YY|MM|DD|HH|mm|ss", candidate)
    stripped_candidate = re.sub(r"YYYY|YY|MM|DD|HH|mm|ss|[-/: T]", "", candidate)
    return bool(tokens) and stripped_candidate == ""


def normalize_resolved_format(candidate: str | None) -> str | None:
    """Normalize date-format tokens into the service's canonical representation."""

    if candidate is None:
        return None

    normalized = re.sub(r"\s+", " ", candidate.strip())
    if not normalized:
        return None

    normalized = normalized.replace(".", ":")
    normalized = re.sub(r"(?<!Y)yyyy(?!Y)", "YYYY", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"(?<!Y)yy(?!Y)", "YY", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"(?<!D)dd(?!D)", "DD", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"(?<!M)mm(?![A-Za-z])", "MM", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"(?<!H)hh(?!H)", "HH", normalized, flags=re.IGNORECASE)

    if "HH" in normalized:
        date_part, _, time_part = normalized.partition(" ")
        if time_part:
            time_part = re.sub(r"(?<=HH:)MM(?=:)", "mm", time_part)
            time_part = re.sub(r"(?<=:)(SS)(?=$)", "ss", time_part)
            normalized = f"{date_part} {time_part}".strip()
        else:
            normalized = re.sub(r"(?<=HH:)MM(?=:)", "mm", normalized)
            normalized = re.sub(r"(?<=:)(SS)(?=$)", "ss", normalized)

    normalized = normalized.replace("Z", "Z")

    if _is_valid_literal_format(normalized):
        return normalized

    return None


def detect_literal_format(prompt: str) -> str | None:
    """Detect an explicit date format embedded directly in the prompt."""

    for pattern, normalized_format in _SUPPORTED_LITERAL_PATTERNS:
        match = pattern.search(prompt)
        if match and _is_valid_literal_format(normalized_format):
            logger.info(
                "Detected explicit date format in prompt",
                detected_format=normalized_format,
            )
            return normalized_format

    return None


def resolve_alias(prompt: str) -> str | None:
    """Resolve a known date format alias from the prompt."""

    normalized_prompt = prompt.upper()

    for alias, date_format in SUPPORTED_FORMAT_ALIASES.items():
        pattern = rf"\b{re.escape(alias)}\b"
        if re.search(pattern, normalized_prompt):
            logger.info(
                "Alias resolver matched date format",
                alias=alias,
                resolved_format=date_format,
            )
            return date_format

    logger.debug("Alias resolver found no date format match")
    return None
