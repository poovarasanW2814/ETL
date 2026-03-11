"""MongoDB repository for MCP transform job tracking."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from pymongo import ASCENDING

from app.infrastructure.database.mongo import get_database

COLLECTION_NAME = "mcp_transform_jobs"
LOG_LIMIT = 500
FAILED_RECORD_LIMIT = 500
PREVIEW_SAMPLE_LIMIT = 10
_indexes_initialized = False


def _build_job_query(
    *,
    status: str | None = None,
    search: str | None = None,
    pipeline_id: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
) -> dict[str, Any]:
    """Build a reusable Mongo query for job filtering."""

    query: dict[str, Any] = {}
    if status:
        query["status"] = status.upper()
    if pipeline_id:
        query["pipeline_id"] = pipeline_id
    if search:
        query["$or"] = [
            {"_id": {"$regex": search, "$options": "i"}},
            {"pipeline_id": {"$regex": search, "$options": "i"}},
            {"batch_id": {"$regex": search, "$options": "i"}},
        ]
    if created_from or created_to:
        query["timestamps.created_at"] = {}
        if created_from:
            query["timestamps.created_at"]["$gte"] = created_from
        if created_to:
            query["timestamps.created_at"]["$lte"] = created_to

    return query


async def _ensure_indexes() -> None:
    """Create MongoDB indexes required for job lookup and filtering."""

    global _indexes_initialized

    if _indexes_initialized:
        return

    collection = get_database()[COLLECTION_NAME]
    await collection.create_index([("pipeline_id", ASCENDING)])
    await collection.create_index([("batch_id", ASCENDING)])
    await collection.create_index([("status", ASCENDING)])
    await collection.create_index([("timestamps.created_at", ASCENDING)])
    _indexes_initialized = True


def _build_payload_metadata(payload: dict[str, Any]) -> dict[str, Any]:
    """Strip large raw values arrays from the stored ETL payload."""

    return {
        "pipeline_id": payload["pipeline_id"],
        "batch_id": payload["batch_id"],
        "columns": [
            {
                "source_column": column["source_column"],
                "target_column": column["target_column"],
                "prompt": column["prompt"],
            }
            for column in payload["columns"]
        ],
    }


def _total_rows(payload: dict[str, Any]) -> int:
    """Return the total number of source values across all columns."""

    return sum(len(column["values"]) for column in payload["columns"])


async def create_job(job_id: str, payload: dict[str, Any]) -> None:
    """Insert a newly accepted MCP job."""

    await _ensure_indexes()

    collection = get_database()[COLLECTION_NAME]
    now = datetime.utcnow()
    total_rows = _total_rows(payload)
    await collection.insert_one(
        {
            "_id": job_id,
            "pipeline_id": payload["pipeline_id"],
            "batch_id": payload["batch_id"],
            "status": "PENDING",
            "payload": _build_payload_metadata(payload),
            "metrics": {
                "rows_processed": 0,
                "columns_processed": 0,
                "processing_time_seconds": 0,
            },
            "progress": {
                "processed_rows": 0,
                "total_rows": total_rows,
                "progress": 0,
                "estimated_seconds_remaining": None,
            },
            "timestamps": {
                "created_at": now,
                "started_at": None,
                "completed_at": None,
            },
            "worker": None,
            "error": None,
            "logs": [
                {
                    "timestamp": now,
                    "level": "INFO",
                    "message": "Batch received from ETL",
                }
            ],
            "failed_records": [],
            "preview": [],
            "prompt_insights": [],
            "retry_count": 0,
        },
    )


async def append_job_log(job_id: str, level: str, message: str) -> None:
    """Append a persisted job log entry."""

    await _ensure_indexes()

    collection = get_database()[COLLECTION_NAME]
    await collection.update_one(
        {"_id": job_id},
        {
            "$push": {
                "logs": {
                    "$each": [
                        {
                            "timestamp": datetime.utcnow(),
                            "level": level,
                            "message": message,
                        }
                    ],
                    "$slice": -LOG_LIMIT,
                }
            }
        },
    )


async def update_job_started(job_id: str) -> None:
    """Mark a job as started."""

    await _ensure_indexes()

    collection = get_database()[COLLECTION_NAME]
    await collection.update_one(
        {"_id": job_id},
        {
            "$set": {
                "status": "STARTED",
                "timestamps.started_at": datetime.utcnow(),
            }
        },
    )


async def update_job_progress(
    job_id: str,
    processed_rows: int,
    total_rows: int,
    estimated_seconds_remaining: float | None,
) -> None:
    """Persist running progress metrics for a job."""

    await _ensure_indexes()

    progress = 0 if total_rows == 0 else int((processed_rows / total_rows) * 100)
    collection = get_database()[COLLECTION_NAME]
    await collection.update_one(
        {"_id": job_id},
        {
            "$set": {
                "progress.processed_rows": processed_rows,
                "progress.total_rows": total_rows,
                "progress.progress": min(progress, 100),
                "progress.estimated_seconds_remaining": estimated_seconds_remaining,
            }
        },
    )


async def update_job_success(
    job_id: str,
    rows_processed: int,
    columns_processed: int,
    processing_time: float,
    worker_name: str,
    failed_records: list[dict[str, Any]],
    preview: list[dict[str, Any]],
    prompt_insights: list[dict[str, Any]],
) -> None:
    """Mark a job as completed successfully."""

    await _ensure_indexes()

    collection = get_database()[COLLECTION_NAME]
    await collection.update_one(
        {"_id": job_id},
        {
            "$set": {
                "status": "SUCCESS",
                "metrics.rows_processed": rows_processed,
                "metrics.columns_processed": columns_processed,
                "metrics.processing_time_seconds": processing_time,
                "progress.processed_rows": rows_processed,
                "progress.progress": 100,
                "progress.estimated_seconds_remaining": 0,
                "timestamps.completed_at": datetime.utcnow(),
                "worker": worker_name,
                "error": None,
                "failed_records": failed_records[:FAILED_RECORD_LIMIT],
                "preview": preview,
                "prompt_insights": prompt_insights,
            }
        },
    )


async def update_job_failed(
    job_id: str,
    error_message: str,
    failed_records: list[dict[str, Any]] | None = None,
) -> None:
    """Mark a job as failed."""

    await _ensure_indexes()

    collection = get_database()[COLLECTION_NAME]
    update_fields: dict[str, Any] = {
        "status": "FAILED",
        "timestamps.completed_at": datetime.utcnow(),
        "progress.estimated_seconds_remaining": None,
        "error": error_message,
    }
    if failed_records is not None:
        update_fields["failed_records"] = failed_records[:FAILED_RECORD_LIMIT]

    await collection.update_one(
        {"_id": job_id},
        {"$set": update_fields},
    )


async def increment_retry_count(job_id: str) -> None:
    """Increment retry count for the original job."""

    await _ensure_indexes()

    collection = get_database()[COLLECTION_NAME]
    await collection.update_one({"_id": job_id}, {"$inc": {"retry_count": 1}})


async def get_job(job_id: str) -> dict[str, Any] | None:
    """Return job metadata by Celery job id."""

    await _ensure_indexes()

    collection = get_database()[COLLECTION_NAME]
    return await collection.find_one({"_id": job_id})


async def list_jobs(
    limit: int = 100,
    page: int = 1,
    status: str | None = None,
    search: str | None = None,
    pipeline_id: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
) -> list[dict[str, Any]]:
    """Return recent MCP jobs ordered by creation time descending."""

    await _ensure_indexes()

    collection = get_database()[COLLECTION_NAME]
    query = _build_job_query(
        status=status,
        search=search,
        pipeline_id=pipeline_id,
        created_from=created_from,
        created_to=created_to,
    )

    skip = max(page - 1, 0) * limit
    cursor = collection.find(query).sort("timestamps.created_at", -1).skip(skip).limit(limit)
    return await cursor.to_list(length=limit)


async def count_jobs(
    status: str | None = None,
    search: str | None = None,
    pipeline_id: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
) -> int:
    """Return the total count for a filtered job query."""

    await _ensure_indexes()

    collection = get_database()[COLLECTION_NAME]
    query = _build_job_query(
        status=status,
        search=search,
        pipeline_id=pipeline_id,
        created_from=created_from,
        created_to=created_to,
    )

    return await collection.count_documents(query)


def resolve_time_window(
    duration: str | None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> tuple[datetime | None, datetime | None]:
    """Resolve a time window from either a preset duration or explicit dates."""

    if start_date or end_date:
        return start_date, end_date

    if duration is None or duration == "7d":
        return datetime.utcnow() - timedelta(days=7), datetime.utcnow()

    if duration == "today":
        now = datetime.utcnow()
        return now.replace(hour=0, minute=0, second=0, microsecond=0), now

    duration_map = {
        "24h": timedelta(hours=24),
        "1d": timedelta(days=1),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
    }
    delta = duration_map.get(duration)
    if delta is None:
        return None, None

    return datetime.utcnow() - delta, datetime.utcnow()


async def get_job_analytics(
    *,
    duration: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    limit: int = 20,
    page: int = 1,
) -> dict[str, Any]:
    """Aggregate analytics for jobs in a selected time window."""

    await _ensure_indexes()

    created_from, created_to = resolve_time_window(duration, start_date, end_date)
    query = _build_job_query(created_from=created_from, created_to=created_to)
    collection = get_database()[COLLECTION_NAME]

    total_jobs = await collection.count_documents(query)
    documents = await list_jobs(
        limit=limit,
        page=page,
        created_from=created_from,
        created_to=created_to,
    )

    status_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    duration_pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": "$pipeline_id",
                "average_duration": {"$avg": "$metrics.processing_time_seconds"},
                "job_count": {"$sum": 1},
            }
        },
        {"$sort": {"average_duration": -1}},
    ]
    timeline_pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$timestamps.created_at",
                    }
                },
                "job_count": {"$sum": 1},
                "rows_processed": {"$sum": "$metrics.rows_processed"},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    status_breakdown = await collection.aggregate(status_pipeline).to_list(length=20)
    duration_breakdown = await collection.aggregate(duration_pipeline).to_list(length=50)
    timeline = await collection.aggregate(timeline_pipeline).to_list(length=200)

    return {
        "window": {
            "duration": duration or "7d",
            "start_date": created_from,
            "end_date": created_to,
        },
        "summary": {
            "total_jobs": total_jobs,
            "success_count": next((item["count"] for item in status_breakdown if item["_id"] == "SUCCESS"), 0),
            "failed_count": next((item["count"] for item in status_breakdown if item["_id"] == "FAILED"), 0),
            "running_count": sum(
                item["count"] for item in status_breakdown if item["_id"] in {"PENDING", "STARTED", "RECEIVED", "RETRY"}
            ),
            "rows_processed": sum((document.get("metrics") or {}).get("rows_processed", 0) for document in documents),
        },
        "status_breakdown": [
            {"status": item["_id"] or "UNKNOWN", "count": item["count"]} for item in status_breakdown
        ],
        "duration_breakdown": [
            {
                "pipeline_id": item["_id"] or "UNKNOWN",
                "average_duration": round(item.get("average_duration") or 0, 3),
                "job_count": item.get("job_count", 0),
            }
            for item in duration_breakdown
        ],
        "timeline": [
            {
                "date": item["_id"],
                "job_count": item.get("job_count", 0),
                "rows_processed": item.get("rows_processed", 0),
            }
            for item in timeline
        ],
        "jobs": documents,
        "page": page,
        "limit": limit,
        "total": total_jobs,
    }


async def delete_job(job_id: str) -> bool:
    """Delete a tracked MCP job by id."""

    await _ensure_indexes()

    collection = get_database()[COLLECTION_NAME]
    result = await collection.delete_one({"_id": job_id})
    return result.deleted_count > 0
