"""Alias-based date format resolution."""

from __future__ import annotations

import re

from app.logging.logger import logger
from app.utils.date_parser import validate_canonical_format

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
        re.compile(r"\bDD-MM-YY\b", re.IGNORECASE),
        "DD-MM-YY",
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
        re.compile(r"\bDD[/-]MM[/-]YY\s+HH[:.]mm[:.]ss\b", re.IGNORECASE),
        "DD-MM-YY HH:mm:ss",
    ),
    (
        re.compile(r"\bDD[/-]MM[/-]YY\b", re.IGNORECASE),
        "DD-MM-YY",
    ),
    (
        re.compile(r"\bYYYYMMDD\b", re.IGNORECASE),
        "YYYYMMDD",
    ),
)
_DIRECT_CANONICAL_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bYYYY-MM-DDTHH:mm:ssZ\b", re.IGNORECASE),
    re.compile(r"\bYYYY-MM-DDTHH:mm:ss\b", re.IGNORECASE),
    re.compile(r"\bYYYY-MM-DD HH:mm:ss\b", re.IGNORECASE),
    re.compile(r"\bDD-MM-YY HH:mm:ss\b", re.IGNORECASE),
    re.compile(r"\bDD-MM-YYYY HH:mm:ss\b", re.IGNORECASE),
    re.compile(r"\bYYYY/MM/DD\b", re.IGNORECASE),
    re.compile(r"\bYYYY-MM-DD\b", re.IGNORECASE),
    re.compile(r"\bMM/DD/YYYY\b", re.IGNORECASE),
    re.compile(r"\bDD-MM-YYYY\b", re.IGNORECASE),
    re.compile(r"\bDD/MM/YYYY\b", re.IGNORECASE),
    re.compile(r"\bYYYYMMDD\b", re.IGNORECASE),
    re.compile(r"\bHH:mm:ss\b", re.IGNORECASE),
)

_UNICODE_DASH_PATTERN = re.compile(r"[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]")
_WHITESPACE_PATTERN = re.compile(r"\s+")


def normalize_prompt_text(prompt: str) -> str:
    """Normalize prompt text so matching is stable across unicode punctuation and spacing."""

    normalized = _UNICODE_DASH_PATTERN.sub("-", prompt)
    normalized = normalized.replace("\u00A0", " ")
    normalized = normalized.replace("\u200B", "")
    normalized = normalized.replace("\u200C", "")
    normalized = normalized.replace("\u200D", "")
    normalized = _WHITESPACE_PATTERN.sub(" ", normalized)
    return normalized.strip()
def normalize_resolved_format(candidate: str | None) -> str | None:
    """Normalize date-format tokens into the service's canonical representation."""

    if candidate is None:
        return None

    normalized = re.sub(r"\s+", " ", candidate.strip())
    if not normalized:
        return None

    if validate_canonical_format(normalized):
        return normalized

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

    normalized = re.sub(r"\s+", " ", normalized)

    if validate_canonical_format(normalized):
        return normalized

    return None


def detect_literal_format(prompt: str) -> str | None:
    """Detect an explicit date format embedded directly in the prompt."""

    normalized_prompt = normalize_prompt_text(prompt)

    for pattern, normalized_format in _SUPPORTED_LITERAL_PATTERNS:
        match = pattern.search(normalized_prompt)
        if match and validate_canonical_format(normalized_format):
            logger.info(
                "Detected explicit date format in prompt",
                detected_format=normalized_format,
            )
            return normalized_format

    for pattern in _DIRECT_CANONICAL_PATTERNS:
        match = pattern.search(normalized_prompt)
        if not match:
            continue

        normalized_candidate = normalize_resolved_format(match.group(0))
        if normalized_candidate is not None:
            logger.info(
                "Detected explicit date format in prompt",
                detected_format=normalized_candidate,
            )
            return normalized_candidate

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
    return None
