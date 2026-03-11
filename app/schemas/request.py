"""Request schemas for date transformation endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


class DateColumnRequest(BaseModel):
    """Batch payload for a single source date column."""

    source_column: str = Field(..., description="Name of the source column")
    target_column: str = Field(..., description="Name of the target column")
    values: list[str | None] = Field(
        ...,
        description="Batch of date values to transform",
    )
    prompt: str = Field(
        ...,
        description="Natural-language instruction for the target date format",
    )


class TransformDatesRequest(BaseModel):
    """Top-level request payload sent by the ETL worker."""

    pipeline_id: str = Field(..., description="Unique pipeline identifier")
    batch_id: str = Field(..., description="Unique batch identifier")
    columns: list[DateColumnRequest] = Field(
        ...,
        description="Collection of columns requiring date transformation",
    )


class PromptTestRequest(BaseModel):
    """Ad hoc prompt-testing payload from the monitoring UI."""

    values: list[str | None] = Field(
        ...,
        description="Sample date values to test against a prompt",
    )
    prompt: str = Field(
        ...,
        description="Natural-language date transformation instruction",
    )
    source_column: str = Field(
        default="test_date",
        description="Optional source column label for the playground",
    )
    target_column: str = Field(
        default="test_date_transformed",
        description="Optional target column label for the playground",
    )
