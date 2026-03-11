"""Application logger configuration."""

from __future__ import annotations

import sys
from typing import Any

from loguru import logger as _logger

from app.core.settings import settings
from app.logging.formatters import inject_correlation_id, serialize_log_record

logger = _logger


def _structured_sink(message: Any) -> None:
    """Write structured JSON logs directly to stdout."""

    sys.stdout.write(serialize_log_record(message.record))
    sys.stdout.flush()


def configure_logger() -> None:
    """Configure the shared application logger."""

    logger.remove()
    logger.configure(patcher=inject_correlation_id)
    logger.add(
        _structured_sink,
        level=settings.log_level.upper(),
        backtrace=False,
        diagnose=False,
        enqueue=True,
    )
