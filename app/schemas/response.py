"""Response schemas for date transformation and monitoring endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TransformedColumnResponse(BaseModel):
    """Transformed values for a single output column."""

    target_column: str = Field(..., description="Target column name")
    values: list[str | None] = Field(
        ...,
        description="Transformed values in row order",
    )


class TransformDatesResponse(BaseModel):
    """Transformed batch response for date transformation requests."""

    columns: list[TransformedColumnResponse] = Field(
        ...,
        description="Transformed output grouped by target column",
    )


class TransformDatesJobResponse(BaseModel):
    """Response returned when an async transformation job is accepted."""

    job_id: str = Field(..., description="Celery job identifier")
    status: str = Field(..., description="Current async job state")


class JobColumnMetadataResponse(BaseModel):
    """Stored column metadata for a tracked MCP job."""

    source_column: str = Field(..., description="Source column name")
    target_column: str = Field(..., description="Target column name")
    prompt: str = Field(..., description="Transformation prompt for the column")


class JobPayloadResponse(BaseModel):
    """Stored ETL payload metadata without raw values arrays."""

    pipeline_id: str = Field(..., description="Pipeline identifier")
    batch_id: str = Field(..., description="Batch identifier")
    columns: list[JobColumnMetadataResponse] = Field(
        ...,
        description="Column mappings configured for this job",
    )


class JobProgressResponse(BaseModel):
    """Progress metadata for a running or completed job."""

    processed_rows: int = Field(default=0, description="Rows processed so far")
    total_rows: int = Field(default=0, description="Total rows to process")
    progress: int = Field(default=0, description="Progress percentage")
    estimated_seconds_remaining: float | None = Field(
        default=None,
        description="Estimated remaining execution time in seconds",
    )


class JobLogEntryResponse(BaseModel):
    """A single persisted job log line."""

    timestamp: datetime = Field(..., description="Log timestamp")
    level: str = Field(..., description="Log level")
    message: str = Field(..., description="Log message")


class FailedRecordResponse(BaseModel):
    """A single failed input record captured during transformation."""

    row: int = Field(..., description="1-based row number")
    source_column: str = Field(..., description="Source column name")
    source_value: str | None = Field(default=None, description="Original value")
    error: str = Field(..., description="Failure reason")


class PreviewEntryResponse(BaseModel):
    """A single source-to-target preview row."""

    source_value: str | None = Field(default=None, description="Original source value")
    transformed_value: str | None = Field(
        default=None,
        description="Transformed target value",
    )


class ColumnPreviewResponse(BaseModel):
    """Preview samples for one transformed column."""

    source_column: str = Field(..., description="Source column name")
    target_column: str = Field(..., description="Target column name")
    samples: list[PreviewEntryResponse] = Field(
        ...,
        description="Sample before and after pairs",
    )


class PromptInsightResponse(BaseModel):
    """Prompt analysis metadata for a transformed column."""

    source_column: str = Field(..., description="Source column name")
    target_column: str = Field(..., description="Target column name")
    prompt: str = Field(..., description="Original prompt")
    detected_format: str = Field(..., description="Detected source format hint")
    target_format: str | None = Field(default=None, description="Resolved target format")


class JobSummaryResponse(BaseModel):
    """Summary row for MCP job monitoring."""

    job_id: str = Field(..., description="Celery job identifier")
    pipeline_id: str | None = Field(default=None, description="Pipeline identifier")
    batch_id: str | None = Field(default=None, description="Batch identifier")
    status: str = Field(..., description="Current job status")
    metrics: dict[str, int | float] | None = Field(
        default=None,
        description="Stored job processing metrics",
    )
    progress: JobProgressResponse | None = Field(
        default=None,
        description="Current job progress",
    )
    timestamps: dict[str, datetime | None] | None = Field(
        default=None,
        description="Job lifecycle timestamps",
    )


class JobListResponse(BaseModel):
    """Response payload for the MCP jobs dashboard."""

    jobs: list[JobSummaryResponse] = Field(
        ...,
        description="Recent MCP transformation jobs",
    )
    page: int = Field(..., description="Current page number")
    limit: int = Field(..., description="Page size")
    total: int = Field(..., description="Total matching jobs")


class JobDetailResponse(BaseModel):
    """Detailed job metadata used by the monitoring dashboard."""

    job_id: str = Field(..., description="Celery job identifier")
    pipeline_id: str | None = Field(default=None, description="Pipeline identifier")
    batch_id: str | None = Field(default=None, description="Batch identifier")
    status: str = Field(..., description="Current job status")
    payload: JobPayloadResponse | None = Field(
        default=None,
        description="Stored ETL payload metadata",
    )
    metrics: dict[str, int | float] | None = Field(
        default=None,
        description="Stored job processing metrics",
    )
    progress: JobProgressResponse | None = Field(
        default=None,
        description="Current job progress",
    )
    timestamps: dict[str, datetime | None] | None = Field(
        default=None,
        description="Job lifecycle timestamps",
    )
    worker: str | None = Field(default=None, description="Celery worker name")
    prompt_insights: list[PromptInsightResponse] = Field(
        default_factory=list,
        description="Prompt analysis metadata for each column",
    )
    error: str | None = Field(default=None, description="Failure message if present")


class JobLogsResponse(BaseModel):
    """Persisted logs for a job."""

    job_id: str = Field(..., description="Celery job identifier")
    logs: list[JobLogEntryResponse] = Field(..., description="Persisted job logs")


class FailedRecordsResponse(BaseModel):
    """Persisted failed records for a job."""

    job_id: str = Field(..., description="Celery job identifier")
    records: list[FailedRecordResponse] = Field(
        ...,
        description="Failed record entries",
    )


class PreviewResponse(BaseModel):
    """Transformation preview payload."""

    job_id: str = Field(..., description="Celery job identifier")
    columns: list[ColumnPreviewResponse] = Field(
        ...,
        description="Preview samples per column",
    )


class TransformStatusResponse(BaseModel):
    """Response returned when querying async job state."""

    job_id: str = Field(..., description="Celery job identifier")
    status: str = Field(..., description="Current async job state")
    pipeline_id: str | None = Field(
        default=None,
        description="Pipeline identifier for the job",
    )
    batch_id: str | None = Field(
        default=None,
        description="Batch identifier for the job",
    )
    metrics: dict[str, int | float] | None = Field(
        default=None,
        description="Stored job processing metrics",
    )
    progress: JobProgressResponse | None = Field(
        default=None,
        description="Current job progress",
    )
    timestamps: dict[str, datetime | None] | None = Field(
        default=None,
        description="Job lifecycle timestamps",
    )
    worker: str | None = Field(
        default=None,
        description="Celery worker that processed the job",
    )
    result: TransformDatesResponse | None = Field(
        default=None,
        description="Completed transformation result",
    )
    error: str | None = Field(
        default=None,
        description="Failure reason if the job failed",
    )


class PromptTestResponse(BaseModel):
    """Immediate prompt playground response."""

    source_column: str = Field(..., description="Input source column label")
    target_column: str = Field(..., description="Output target column label")
    prompt: str = Field(..., description="Prompt under test")
    detected_format: str = Field(..., description="Detected source format hint")
    target_format: str | None = Field(default=None, description="Resolved target format")
    transformed_values: list[str | None] = Field(
        ...,
        description="Preview transformation output for the supplied input values",
    )


class AnalyticsWindowResponse(BaseModel):
    """Resolved analytics time window."""

    duration: str = Field(..., description="Selected duration label")
    start_date: datetime | None = Field(default=None, description="Window start time")
    end_date: datetime | None = Field(default=None, description="Window end time")


class StatusBreakdownResponse(BaseModel):
    """Status aggregate for analytics."""

    status: str = Field(..., description="Job status")
    count: int = Field(..., description="Number of jobs in this status")


class DurationBreakdownResponse(BaseModel):
    """Average duration grouped by pipeline."""

    pipeline_id: str = Field(..., description="Pipeline identifier")
    average_duration: float = Field(..., description="Average processing time in seconds")
    job_count: int = Field(..., description="Number of jobs for the pipeline")


class TimelinePointResponse(BaseModel):
    """Timeline aggregate point for analytics charts."""

    date: str = Field(..., description="Timeline bucket date")
    job_count: int = Field(..., description="Jobs created in the bucket")
    rows_processed: int = Field(..., description="Rows processed in the bucket")


class AnalyticsSummaryResponse(BaseModel):
    """High-level analytics summary."""

    total_jobs: int = Field(..., description="Total jobs in the window")
    success_count: int = Field(..., description="Successful jobs count")
    failed_count: int = Field(..., description="Failed jobs count")
    running_count: int = Field(..., description="Running or pending jobs count")
    rows_processed: int = Field(..., description="Rows processed in the current page of jobs")


class JobAnalyticsResponse(BaseModel):
    """Analytics payload for the monitoring dashboard."""

    window: AnalyticsWindowResponse
    summary: AnalyticsSummaryResponse
    status_breakdown: list[StatusBreakdownResponse]
    duration_breakdown: list[DurationBreakdownResponse]
    timeline: list[TimelinePointResponse]
    jobs: list[JobSummaryResponse]
    page: int
    limit: int
    total: int
