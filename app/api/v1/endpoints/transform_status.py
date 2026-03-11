"""Async job status endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from redis.exceptions import RedisError

from app.infrastructure.messaging.celery_app import celery
from app.logging.logger import logger
from app.repositories.job_repository import get_job
from app.schemas.response import TransformDatesResponse, TransformStatusResponse

router = APIRouter(tags=["date-transforms"])


@router.get(
    "/transform-status/{job_id}",
    response_model=TransformStatusResponse,
    summary="Get async date transformation job status",
)
async def get_transform_status(job_id: str) -> TransformStatusResponse:
    """Return the current state of a background transformation job."""

    job_document = await get_job(job_id)
    if job_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    async_result = None
    async_result_state = None
    async_result_payload = None
    celery_backend_available = True

    try:
        async_result = celery.AsyncResult(job_id)
        async_result_state = async_result.state.upper()
        if async_result_state == "SUCCESS":
            async_result_payload = async_result.result
    except RedisError as exc:
        celery_backend_available = False
        logger.warning(
            "Celery backend unavailable while fetching job status",
            job_id=job_id,
            error=str(exc),
        )
    except Exception as exc:
        celery_backend_available = False
        logger.warning(
            "Unable to fetch Celery backend job status",
            job_id=job_id,
            error=str(exc),
        )

    resolved_status = job_document["status"]

    if async_result_state == "SUCCESS":
        resolved_status = "SUCCESS"
    elif async_result_state in {"FAILURE", "REVOKED"}:
        resolved_status = "FAILED"
    elif async_result_state in {"STARTED", "RECEIVED"} and resolved_status == "PENDING":
        resolved_status = "STARTED"

    if resolved_status in {"PENDING", "RECEIVED", "STARTED", "RETRY"}:
        logger.info(
            "Date transformation job is still processing",
            job_id=job_id,
            status=resolved_status,
        )
    elif resolved_status == "SUCCESS":
        logger.info(
            "Date transformation job status fetched",
            job_id=job_id,
            status=resolved_status,
        )
    else:
        logger.warning(
            "Date transformation job failed status fetched",
            job_id=job_id,
            status=resolved_status,
            error=job_document.get("error")
            or (str(async_result.result) if async_result is not None else None),
        )

    response_error = job_document.get("error")
    if not celery_backend_available and response_error is None and resolved_status not in {"FAILED", "SUCCESS"}:
        response_error = "Celery backend unavailable; returning MongoDB status only"

    return TransformStatusResponse(
        job_id=job_id,
        status=resolved_status,
        pipeline_id=job_document.get("pipeline_id"),
        batch_id=job_document.get("batch_id"),
        metrics=job_document.get("metrics"),
        progress=job_document.get("progress"),
        timestamps=job_document.get("timestamps"),
        worker=job_document.get("worker"),
        result=(
            TransformDatesResponse.model_validate(async_result_payload)
            if async_result_state == "SUCCESS" and async_result_payload is not None
            else None
        ),
        error=response_error
        or (
            str(async_result.result)
            if async_result is not None and async_result_state in {"FAILURE", "REVOKED"}
            else None
        ),
    )
