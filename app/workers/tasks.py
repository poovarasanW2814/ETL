"""Celery tasks for asynchronous date transformations."""

from __future__ import annotations

import time
from datetime import datetime
from typing import Any

from app.agents.agent_facade import resolve_transformation_plan
from app.infrastructure.database.mongo import run_async_in_worker_loop
from app.infrastructure.messaging.celery_app import celery
from app.infrastructure.messaging.job_events import publish_job_event
from app.logging.correlation import clear_correlation_id, set_correlation_id
from app.logging.logger import logger
from app.repositories.job_repository import (
    append_job_log,
    update_job_failed,
    update_job_progress,
    update_job_started,
    update_job_success,
)
from app.schemas.request import DateColumnRequest, TransformDatesRequest
from app.services.batch_service import process_batch
from app.services.transform_service import tool_detect_source_format, tool_transform_dates, tool_validate_output
from app.workers.queues import TRANSFORM_DATES_QUEUE

FAILED_RECORD_LIMIT = 500
PREVIEW_SAMPLE_LIMIT = 10


@celery.task(
    name="transform_dates_task",
    bind=True,
    queue=TRANSFORM_DATES_QUEUE,
)
def transform_dates_task(
    self: Any,
    request_payload: dict[str, Any],
    correlation_id: str | None = None,
) -> dict[str, Any]:
    """Run prompt resolution and date transformation in the background."""

    started_at = time.perf_counter()
    request = TransformDatesRequest.model_validate(request_payload)
    total_values = sum(len(column.values) for column in request.columns)
    active_correlation_id = set_correlation_id(correlation_id)
    worker_name = self.request.hostname or "unknown"
    failed_records: list[dict[str, Any]] = []
    preview: list[dict[str, Any]] = []
    prompt_insights: list[dict[str, Any]] = []
    processed_rows = 0
    started_timestamp = datetime.utcnow().isoformat()

    def persist_log(level: str, message: str) -> None:
        run_async_in_worker_loop(append_job_log(self.request.id, level, message))
        publish_job_event(
            {
                "event_type": "job_log",
                "job_id": self.request.id,
                "timestamp": datetime.utcnow().isoformat(),
                "level": level,
                "message": message,
            }
        )

    run_async_in_worker_loop(update_job_started(self.request.id))
    publish_job_event(
        {
            "event_type": "job_updated",
            "job_id": self.request.id,
            "pipeline_id": request.pipeline_id,
            "batch_id": request.batch_id,
            "status": "STARTED",
            "metrics": {
                "rows_processed": 0,
                "columns_processed": 0,
                "processing_time_seconds": 0,
            },
            "progress": {
                "processed_rows": 0,
                "total_rows": total_values,
                "progress": 0,
                "estimated_seconds_remaining": None,
            },
            "timestamps": {
                "started_at": started_timestamp,
            },
            "worker": worker_name,
        }
    )
    persist_log("INFO", "Job execution started in worker")

    logger.info(
        "Date transformation job started",
        event="job_started",
        job_id=self.request.id,
        correlation_id=active_correlation_id,
        pipeline_id=request.pipeline_id,
        batch_id=request.batch_id,
        number_of_columns=len(request.columns),
        number_of_values=total_values,
    )

    try:
        resolved_formats: dict[str, str | None] = {}

        for column in request.columns:
            persist_log("INFO", f"Analyzing prompt for column {column.source_column}")
            plan = resolve_transformation_plan(column.prompt, column.values)
            target_format = plan.get("target_format") if isinstance(plan.get("target_format"), str) else None
            if target_format is None:
                message = (
                    f"Unable to resolve target date format from prompt for column "
                    f"{column.source_column}"
                )
                persist_log("ERROR", message)
                raise ValueError(message)
            detected_format = tool_detect_source_format(column.values)
            resolved_formats[column.target_column] = target_format
            prompt_insights.append(
                {
                    "source_column": column.source_column,
                    "target_column": column.target_column,
                    "prompt": column.prompt,
                    "detected_format": detected_format,
                    "target_format": target_format,
                    "source_format_hint": plan.get("source_format_hint"),
                    "timezone_strategy": plan.get("timezone_strategy"),
                    "confidence": plan.get("confidence"),
                }
            )
            persist_log(
                "INFO",
                f"Resolved target format for {column.source_column}: {target_format or 'UNKNOWN'}",
            )
            logger.info(
                "Resolved target format for background column",
                job_id=self.request.id,
                pipeline_id=request.pipeline_id,
                batch_id=request.batch_id,
                source_column=column.source_column,
                target_column=column.target_column,
                resolved_format=target_format,
            )

        def on_column_processed(
            column: DateColumnRequest,
            transformed_values: list[str | None],
            target_format: str | None,
        ) -> None:
            nonlocal processed_rows

            processed_rows += len(column.values)
            elapsed = max(time.perf_counter() - started_at, 0.001)
            eta = None
            if processed_rows > 0 and processed_rows < total_values:
                eta = round((elapsed / processed_rows) * (total_values - processed_rows), 2)

            for index, (source_value, transformed_value) in enumerate(
                zip(column.values, transformed_values, strict=False),
                start=1,
            ):
                if source_value not in (None, "") and transformed_value is None:
                    failed_records.append(
                        {
                            "row": index,
                            "source_column": column.source_column,
                            "source_value": source_value,
                            "error": "Date parse error",
                        }
                    )
                    if len(failed_records) >= FAILED_RECORD_LIMIT:
                        break

            preview.append(
                {
                    "source_column": column.source_column,
                    "target_column": column.target_column,
                    "samples": [
                        {
                            "source_value": source_value,
                            "transformed_value": transformed_value,
                        }
                        for source_value, transformed_value in list(
                            zip(column.values, transformed_values, strict=False)
                        )[:PREVIEW_SAMPLE_LIMIT]
                    ],
                }
            )

            persist_log(
                "INFO",
                f"Transforming {len(column.values)} rows for {column.source_column}",
            )
            if not tool_validate_output(column.values, transformed_values):
                raise ValueError(
                    f"Output row count mismatch for column {column.source_column}",
                )
            run_async_in_worker_loop(
                update_job_progress(
                    self.request.id,
                    processed_rows=processed_rows,
                    total_rows=total_values,
                    estimated_seconds_remaining=eta,
                ),
            )
            publish_job_event(
                {
                    "event_type": "job_updated",
                    "job_id": self.request.id,
                    "pipeline_id": request.pipeline_id,
                    "batch_id": request.batch_id,
                    "status": "STARTED",
                    "progress": {
                        "processed_rows": processed_rows,
                        "total_rows": total_values,
                        "progress": 0 if total_values == 0 else min(int((processed_rows / total_values) * 100), 100),
                        "estimated_seconds_remaining": eta,
                    },
                    "metrics": {
                        "rows_processed": processed_rows,
                        "columns_processed": 0,
                        "processing_time_seconds": round(elapsed, 6),
                    },
                    "worker": worker_name,
                }
            )

        result = process_batch(
            request.columns,
            resolved_formats,
            on_column_processed=on_column_processed,
            transform_tool=tool_transform_dates,
        )
        execution_time = round(time.perf_counter() - started_at, 6)
        run_async_in_worker_loop(
            update_job_success(
                self.request.id,
                rows_processed=total_values,
                columns_processed=len(request.columns),
                processing_time=execution_time,
                worker_name=worker_name,
                failed_records=failed_records,
                preview=preview,
                prompt_insights=prompt_insights,
            ),
        )
        publish_job_event(
            {
                "event_type": "job_updated",
                "job_id": self.request.id,
                "pipeline_id": request.pipeline_id,
                "batch_id": request.batch_id,
                "status": "SUCCESS",
                "metrics": {
                    "rows_processed": total_values,
                    "columns_processed": len(request.columns),
                    "processing_time_seconds": execution_time,
                },
                "progress": {
                    "processed_rows": total_values,
                    "total_rows": total_values,
                    "progress": 100,
                    "estimated_seconds_remaining": 0,
                },
                "timestamps": {
                    "started_at": started_timestamp,
                    "completed_at": datetime.utcnow().isoformat(),
                },
                "worker": worker_name,
                "result": result,
            }
        )
        persist_log("INFO", "Job completed successfully")
        logger.info(
            "Date transformation job completed",
            event="job_completed",
            job_id=self.request.id,
            pipeline_id=request.pipeline_id,
            batch_id=request.batch_id,
            number_of_columns=len(request.columns),
            number_of_values=total_values,
            execution_time=execution_time,
        )
        return result
    except Exception as exc:
        execution_time = round(time.perf_counter() - started_at, 6)
        run_async_in_worker_loop(update_job_failed(self.request.id, str(exc), failed_records))
        publish_job_event(
            {
                "event_type": "job_updated",
                "job_id": self.request.id,
                "pipeline_id": request.pipeline_id,
                "batch_id": request.batch_id,
                "status": "FAILED",
                "metrics": {
                    "rows_processed": processed_rows,
                    "columns_processed": 0,
                    "processing_time_seconds": execution_time,
                },
                "progress": {
                    "processed_rows": processed_rows,
                    "total_rows": total_values,
                    "progress": 0 if total_values == 0 else min(int((processed_rows / total_values) * 100), 100),
                    "estimated_seconds_remaining": None,
                },
                "timestamps": {
                    "started_at": started_timestamp,
                    "completed_at": datetime.utcnow().isoformat(),
                },
                "worker": worker_name,
                "error": str(exc),
            }
        )
        persist_log("ERROR", f"Job failed: {exc}")
        logger.exception(
            "Date transformation job failed",
            event="job_failed",
            job_id=self.request.id,
            pipeline_id=request.pipeline_id,
            batch_id=request.batch_id,
            number_of_columns=len(request.columns),
            number_of_values=total_values,
            execution_time=execution_time,
            error=str(exc),
        )
        raise
    finally:
        clear_correlation_id()
