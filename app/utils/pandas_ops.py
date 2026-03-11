"""Vectorized pandas helpers for date transformation."""

from __future__ import annotations

import pandas as pd


def parse_dates(values: list[str | None]) -> pd.Series:
    """Parse a batch of mixed-format date values into a datetime series."""

    series = pd.Series(values, dtype="object")
    return pd.to_datetime(series, errors="coerce", utc=True, format="mixed")
