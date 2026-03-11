"""Correlation ID helpers for request-scoped logging."""

from contextvars import ContextVar
from uuid import uuid4

_correlation_id_ctx: ContextVar[str | None] = ContextVar(
    "correlation_id",
    default=None,
)


def generate_correlation_id() -> str:
    """Generate a new correlation ID."""

    return str(uuid4())


def get_correlation_id() -> str | None:
    """Return the current correlation ID, if set."""

    return _correlation_id_ctx.get()


def set_correlation_id(correlation_id: str | None = None) -> str:
    """Set the current correlation ID and return it."""

    resolved_correlation_id = correlation_id or generate_correlation_id()
    _correlation_id_ctx.set(resolved_correlation_id)
    return resolved_correlation_id


def clear_correlation_id() -> None:
    """Clear the current correlation ID."""

    _correlation_id_ctx.set(None)
