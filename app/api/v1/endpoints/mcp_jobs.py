"""Mongo-backed MCP job listing, detail, and monitoring endpoints."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, status

from app.infrastructure.cache.retry_cache import delete_retry_payload, get_retry_payload, store_retry_payload
from app.infrastructure.messaging.job_events import publish_job_event
from app.agents.agent_facade import resolve_target_format
from app.logging.logger import logger
from app.repositories.job_repository import (
    count_jobs,
    create_job,
    delete_job,
    get_job,
    get_job_analytics,
    increment_retry_count,
    list_jobs,
)
from app.repositories.prompt_test_repository import create_prompt_test_session
from app.schemas.request import PromptTestRequest
from app.schemas.response import (
    FailedRecordsResponse,
    JobAnalyticsResponse,
    JobDetailResponse,
    JobListResponse,
    JobLogsResponse,
    JobSummaryResponse,
    PreviewResponse,
    PromptTestResponse,
    TransformDatesJobResponse,
)
from app.services.transform_service import detect_source_format, transform_column
from app.workers.tasks import transform_dates_task

router = APIRouter(tags=["mcp-jobs"])


def _to_job_summary(document: dict) -> JobSummaryResponse:
    """Convert a Mongo job document into a dashboard summary model."""

    return JobSummaryResponse(
        job_id=document["_id"],
        pipeline_id=document.get("pipeline_id"),
        batch_id=document.get("batch_id"),
        status=document.get("status", "PENDING"),
        metrics=document.get("metrics"),
        progress=document.get("progress"),
        timestamps=document.get("timestamps"),
    )


def _to_job_detail(document: dict) -> JobDetailResponse:
    """Convert a Mongo job document into a detailed job model."""

    return JobDetailResponse(
        job_id=document["_id"],
        pipeline_id=document.get("pipeline_id"),
        batch_id=document.get("batch_id"),
        status=document.get("status", "PENDING"),
        payload=document.get("payload"),
        metrics=document.get("metrics"),
        progress=document.get("progress"),
        timestamps=document.get("timestamps"),
        worker=document.get("worker"),
        prompt_insights=document.get("prompt_insights", []),
        error=document.get("error"),
    )


@router.get(
    "/mcp-jobs/analytics",
    response_model=JobAnalyticsResponse,
    summary="Get analytics for MCP jobs within a selected time window",
)
async def get_mcp_job_analytics(
    duration: str | None = Query(default="7d"),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
) -> JobAnalyticsResponse:
    """Return status, timeline, duration, and job-list analytics for a time window."""

    analytics = await get_job_analytics(
        duration=duration,
        start_date=start_date,
        end_date=end_date,
        page=page,
        limit=limit,
    )
    logger.info(
        "Fetched MCP job analytics",
        duration=duration,
        page=page,
        limit=limit,
        total=analytics["total"],
    )
    return JobAnalyticsResponse.model_validate(
        {
            **analytics,
            "jobs": [_to_job_summary(document) for document in analytics["jobs"]],
        }
    )


@router.get(
    "/mcp-jobs",
    response_model=JobListResponse,
    summary="List recent MCP transformation jobs",
)
async def get_mcp_jobs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
) -> JobListResponse:
    """Return recent Mongo-tracked MCP jobs for dashboard consumption."""

    documents = await list_jobs(
        limit=limit,
        page=page,
        status=status_filter,
        search=search,
    )
    total = await count_jobs(status=status_filter, search=search)
    logger.info(
        "Fetched MCP jobs list",
        number_of_jobs=len(documents),
        page=page,
        limit=limit,
        status_filter=status_filter,
        search=search,
    )
    return JobListResponse(
        jobs=[_to_job_summary(document) for document in documents],
        page=page,
        limit=limit,
        total=total,
    )


@router.get(
    "/mcp-jobs/{job_id}",
    response_model=JobDetailResponse,
    summary="Get MCP transformation job details",
)
async def get_mcp_job(job_id: str) -> JobDetailResponse:
    """Return detailed Mongo-tracked job metadata."""

    document = await get_job(job_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    logger.info("Fetched MCP job detail", job_id=job_id)
    return _to_job_detail(document)


@router.get(
    "/mcp-jobs/{job_id}/logs",
    response_model=JobLogsResponse,
    summary="Get persisted job logs",
)
async def get_mcp_job_logs(job_id: str) -> JobLogsResponse:
    """Return persisted logs for a tracked job."""

    document = await get_job(job_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return JobLogsResponse(job_id=job_id, logs=document.get("logs", []))


@router.get(
    "/mcp-jobs/{job_id}/failed-records",
    response_model=FailedRecordsResponse,
    summary="Get failed records for a tracked job",
)
async def get_mcp_job_failed_records(job_id: str) -> FailedRecordsResponse:
    """Return captured failed records for a tracked job."""

    document = await get_job(job_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return FailedRecordsResponse(job_id=job_id, records=document.get("failed_records", []))


@router.get(
    "/mcp-jobs/{job_id}/preview",
    response_model=PreviewResponse,
    summary="Get transformation preview for a tracked job",
)
async def get_mcp_job_preview(job_id: str) -> PreviewResponse:
    """Return stored before and after transformation samples."""

    document = await get_job(job_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return PreviewResponse(job_id=job_id, columns=document.get("preview", []))


@router.post(
    "/prompt-tester",
    response_model=PromptTestResponse,
    summary="Resolve and test a prompt against sample date values",
)
async def prompt_tester(payload: PromptTestRequest) -> PromptTestResponse:
    """Preview how the MCP service interprets and transforms a prompt."""

    target_format = resolve_target_format(payload.prompt)
    detected_format = detect_source_format(payload.values)
    transformed_values = (
        transform_column(payload.values, target_format)
        if target_format is not None
        else [None for _ in payload.values]
    )

    logger.info(
        "Executed prompt tester preview",
        source_column=payload.source_column,
        target_column=payload.target_column,
        detected_format=detected_format,
        target_format=target_format,
        number_of_values=len(payload.values),
    )

    await create_prompt_test_session(
        source_column=payload.source_column,
        target_column=payload.target_column,
        prompt=payload.prompt,
        values=payload.values,
        detected_format=detected_format,
        target_format=target_format,
        transformed_values=transformed_values,
    )

    return PromptTestResponse(
        source_column=payload.source_column,
        target_column=payload.target_column,
        prompt=payload.prompt,
        detected_format=detected_format,
        target_format=target_format,
        transformed_values=transformed_values,
    )


@router.post(
    "/mcp-jobs/{job_id}/retry",
    response_model=TransformDatesJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Retry a failed or completed job using cached source payload",
)
async def retry_mcp_job(job_id: str) -> TransformDatesJobResponse:
    """Create a new Celery job using the cached original payload."""

    original_job = await get_job(job_id)
    if original_job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    retry_payload = get_retry_payload(job_id)
    if retry_payload is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Retry payload not available for this job",
        )

    new_job_id = str(uuid4())
    await create_job(new_job_id, retry_payload)
    store_retry_payload(new_job_id, retry_payload)
    await increment_retry_count(job_id)
    publish_job_event(
        {
            "event_type": "job_updated",
            "job_id": new_job_id,
            "pipeline_id": retry_payload["pipeline_id"],
            "batch_id": retry_payload["batch_id"],
            "status": "PENDING",
            "metrics": {
                "rows_processed": 0,
                "columns_processed": 0,
                "processing_time_seconds": 0,
            },
            "progress": {
                "processed_rows": 0,
                "total_rows": sum(len(column["values"]) for column in retry_payload["columns"]),
                "progress": 0,
                "estimated_seconds_remaining": None,
            },
            "timestamps": {
                "created_at": None,
                "started_at": None,
                "completed_at": None,
            },
        }
    )

    job = transform_dates_task.apply_async(
        args=[retry_payload, None],
        task_id=new_job_id,
        queue="transform_dates",
    )

    logger.info("Retried MCP job", original_job_id=job_id, job_id=new_job_id)
    return TransformDatesJobResponse(job_id=job.id, status="processing")


@router.get(
    "/pipelines/{pipeline_id}/jobs",
    response_model=JobListResponse,
    summary="List jobs for a specific pipeline",
)
async def get_pipeline_jobs(
    pipeline_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
) -> JobListResponse:
    """Return jobs grouped by pipeline id."""

    documents = await list_jobs(limit=limit, page=page, pipeline_id=pipeline_id)
    total = await count_jobs(pipeline_id=pipeline_id)
    return JobListResponse(
        jobs=[_to_job_summary(document) for document in documents],
        page=page,
        limit=limit,
        total=total,
    )


@router.delete(
    "/mcp-jobs/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete MCP transformation job metadata",
)
async def remove_mcp_job(job_id: str) -> None:
    """Delete tracked job metadata from MongoDB."""

    deleted = await delete_job(job_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    delete_retry_payload(job_id)
    publish_job_event({"event_type": "job_deleted", "job_id": job_id})
    logger.info("Deleted MCP job", job_id=job_id)
