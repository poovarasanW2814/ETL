"""Core date transformation service."""

from __future__ import annotations

import re

from app.logging.logger import logger
from app.utils.date_parser import format_dates
from app.utils.pandas_ops import parse_dates

FORMAT_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("YYYY-MM-DDTHH:mm:ssZ", re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$")),
    ("YYYY-MM-DD HH:mm:ss", re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$")),
    ("YYYY/MM/DD", re.compile(r"^\d{4}/\d{2}/\d{2}$")),
    ("YYYY-MM-DD", re.compile(r"^\d{4}-\d{2}-\d{2}$")),
    ("DD-MM-YYYY", re.compile(r"^\d{2}-\d{2}-\d{4}$")),
    ("MM/DD/YYYY", re.compile(r"^\d{2}/\d{2}/\d{4}$")),
    ("YYYYMMDD", re.compile(r"^\d{8}$")),
    ("Month DD, YYYY", re.compile(r"^[A-Za-z]+ \d{1,2}, \d{4}$")),
    ("Mon DD YYYY", re.compile(r"^[A-Za-z]{3} \d{1,2} \d{4}$")),
]


def detect_source_format(values: list[str | None]) -> str:
    """Infer a source-format hint from the first meaningful value in a batch."""

    for value in values:
        if value is None:
            continue

        normalized_value = value.strip()
        if not normalized_value:
            continue

        for label, pattern in FORMAT_PATTERNS:
            if pattern.match(normalized_value):
                return label

        return "AUTO"

    return "AUTO"


def transform_column(
    values: list[str | None],
    target_format: str,
) -> list[str | None]:
    """Transform a batch of date values into the requested target format."""

    logger.info(
        "Starting date value transformation",
        number_of_values=len(values),
        target_format=target_format,
    )

    parsed_series = parse_dates(values)
    normalized_series = parsed_series.dt.tz_localize(None)
    return format_dates(normalized_series, target_format)
