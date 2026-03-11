"""Log formatter and patcher utilities."""

from __future__ import annotations

import json
from typing import Any

from app.logging.correlation import get_correlation_id


def inject_correlation_id(record: dict[str, Any]) -> None:
    """Inject the active correlation ID into the log record."""

    record["extra"]["correlation_id"] = get_correlation_id() or "-"


def build_log_payload(record: dict[str, Any]) -> dict[str, Any]:
    """Build a structured payload from a loguru record."""

    log_payload = {
        "timestamp": record["time"].isoformat(),
        "level": record["level"].name,
        "message": record["message"],
        "logger": record["name"],
        "module": record["module"],
        "function": record["function"],
        "line": record["line"],
        "correlation_id": record["extra"].get("correlation_id", "-"),
    }

    for key, value in record["extra"].items():
        if key != "correlation_id":
            log_payload[key] = value

    return log_payload


def serialize_log_record(record: dict[str, Any]) -> str:
    """Serialize a loguru record into a JSON log line."""

    return f"{json.dumps(build_log_payload(record), default=str)}\n"
