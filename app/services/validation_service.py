"""Validation helpers for API request payloads."""

from app.schemas.request import TransformDatesRequest


def validate_transform_request(request: TransformDatesRequest) -> None:
    """Validate the basic structure of a transform request."""

    if not request.pipeline_id.strip():
        raise ValueError("pipeline_id must exist")

    if not request.batch_id.strip():
        raise ValueError("batch_id must exist")

    if not request.columns:
        raise ValueError("columns list must not be empty")

    for column in request.columns:
        if not column.values:
            raise ValueError(
                f"values list must not be empty for column '{column.source_column}'",
            )
