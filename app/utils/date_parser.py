"""Datetime formatting helpers."""

from __future__ import annotations

import pandas as pd

FORMAT_MAPPINGS: dict[str, str] = {
    "YYYY-MM-DD": "%Y-%m-%d",
    "YYYY-MM-DD HH:mm:ss": "%Y-%m-%d %H:%M:%S",
    "MM/DD/YYYY": "%m/%d/%Y",
    "DD-MM-YYYY": "%d-%m-%Y",
    "DD-MM-YY HH:mm:ss": "%d-%m-%y %H:%M:%S",
}


def format_dates(series: pd.Series, target_format: str) -> list[str | None]:
    """Format parsed datetime values into the requested output representation."""

    strftime_format = FORMAT_MAPPINGS.get(target_format)
    if strftime_format is None:
        raise ValueError(f"Unsupported target format: {target_format}")

    formatted = series.dt.strftime(strftime_format)
    normalized = formatted.astype(object).where(pd.notna(formatted), None)
    return normalized.tolist()
