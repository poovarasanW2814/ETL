"""Date transformation API endpoint."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, HTTPException, status

from app.infrastructure.cache.retry_cache import store_retry_payload
from app.infrastructure.messaging.job_events import publish_job_event
from app.logging.correlation import get_correlation_id
from app.logging.logger import logger
from app.repositories.job_repository import create_job
from app.schemas.request import TransformDatesRequest
from app.schemas.response import TransformDatesJobResponse
from app.services.validation_service import validate_transform_request
from app.workers.tasks import transform_dates_task

router = APIRouter(tags=["date-transforms"])


@router.post(
    "/transform-dates",
    response_model=TransformDatesJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a batch date transformation job",
)
async def transform_dates(
    request: TransformDatesRequest,
) -> TransformDatesJobResponse:
    """Validate and enqueue an ETL date transformation request."""

    try:
        validate_transform_request(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    logger.info(
        "Date transformation request received",
        event="job_created",
        pipeline_id=request.pipeline_id,
        batch_id=request.batch_id,
        number_of_columns=len(request.columns),
    )

    request_payload = request.model_dump()
    job_id = str(uuid4())

    await create_job(job_id, request_payload)
    store_retry_payload(job_id, request_payload)
    publish_job_event(
        {
            "event_type": "job_updated",
            "job_id": job_id,
            "pipeline_id": request.pipeline_id,
            "batch_id": request.batch_id,
            "status": "PENDING",
            "metrics": {
                "rows_processed": 0,
                "columns_processed": 0,
                "processing_time_seconds": 0,
            },
            "progress": {
                "processed_rows": 0,
                "total_rows": sum(len(column.values) for column in request.columns),
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
        args=[request_payload, get_correlation_id()],
        task_id=job_id,
        queue="transform_dates",
    )

    logger.info(
        "Date transformation job enqueued",
        event="job_created",
        job_id=job.id,
        pipeline_id=request.pipeline_id,
        batch_id=request.batch_id,
        number_of_columns=len(request.columns),
    )

    return TransformDatesJobResponse(job_id=job.id, status="processing")
