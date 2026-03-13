"""Batch processing service for date transformation requests."""

from __future__ import annotations

from app.logging.logger import logger
from app.schemas.request import DateColumnRequest
from app.services.transform_service import transform_column


def process_batch(
    columns: list[DateColumnRequest],
    resolved_formats: dict[str, str | None],
    on_column_processed=None,
    transform_tool=transform_column,
) -> dict[str, list[dict[str, list[str | None] | str]]]:
    """Transform all requested columns and build the batch response."""

    transformed_columns: list[dict[str, list[str | None] | str]] = []

    for column in columns:
        target_format = resolved_formats.get(column.target_column)
        logger.info(
            "Transforming column",
            source_column=column.source_column,
            target_column=column.target_column,
            number_of_values=len(column.values),
            target_format=target_format,
        )

        transformed_values = (
            transform_tool(column.values, target_format)
            if target_format is not None
            else [None for _ in column.values]
        )

        if on_column_processed is not None:
            on_column_processed(column, transformed_values, target_format)

        transformed_columns.append(
            {
                "target_column": column.target_column,
                "values": transformed_values,
            },
        )

    return {"columns": transformed_columns}
