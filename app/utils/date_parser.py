"""Datetime formatting helpers."""

from __future__ import annotations

import re

import pandas as pd

TOKEN_TO_STRFTIME: dict[str, str] = {
    "YYYY": "%Y",
    "YY": "%y",
    "MM": "%m",
    "DD": "%d",
    "HH": "%H",
    "mm": "%M",
    "ss": "%S",
}
TOKEN_PATTERN = re.compile(r"YYYY|YY|MM|DD|HH|mm|ss|[-/.: TZ]")
UNKNOWN_TOKEN_PATTERN = re.compile(r"YYYY|YY|MM|DD|HH|mm|ss|[-/.: TZ]+")
_CANONICAL_TIME_PATTERN = re.compile(r"HH:mm(?::ss)?(?:Z)?$")

def validate_canonical_format(target_format: str) -> bool:
    """Validate that a target format uses only the MCP canonical token grammar."""

    if not target_format or not isinstance(target_format, str):
        return False

    if target_format != target_format.strip():
        return False

    tokens = TOKEN_PATTERN.findall(target_format)
    if not tokens:
        return False

    stripped_candidate = UNKNOWN_TOKEN_PATTERN.sub("", target_format)
    if stripped_candidate != "":
        return False

    year_tokens = [token for token in tokens if token in {"YYYY", "YY"}]
    month_tokens = [token for token in tokens if token == "MM"]

    if len(year_tokens) > 1:
        return False

    if len(month_tokens) > 1 and not _CANONICAL_TIME_PATTERN.search(target_format):
        return False

    return True


def compile_strftime_format(target_format: str) -> str:
    """Compile a canonical MCP target format into a Python strftime format."""

    if not validate_canonical_format(target_format):
        raise ValueError(f"Unsupported target format: {target_format}")

    compiled_format = target_format
    for token in ("YYYY", "YY", "MM", "DD", "HH", "mm", "ss"):
        compiled_format = compiled_format.replace(token, TOKEN_TO_STRFTIME[token])

    return compiled_format


def format_dates(series: pd.Series, target_format: str) -> list[str | None]:
    """Format parsed datetime values into the requested output representation."""

    strftime_format = compile_strftime_format(target_format)
    formatted = series.dt.strftime(strftime_format)
    normalized = formatted.astype(object).where(pd.notna(formatted), None)
    return normalized.tolist()
